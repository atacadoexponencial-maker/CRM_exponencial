// QA A4 e A5 (06/10/2026), no motor de automações: "atribuir" grava o atendente
// também no contato, e o card da Recompra aberto pela ação de mover herda o
// atendente do card da Entrada. O banco é falso (`automacoes-banco-falso.ts`).

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarWhatsAppComMotivo: vi.fn().mockResolvedValue({ ok: true }),
}))

import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const conversaCriada: GatilhoAutomacao = { tipo: "conversa_criada", workspaceId: "ws-1", contactId: "contato-1", conversationId: "conv-1" }
const ATENDENTE_ATIVO = { profiles: { um: { status: "active" } } }
const acao = (tipo: AcaoTipo, parametros: Record<string, string>): BlocoAcao => ({ id: "a", tipo: "acao", acao: tipo, parametros, posicao: { x: 0, y: 0 } })

describe("QA A5 — atribuir grava o atendente no contato", () => {
  it("atribuir atendente: card e contato recebem a mesma pessoa", async () => {
    const b = banco({ ...ATENDENTE_ATIVO, pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } })
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_atendente", { atendente_id: "u-1" }))).toEqual({ ok: true })
    expect(b.gravacoes("pipeline_cards")[0].args[0]).toEqual({ atendente_id: "u-1" })
    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ atendente_id: "u-1" })
    // B45-02: o contato é gravado junto com os cards e as conversas dele, pela lista de ids
    expect(b.chamadas).toContainEqual(expect.objectContaining({ tabela: "contacts", metodo: "in", args: ["id", ["contato-1"]] }))
  })

  it("atribuir ao time: o contato recebe quem o time escolheu", async () => {
    const b = banco(
      { pipeline_cards: { lista: [{ id: "card-entrada", funil: "entrada" }] } },
      { atribuir_conversa_ao_time: { data: [{ atendente_id: "fulana", manteve: false }] } }
    )
    expect(await executarAcao(b.contexto(conversaCriada), acao("atribuir_time", { time_id: "time-1" }))).toEqual({ ok: true })
    expect(b.gravacoes("contacts")[0].args[0]).toEqual({ atendente_id: "fulana" })
  })
})

describe("QA A4 — card da Recompra aberto pela automação herda o atendente da Entrada", () => {
  const cardMovido: GatilhoAutomacao = { tipo: "card_movido", workspaceId: "ws-1", contactId: "contato-1", cardId: "card-entrada", funil: "entrada", etapa: "negociacao" }

  it("mover para Ganho: o card novo da Recompra nasce com o atendente do card da Entrada", async () => {
    // 1ª busca: o card da Entrada que se move; 2ª: ainda não há card na Recompra
    const b = banco({ pipeline_cards: { umEmOrdem: [{ id: "card-entrada", etapa: "negociacao", atendente_id: "vendedora" }, null] } })
    await executarAcao(b.contexto(cardMovido), acao("mover_card", { funil: "entrada", etapa: "ganho" }))
    const inseridos = b.gravacoes("pipeline_cards").filter((c) => c.metodo === "insert").map((c) => c.args[0])
    expect(inseridos).toContainEqual(expect.objectContaining({ funil: "recompra", etapa: "onboarding", atendente_id: "vendedora" }))
  })
})
