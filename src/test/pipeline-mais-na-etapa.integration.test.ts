// @vitest-environment node
// "+" na etapa (pedido dela no preview da B41, 23/10/2026): o card nasce direto na
// etapa, em Entrada (menos Ganho e Perdido) e nos funis da empresa; Recompra não tem.
// Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarFunil } from "@/app/(auth)/configuracoes/funis/actions"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { criarCardNaEtapa } from "@/app/(auth)/pipeline/actions"
import { TELEFONE_INVALIDO } from "@/lib/telefone"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const telefone = `552198${String(ts).slice(-7)}`

let ws = ""
const usuarios: string[] = []
const clientes: Record<string, SupabaseClient> = {}
let feira = ""
const etapa: Record<string, string> = {}
let outroFunilEtapa = ""
let existente = ""

async function criarPessoa(chave: string, role: string) {
  const email = `mais-${chave}-${ts}@funis-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: chave, role, status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[chave] = c
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] Mais na etapa ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin")
  await criarPessoa("atendente", "atendente")
  existente = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja Existente", phone_number: `5531977${String(ts).slice(-6)}` }).select("id").single()).data!.id
  como("admin")
  feira = (await criarFunil("Feira de Março", [{ nome: "Convidado" }, { nome: "Confirmou" }])).id!
  const { data } = await service.from("funil_etapas").select("id, ordem").eq("funil_id", feira)
  const [convidado, confirmou] = [...data!].sort((a, b) => a.ordem - b.ordem)
  Object.assign(etapa, { convidado: convidado.id, confirmou: confirmou.id })
  const outro = (await criarFunil("Outro", [{ nome: "Só" }])).id!
  outroFunilEtapa = (await service.from("funil_etapas").select("id").eq("funil_id", outro).single()).data!.id
}, 120_000)

afterAll(async () => {
  await service.from("automation_runs").delete().eq("workspace_id", ws)
  await service.from("automation_queue").delete().eq("workspace_id", ws)
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("contact_tags").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("funis").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

const cardsDo = async (contato: string) => (await service.from("pipeline_cards").select("funil, etapa, atendente_id").eq("contact_id", contato)).data ?? []

describe("\"+\" na etapa", { timeout: 60_000 }, () => {
  it("cria o contato pelo telefone e o card direto na etapa de Entrada", async () => {
    como("admin")
    // Uma automação de "card movido" para Sondagem, que põe uma tag
    const posicao = { x: 0, y: 0 }
    const regra = await salvarRegra({
      id: null,
      nome: "Sondagem marca",
      repeticao: { modo: "sempre" },
      fluxo: {
        blocos: [
          { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada", etapa: "sondagem" }, posicao },
          { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "veio-pelo-mais" }, posicao },
        ],
        ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
      },
    })
    expect(regra.erro).toBeUndefined()
    // B46-08: a regra nova nasce desligada
    expect(await alternarRegra(regra.id!, true)).toEqual({})
    expect(await criarCardNaEtapa("entrada", "sondagem", { telefone: `+${telefone}`, nome: "Loja Nova" })).toEqual({})
    const { data: contato } = await service.from("contacts").select("id, name").eq("workspace_id", ws).eq("phone_number", telefone).single()
    expect(contato!.name).toBe("Loja Nova")
    expect(await cardsDo(contato!.id)).toEqual([{ funil: "entrada", etapa: "sondagem", atendente_id: null }])
    // O card conta como entrada na etapa: a automação de Sondagem rodou
    const { data: tags } = await service.from("contact_tags").select("tag").eq("contact_id", contato!.id)
    expect(tags!.map((t) => t.tag)).toContain("veio-pelo-mais")
  })

  it("não põe o contato duas vezes no mesmo funil", async () => {
    como("admin")
    expect((await criarCardNaEtapa("entrada", "lead", { telefone })).erro).toBe("Este contato já está no Funil de Entrada.")
  })

  it("cria o card na etapa do funil da empresa, com um contato que já existe", async () => {
    como("admin")
    expect(await criarCardNaEtapa(feira, etapa.confirmou, { contactId: existente })).toEqual({})
    expect(await cardsDo(existente)).toEqual([{ funil: feira, etapa: etapa.confirmou, atendente_id: null }])
    expect((await criarCardNaEtapa(feira, etapa.convidado, { contactId: existente })).erro).toBe("Este contato já está neste funil.")
  })

  it("recusa Ganho, Perdido, Recompra e etapa de outro funil", async () => {
    como("admin")
    const outro = (await service.from("contacts").insert({ workspace_id: ws, name: "Outro", phone_number: `5531966${String(ts).slice(-6)}` }).select("id").single()).data!.id
    for (const [funil, e] of [["entrada", "ganho"], ["entrada", "perdido"], ["recompra", "onboarding"], [feira, outroFunilEtapa], ["entrada", "inventada"]]) {
      expect((await criarCardNaEtapa(funil, e, { contactId: outro })).erro).toBe("Esta etapa não recebe card novo por aqui.")
    }
    expect(await cardsDo(outro)).toEqual([])
  })

  it("recusa ao Atendente e recusa telefone inválido", async () => {
    como("atendente")
    expect((await criarCardNaEtapa("entrada", "lead", { telefone: "5521999990000" })).erro).toBe("Sem permissão")
    como("admin")
    expect((await criarCardNaEtapa("entrada", "lead", { telefone: "abc" })).erro).toBe(TELEFONE_INVALIDO)
  })
})
