// @vitest-environment node
// B23-03 — Conversa antiga não dispara nada e cria card só por opção.
// Bate no banco de teste com o webhook da Meta assinado (padrão de
// historico-do-celular.integration.test.ts). Duas conexões: uma com a opção dos
// cards desmarcada (empresa A) e outra marcada (empresa B).

import { createClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

const dispararAutomacoes = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...args: unknown[]) => dispararAutomacoes(...args) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"
import { calcularAlertas, type CardParaAlerta } from "@/lib/alertas"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SEGREDO = "segredo-da-meta-b23-03"
const sufixo = String(ts).slice(-7)
const EMPRESA_DIGITOS = `55119${sufixo}0`
const EMPRESA_FORMATADO = `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}0`
const ID_A = `pn_b23_03_a_${ts}`
const ID_B = `pn_b23_03_b_${ts}`
const CLIENTE_NOVO = `55219${sufixo}1`
const CLIENTE_COM_CARD = `55219${sufixo}2`

let empresaA = "", empresaB = "", conexaoA = "", comCard = "", cardAntigo = ""
const seg = (n: number) => String(1_700_000_000 + n)

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B23-03 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B23-03 B ${ts}` }).select("id").single()).data!.id
  const conexao = (empresa: string, phoneNumberId: string, criarCards: boolean) => ({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: EMPRESA_DIGITOS, display_name: "Loja",
    phone_number_id: phoneNumberId, waba_id: `waba_${phoneNumberId}`, access_token: "token", em_uso_no_celular: true,
    criar_cards_do_historico: criarCards, historico_situacao: "importando", historico_progresso: 0, historico_pedido_em: new Date().toISOString(),
  })
  conexaoA = (await service.from("whatsapp_connections").insert(conexao(empresaA, ID_A, false)).select("id").single()).data!.id
  await service.from("whatsapp_connections").insert(conexao(empresaB, ID_B, true))
  // Na empresa B, um contato que já tinha card em Negociação.
  comCard = (await service.from("contacts").insert({ workspace_id: empresaB, phone_number: CLIENTE_COM_CARD, name: "Com Card" }).select("id").single()).data!.id
  cardAntigo = (await service.from("pipeline_cards").insert({ workspace_id: empresaB, contact_id: comCard, funil: "entrada", etapa: "negociacao" }).select("id").single()).data!.id
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
  dispararAutomacoes.mockClear()
})

afterAll(async () => {
  const empresas = [empresaA, empresaB]
  const { data: conversas } = await service.from("conversations").select("id").in("workspace_id", empresas)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().in("workspace_id", empresas)
  const { data: cards } = await service.from("pipeline_cards").select("id").in("workspace_id", empresas)
  const cardIds = (cards ?? []).map((c) => c.id)
  if (cardIds.length) await service.from("pipeline_card_history").delete().in("card_id", cardIds)
  await service.from("pipeline_cards").delete().in("workspace_id", empresas)
  await service.from("contacts").delete().in("workspace_id", empresas)
  await service.from("agenda_do_celular").delete().in("workspace_id", empresas)
  await service.from("whatsapp_connections").delete().in("workspace_id", empresas)
  await service.from("workspaces").delete().in("id", empresas)
}, 60_000)

async function receber(phoneNumberId: string, history: unknown[]) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "waba", changes: [{ field: "history", value: { messaging_product: "whatsapp", metadata: { display_phone_number: EMPRESA_FORMATADO, phone_number_id: phoneNumberId }, history } }] }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } }))
  expect(res.status).toBe(200)
}

const parte = (prefixo: string, progress: number) => ({
  metadata: { phase: 0, chunk_order: 1, progress },
  threads: [
    { id: CLIENTE_NOVO, messages: [
      { from: CLIENTE_NOVO, id: `wamid.${prefixo}.1.${ts}`, timestamp: seg(1000), type: "text", text: { body: "Oi" }, history_context: { status: "READ" } },
      { from: EMPRESA_DIGITOS, id: `wamid.${prefixo}.2.${ts}`, timestamp: seg(2000), type: "text", text: { body: "Olá!" }, history_context: { status: "READ" } },
    ] },
    { id: CLIENTE_COM_CARD, messages: [
      { from: CLIENTE_COM_CARD, id: `wamid.${prefixo}.3.${ts}`, timestamp: seg(3000), type: "text", text: { body: "Tem desconto?" }, history_context: { status: "READ" } },
    ] },
  ],
})

/** O que o dashboard lê (cards, histórico de etapas, compras) e a central de alertas calcula. */
async function oQueDashboardEAlertasVeem(empresa: string) {
  const [{ data: cards }, { data: purchases }] = await Promise.all([
    service.from("pipeline_cards").select("id, contact_id, funil, etapa, etapa_changed_at").eq("workspace_id", empresa).order("id"),
    service.from("contact_purchases").select("id").eq("workspace_id", empresa),
  ])
  const { data: history } = await service.from("pipeline_card_history").select("id").in("card_id", (cards ?? []).map((c) => c.id))
  const paraAlerta: CardParaAlerta[] = (cards ?? []).map((c) => ({
    id: c.id, funil: c.funil, etapa: c.etapa, etapa_changed_at: c.etapa_changed_at, contact_id: c.contact_id,
    contatoNome: "x", atendenteNome: null, ultimaAtividade: null,
  }))
  const alertas = calcularAlertas(paraAlerta, { leadSemRespostaDias: 1, emRiscoDias: 1, inativoDias: 1, semRecompraDias: 1 }, [])
  return { cards: cards ?? [], historico: (history ?? []).length, compras: (purchases ?? []).length, alertas }
}

async function cardsDoContato(empresa: string, telefone: string) {
  const { data: contato } = await service.from("contacts").select("id").eq("workspace_id", empresa).eq("phone_number", telefone).maybeSingle()
  if (!contato) return null
  const { data } = await service.from("pipeline_cards").select("id, funil, etapa").eq("contact_id", contato.id).order("funil")
  return data ?? []
}

describe("B23-03 — Conversa antiga não dispara nada; card só por opção", { timeout: 60_000 }, () => {
  it("CA-B23-15: should not disparar automação, marcar não lida, criar alerta nem mudar o dashboard ao importar", async () => {
    const antes = await oQueDashboardEAlertasVeem(empresaA)
    await receber(ID_A, [parte("a1", 50)])

    expect(dispararAutomacoes).not.toHaveBeenCalled()
    const { data: conversas } = await service.from("conversations").select("unread_count, status").eq("workspace_id", empresaA)
    expect(conversas).toHaveLength(2)
    expect(conversas!.every((c) => c.unread_count === 0)).toBe(true)
    expect(await cardsDoContato(empresaA, CLIENTE_NOVO)).toEqual([])
    const depois = await oQueDashboardEAlertasVeem(empresaA)
    expect(depois).toEqual(antes)
    expect(depois.alertas).toEqual([])
  })

  it("CA-B23-16: should not criar card no fim da importação quando a opção está desmarcada", async () => {
    await receber(ID_A, [{ metadata: { phase: 2, chunk_order: 2, progress: 100 }, threads: [] }])
    const { data: conexao } = await service.from("whatsapp_connections").select("historico_situacao").eq("id", conexaoA).single()
    expect(conexao).toEqual({ historico_situacao: "importado" })
    const { data: cards } = await service.from("pipeline_cards").select("id").eq("workspace_id", empresaA)
    expect(cards).toEqual([])
    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })

  it("CA-B23-17: should dar card na primeira etapa da Entrada a cada contato importado sem card, e manter o card de quem já tinha", async () => {
    await receber(ID_B, [parte("b1", 40)])
    // Antes do fim, nada de card.
    expect(await cardsDoContato(empresaB, CLIENTE_NOVO)).toEqual([])

    await receber(ID_B, [{ metadata: { phase: 2, chunk_order: 2, progress: 100 }, threads: [] }])

    expect((await cardsDoContato(empresaB, CLIENTE_NOVO))!.map((c) => [c.funil, c.etapa])).toEqual([["entrada", "lead"]])
    expect(await cardsDoContato(empresaB, CLIENTE_COM_CARD)).toEqual([{ id: cardAntigo, funil: "entrada", etapa: "negociacao" }])
    const { data: cards } = await service.from("pipeline_cards").select("id").eq("workspace_id", empresaB)
    expect(cards).toHaveLength(2)
  })
})
