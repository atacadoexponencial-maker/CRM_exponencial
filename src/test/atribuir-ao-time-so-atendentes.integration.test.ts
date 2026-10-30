// @vitest-environment node
// B53-02 — "Atribuir ao time" escolhe só entre os Atendentes ativos do time, e o
// card e o dono do contato acompanham a pessoa escolhida. Roda a ação do motor
// no banco de teste, com a service role, como a automação.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

import { executarAcao } from "@/lib/automacoes/acoes"
import type { ServiceClient } from "@/lib/automacoes/contexto"
import type { BlocoAcao } from "@/lib/fluxo-automacao"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
let empresa = ""
let timeMisto = ""
let timeSemAtendente = ""
const pessoas: Record<string, string> = {}
let contatos = 0

async function pessoa(nome: string, role: "admin" | "gerente" | "atendente") {
  const { data, error } = await service.auth.admin.createUser({
    email: `b53-02-${nome.toLowerCase()}-${ts}@teste.com`,
    password: "senha-segura-123",
    email_confirm: true,
  })
  if (error) throw error
  pessoas[nome] = data.user.id
  const { error: erroPerfil } = await service
    .from("profiles")
    .insert({ id: data.user.id, workspace_id: empresa, name: nome, role, status: "active" })
  if (erroPerfil) throw erroPerfil
}

async function time(nome: string, membros: string[]) {
  const id = (await service.from("teams").insert({ workspace_id: empresa, name: nome }).select("id").single()).data!.id
  for (const m of membros) await service.from("user_teams").insert({ team_id: id, user_id: pessoas[m] })
  return id as string
}

/** Contato novo com uma conversa e, se pedido, um card de Entrada. */
async function contatoComConversa(dados: { conversaCom?: string; dono?: string; card?: boolean; status?: string } = {}) {
  contatos++
  const contato = (
    await service
      .from("contacts")
      .insert({
        workspace_id: empresa,
        name: `Cliente B53 ${contatos}`,
        phone_number: `5598${String(ts).slice(-7)}${String(contatos).padStart(2, "0")}`,
        atendente_id: dados.dono ? pessoas[dados.dono] : null,
      })
      .select("id")
      .single()
  ).data!.id as string
  const { data: conversa, error } = await service
    .from("conversations")
    .insert({
      workspace_id: empresa,
      contact_id: contato,
      assigned_to: dados.conversaCom ? pessoas[dados.conversaCom] : null,
      status: dados.status ?? "em_espera",
    })
    .select("id")
    .single()
  if (error) throw error
  let card: string | null = null
  if (dados.card) {
    const { data, error: erroCard } = await service
      .from("pipeline_cards")
      .insert({
        workspace_id: empresa,
        contact_id: contato,
        funil: "entrada",
        etapa: "lead",
        atendente_id: dados.dono ? pessoas[dados.dono] : null,
      })
      .select("id")
      .single()
    if (erroCard) throw erroCard
    card = data.id
  }
  return { contato, conversa: conversa.id as string, card }
}

const atribuirAoTime = (timeId: string, contactId: string, conversationId: string) => {
  const bloco: BlocoAcao = { id: "a", tipo: "acao", acao: "atribuir_time", parametros: { time_id: timeId }, posicao: { x: 0, y: 0 } }
  return executarAcao(
    {
      supabase: service as unknown as ServiceClient,
      gatilho: { tipo: "conversa_criada", workspaceId: empresa, contactId, conversationId },
    },
    bloco
  )
}

const donoDaConversa = async (id: string) =>
  (await service.from("conversations").select("assigned_to").eq("id", id).single()).data!.assigned_to

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Atribuir ao time B53-02 ${ts}` }).select("id").single()).data!.id
  // "Aaron" vem antes no nome: no empate de carga ele ganharia, se o papel não contasse
  await pessoa("Aaron", "gerente")
  await pessoa("Zelia", "atendente")
  await pessoa("Abel", "admin")
  timeMisto = await time("Vendas B53", ["Aaron", "Zelia"])
  timeSemAtendente = await time("Só chefia B53", ["Aaron", "Abel"])
  // A Zelia começa com 3 conversas abertas; o Aaron, com nenhuma
  for (let i = 0; i < 3; i++) await contatoComConversa({ conversaCom: "Zelia", status: "em_atendimento" })
}, 120_000)

afterAll(async () => {
  if (!empresa) return
  await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("carteira_historico").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("user_teams").delete().in("user_id", Object.values(pessoas))
  await service.from("teams").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of Object.values(pessoas)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 120_000)

describe("B53-02 — Atribuir ao time escolhe só Atendentes e leva card e contato", () => {
  it("CA-B53-03: conversa sem dono vai para o Atendente com 3 conversas, e não para o Gerente sem nenhuma", async () => {
    const { count } = await service
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", pessoas.Zelia)
      .in("status", ["em_espera", "em_atendimento"])
    expect(count).toBe(3)

    const { contato, conversa } = await contatoComConversa()
    expect(await atribuirAoTime(timeMisto, contato, conversa)).toEqual({ ok: true })
    expect(await donoDaConversa(conversa)).toBe(pessoas.Zelia)
  })

  it("CA-B53-04: time só com Gerente e Admin falha com o motivo, e a conversa continua sem dono", async () => {
    const { contato, conversa } = await contatoComConversa()
    expect(await atribuirAoTime(timeSemAtendente, contato, conversa)).toEqual({
      ok: false,
      motivo: "O time não tem atendente ativo",
    })
    expect(await donoDaConversa(conversa)).toBeNull()
  })

  it("CA-B53-05: conversa já com o Atendente fica com ele, e o card e o contato do Gerente passam para ele", async () => {
    const { contato, conversa, card } = await contatoComConversa({ conversaCom: "Zelia", dono: "Aaron", card: true, status: "em_atendimento" })
    // Confere a montagem: card e contato começam com o Gerente
    expect((await service.from("pipeline_cards").select("atendente_id").eq("id", card!).single()).data!.atendente_id).toBe(pessoas.Aaron)
    expect((await service.from("contacts").select("atendente_id").eq("id", contato).single()).data!.atendente_id).toBe(pessoas.Aaron)

    expect(await atribuirAoTime(timeMisto, contato, conversa)).toEqual({ ok: true })

    expect(await donoDaConversa(conversa)).toBe(pessoas.Zelia)
    expect((await service.from("pipeline_cards").select("atendente_id").eq("id", card!).single()).data!.atendente_id).toBe(pessoas.Zelia)
    expect((await service.from("contacts").select("atendente_id").eq("id", contato).single()).data!.atendente_id).toBe(pessoas.Zelia)
  })
})
