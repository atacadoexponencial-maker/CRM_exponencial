// QA C2 (06/10/2026) — salvar sequência não apaga as etapas quando dá erro.
// Antes: delete das etapas e insert das novas em dois passos, sem transação;
// prazo decimal numa coluna inteira derrubava o insert e a sequência ficava
// vazia; na criação, cada erro deixava uma sequência vazia a mais.
// Agora: uma chamada só a `salvar_sequencia` (transação no banco), e o prazo
// decimal é recusado antes de tocar no banco.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { salvarSequencia } from "@/app/(auth)/sequencias/actions"

const rpc = vi.fn()
const from = vi.fn()

function banco() {
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { rpc, from },
    user: { id: "admin-1" },
    perfil: { id: "admin-1", workspace_id: "ws-1", role: "admin" },
  } as never)
}

const etapa = { tipo: "mensagem" as const, prazoDias: 1, conteudo: "Oi", instrucao: "" }

beforeEach(() => {
  rpc.mockReset()
  from.mockReset()
  banco()
})

describe("QA C2 — salvar sequência numa transação só", () => {
  it("grava sequência e etapas com uma chamada a salvar_sequencia, sem delete nem insert soltos", async () => {
    rpc.mockResolvedValue({ data: "seq-1", error: null })
    expect(await salvarSequencia({ id: "seq-1", nome: "Boas-vindas", gatilho: "manual", etapas: [etapa] })).toEqual({ id: "seq-1" })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith("salvar_sequencia", {
      p_id: "seq-1",
      p_nome: "Boas-vindas",
      p_gatilho: "manual",
      p_etapas: [{ tipo: "mensagem", prazo_dias: 1, conteudo: "Oi", instrucao: null }],
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("erro do banco ao salvar: devolve a mensagem e nada mais é tocado (as etapas antigas ficam)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } })
    expect(await salvarSequencia({ id: "seq-1", nome: "Boas-vindas", gatilho: "manual", etapas: [etapa] })).toEqual({
      erro: "Não foi possível salvar a sequência",
    })
    expect(from).not.toHaveBeenCalled()
  })

  it("prazo decimal é recusado antes de ir ao banco", async () => {
    expect(await salvarSequencia({ id: "seq-1", nome: "Boas-vindas", gatilho: "manual", etapas: [{ ...etapa, prazoDias: 1.5 }] })).toEqual({
      erro: "Etapa 1: o prazo precisa ser um número inteiro de dias",
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("criação: sequência nova nasce com id null na chamada e o id vem do banco", async () => {
    rpc.mockResolvedValue({ data: "seq-nova", error: null })
    expect(await salvarSequencia({ id: null, nome: "Nova", gatilho: "card_lead", etapas: [etapa] })).toEqual({ id: "seq-nova" })
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_id: null })
  })
})
