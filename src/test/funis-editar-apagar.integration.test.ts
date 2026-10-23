// @vitest-environment node
// B41-02 — mudar a ordem das etapas, apagar etapa (levando os cards) e apagar funil
// com os cards. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { apagarEtapa, apagarFunil, criarFunil, listarFunisParaGerenciar, moverEtapa } from "@/app/(auth)/configuracoes/funis/actions"
import { listarFunisDaEmpresa } from "@/app/(auth)/pipeline/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()

let ws = ""
const usuarios: string[] = []
const clientes: Record<string, SupabaseClient> = {}
const contatos: string[] = []

async function criarPessoa(chave: string, role: string) {
  const email = `b41-02-${chave}-${ts}@funis-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: chave, role, status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[chave] = c
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

async function etapasDe(funilId: string) {
  const { data } = await service.from("funil_etapas").select("id, nome, ordem").eq("funil_id", funilId)
  return [...(data ?? [])].sort((a, b) => a.ordem - b.ordem)
}

async function novoFunil(nome: string, etapas: string[]) {
  como("admin")
  const r = await criarFunil(nome, etapas.map((n) => ({ nome: n })))
  expect(r.erro).toBeUndefined()
  return { id: r.id!, etapas: await etapasDe(r.id!) }
}

async function pôrCards(funil: string, etapa: string, quantos: number, desde = 0) {
  const linhas = contatos.slice(desde, desde + quantos).map((c) => ({ workspace_id: ws, contact_id: c, funil, etapa }))
  const { error } = await service.from("pipeline_cards").insert(linhas)
  expect(error).toBeNull()
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B41-02 ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin")
  await criarPessoa("atendente", "atendente")
  for (let i = 0; i < 8; i++) {
    contatos.push((await service.from("contacts").insert({ workspace_id: ws, name: `Contato ${i}`, phone_number: `55319${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id)
  }
}, 120_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("funis").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B41-02 — Editar e apagar funis e etapas", { timeout: 60_000 }, () => {
  it("CA-B41-07: should mostrar as colunas na ordem nova, com os cards nas mesmas etapas", async () => {
    const f = await novoFunil("Ordem", ["A", "B", "C"])
    const [a, , c] = f.etapas
    await pôrCards(f.id, a.id, 1, 0)
    await pôrCards(f.id, c.id, 1, 1)

    como("admin")
    expect((await moverEtapa(c.id, "subir")).erro).toBeUndefined()
    expect((await moverEtapa(c.id, "subir")).erro).toBeUndefined()
    expect((await moverEtapa(c.id, "subir")).erro).toBeUndefined() // já no topo: nada muda

    const doQuadro = (await listarFunisDaEmpresa()).find((x) => x.id === f.id)!
    expect(doQuadro.etapas.map((e) => e.label)).toEqual(["C", "A", "B"])
    const { data: cards } = await service.from("pipeline_cards").select("contact_id, etapa").eq("funil", f.id)
    expect(cards).toContainEqual({ contact_id: contatos[0], etapa: a.id })
    expect(cards).toContainEqual({ contact_id: contatos[1], etapa: c.id })

    como("atendente")
    expect((await moverEtapa(a.id, "subir")).erro).toBe("Sem permissão")
  })

  it("CA-B41-09: should levar os 4 cards para a etapa de destino, com histórico, e apagar a etapa", async () => {
    const f = await novoFunil("Destino", ["Convidado", "Confirmou", "Visitou"])
    const [convidado, confirmou, visitou] = f.etapas
    await pôrCards(f.id, confirmou.id, 4, 0)

    como("admin")
    expect((await apagarEtapa(confirmou.id, null)).erro).toBe("Escolha outra etapa deste funil para os cards.")
    expect((await apagarEtapa(confirmou.id, confirmou.id)).erro).toBe("Escolha outra etapa deste funil para os cards.")
    const outro = await novoFunil("Outro destino", ["X"])
    expect((await apagarEtapa(confirmou.id, outro.etapas[0].id)).erro).toBe("Escolha outra etapa deste funil para os cards.")
    expect((await etapasDe(f.id)).map((e) => e.nome)).toEqual(["Convidado", "Confirmou", "Visitou"])

    expect((await apagarEtapa(confirmou.id, visitou.id)).erro).toBeUndefined()
    expect((await etapasDe(f.id)).map((e) => e.nome)).toEqual(["Convidado", "Visitou"])
    const { data: cards } = await service.from("pipeline_cards").select("id, etapa").eq("funil", f.id)
    expect(cards).toHaveLength(4)
    expect(cards!.every((c) => c.etapa === visitou.id)).toBe(true)
    const { data: hist } = await service.from("pipeline_card_history").select("de_etapa, para_etapa").in("card_id", cards!.map((c) => c.id))
    expect(hist).toHaveLength(4)
    expect(hist!.every((h) => h.de_etapa === confirmou.id && h.para_etapa === visitou.id)).toBe(true)
    expect(convidado.id).toBeTruthy()

    const lista = await listarFunisParaGerenciar()
    expect(lista.funis.find((x) => x.id === f.id)!.etapas.map((e) => [e.nome, e.cards])).toEqual([["Convidado", 0], ["Visitou", 4]])
  })

  it("CA-B41-10: should apagar a etapa vazia sem destino e nunca a última etapa", async () => {
    const f = await novoFunil("Vazia", ["Uma", "Duas"])
    como("atendente")
    expect((await apagarEtapa(f.etapas[1].id, null)).erro).toBe("Sem permissão")
    expect((await clientes.atendente.rpc("apagar_etapa", { p_etapa: f.etapas[1].id, p_destino: null as unknown as string })).error).not.toBeNull()

    como("admin")
    expect((await apagarEtapa(f.etapas[1].id, null)).erro).toBeUndefined()
    expect((await etapasDe(f.id)).map((e) => e.nome)).toEqual(["Uma"])
    expect((await apagarEtapa(f.etapas[0].id, null)).erro).toBe("O funil precisa de ao menos uma etapa.")
    expect((await etapasDe(f.id)).map((e) => e.nome)).toEqual(["Uma"])
  })

  it("CA-B41-12: should apagar o funil com os 7 cards, mantendo os contatos e os cards de outros funis", async () => {
    const f = await novoFunil("Vai sair", ["Etapa"])
    const fica = await novoFunil("Fica", ["Etapa"])
    await pôrCards(f.id, f.etapas[0].id, 7, 0)
    await pôrCards(fica.id, fica.etapas[0].id, 2, 0)
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatos[0], funil: "entrada", etapa: "lead" })

    como("admin")
    expect((await listarFunisParaGerenciar()).funis.find((x) => x.id === f.id)!.cards).toBe(7)

    como("atendente")
    expect((await apagarFunil(f.id)).erro).toBe("Sem permissão")
    expect((await clientes.atendente.rpc("apagar_funil", { p_funil: f.id })).error).not.toBeNull()
    expect((await service.from("pipeline_cards").select("id").eq("funil", f.id)).data).toHaveLength(7)

    como("admin")
    expect(await apagarFunil(f.id)).toEqual({ cards: 7 })
    expect((await service.from("funis").select("id").eq("id", f.id)).data).toEqual([])
    expect((await service.from("funil_etapas").select("id").eq("funil_id", f.id)).data).toEqual([])
    expect((await service.from("pipeline_cards").select("id").eq("funil", f.id)).data).toEqual([])
    expect((await listarFunisDaEmpresa()).map((x) => x.id)).not.toContain(f.id)

    expect((await service.from("contacts").select("id").in("id", contatos.slice(0, 7))).data).toHaveLength(7)
    expect((await service.from("pipeline_cards").select("id").eq("funil", fica.id)).data).toHaveLength(2)
    expect((await service.from("pipeline_cards").select("etapa").eq("funil", "entrada").eq("contact_id", contatos[0])).data).toEqual([{ etapa: "lead" }])
  })
})
