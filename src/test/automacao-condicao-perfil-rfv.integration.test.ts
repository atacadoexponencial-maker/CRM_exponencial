// @vitest-environment node
// B43-02 — condição "Perfil RFV" nas automações, no Supabase real: salvar a condição e
// o motor seguindo pelo "sim" só com o perfil marcado. O perfil é o da hora, sobre a
// base da empresa inteira (perfis_rfv_do_workspace). Única coisa mockada:
// @/integrations/supabase/server, para injetar um cliente autenticado de verdade.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { processarAutomacoes } from "@/lib/automacoes"
import { buscarRfv } from "@/app/(auth)/relatorios/actions"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"
import type { Fluxo } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const hoje = hojeNoFuso()
const posicao = { x: 0, y: 0 }

let ws = ""
let adminId = ""
const usuarios: string[] = []
const navegadores: Record<string, SupabaseClient> = {}
const ids: Record<string, string> = {}
const conversas: Record<string, string> = {}

async function criarUsuario(nome: string) {
  const email = `b43-02-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role: "admin", status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = c
  return id
}
const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(navegadores[adminId] as never)

function compras(contato: string, n: number, valor: number, mesesDaUltima = 0) {
  return Array.from({ length: n }, (_, i) => ({
    workspace_id: ws, contact_id: ids[contato], data: deslocarMeses(hoje, -(mesesDaUltima + i)), valor, origem: "manual",
  }))
}

/** Gatilho, condição de perfil RFV e, no "sim", uma ação de adicionar tag. */
function fluxoComCondicao(gatilho: "mensagem_recebida", valor: string, tag: string): Fluxo {
  return {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho, parametros: {}, posicao },
      { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "perfil_rfv", operador: "e_um_de", valor }], posicao },
      { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag }, posicao },
    ],
    ligacoes: [
      { de: "g", saida: "proximo", para: "c" },
      { de: "c", saida: "sim", para: "a" },
    ],
  }
}

const temTag = async (contato: string, tag: string) =>
  ((await service.from("contact_tags").select("tag").eq("contact_id", ids[contato]).eq("tag", tag)).data ?? []).length > 0

async function mensagemDe(contato: string) {
  await processarAutomacoes({
    tipo: "mensagem_recebida",
    workspaceId: ws,
    contactId: ids[contato],
    conversationId: conversas[contato],
    messageId: crypto.randomUUID(),
    tipoMensagem: "texto",
    texto: "oi",
  })
}

// Base de 13 clientes: "Top" compra muito e comprou este mês (Campeão); "Sumido"
// comprou pouco, há 8 meses (Hibernando ou pior); os "Medio" completam a base.
beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B43-02 ${ts}` }).select("id").single()).data!.id
  adminId = await criarUsuario("Admin")

  const nomes = ["Top", "Sumido", ...Array.from({ length: 11 }, (_, i) => `Medio ${i}`)]
  const { data: contatos, error } = await service
    .from("contacts")
    .insert(nomes.map((name, i) => ({ workspace_id: ws, name, phone_number: `5521${ts % 1e7}${String(i).padStart(2, "0")}` })))
    .select("id, name")
  if (error || !contatos) throw new Error(error?.message)
  for (const c of contatos) ids[c.name as string] = c.id as string

  const { error: erroCompras } = await service.from("contact_purchases").insert([
    ...compras("Top", 8, 2000),
    ...compras("Sumido", 1, 50, 8),
    ...Array.from({ length: 11 }, (_, i) => compras(`Medio ${i}`, 2, 300, 1)).flat(),
  ])
  if (erroCompras) throw new Error(erroCompras.message)

  for (const nome of ["Top", "Sumido"]) {
    conversas[nome] = (await service.from("conversations").insert({ workspace_id: ws, contact_id: ids[nome], status: "em_atendimento" }).select("id").single()).data!.id
  }
}, 120_000)

afterAll(async () => {
  await service.from("automation_runs").delete().eq("workspace_id", ws)
  await service.from("automation_queue").delete().eq("workspace_id", ws)
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("contact_tags").delete().eq("workspace_id", ws)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B43-02 — condição Perfil RFV nas automações", { timeout: 90_000 }, () => {
  it("CA-B43-15: should gravar a condição com os dois perfis marcados e recusar perfil que não existe", async () => {
    comoAdmin()
    const r = await salvarRegra({ id: null, nome: "Campeões e fiéis", fluxo: fluxoComCondicao("mensagem_recebida", "campeao,fieis", "x"), repeticao: { modo: "sempre" } })
    expect(r.erro).toBeUndefined()

    const { data } = await service.from("automation_flows").select("fluxo").eq("id", r.id!).single()
    const condicao = (data!.fluxo as unknown as Fluxo).blocos.find((b) => b.tipo === "condicao")
    expect(condicao && "verificacoes" in condicao ? condicao.verificacoes[0] : null).toMatchObject({ tipo: "perfil_rfv", operador: "e_um_de", valor: "campeao,fieis" })

    comoAdmin()
    const recusa = await salvarRegra({ id: null, nome: "Inventado", fluxo: fluxoComCondicao("mensagem_recebida", "campeao,vip_de_ouro", "x"), repeticao: { modo: "sempre" } })
    expect(recusa.erro).toBe("Um perfil RFV escolhido numa condição não existe. Escolha de novo.")
  })

  it("CA-B43-22: should seguir pelo sim só com o contato no perfil marcado, pelo perfil da hora", async () => {
    comoAdmin()
    const perfis = Object.fromEntries((await buscarRfv({}))!.clientes.map((c) => [c.contatoId, c.perfil]))
    expect(perfis[ids["Top"]]).toBe("campeao")
    expect(perfis[ids["Sumido"]]).not.toBe("campeao")

    comoAdmin()
    const r = await salvarRegra({ id: null, nome: "VIP no atendimento", fluxo: fluxoComCondicao("mensagem_recebida", "campeao", "vip-atendimento"), repeticao: { modo: "sempre" } })
    expect(r.erro).toBeUndefined()
    comoAdmin()
    expect(await alternarRegra(r.id!, true)).toEqual({})

    await mensagemDe("Top")
    await mensagemDe("Sumido")

    expect(await temTag("Top", "vip-atendimento")).toBe(true)
    expect(await temTag("Sumido", "vip-atendimento")).toBe(false)
  })
})
