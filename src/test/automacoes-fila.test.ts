// Testes da fila das automações (B11-09): o disparo grava e agenda, e as regras
// rodam depois da resposta, um evento de cada vez por contato. O banco, o `after`
// do Next e o motor são falsos. A função do banco que entrega o próximo evento é
// conferida no preview (e2e/preview/roteiro-b11-09.cjs).

import { describe, it, expect, vi, beforeEach } from "vitest"

const agendados: Array<() => Promise<void>> = []
const after = vi.fn((trabalho: () => Promise<void>) => {
  agendados.push(trabalho)
})
vi.mock("next/server", () => ({ after: (trabalho: () => Promise<void>) => after(trabalho) }))

vi.mock("@/lib/automacoes/index", () => ({ processarAutomacoes: vi.fn().mockResolvedValue(undefined) }))

const insert = vi.fn()
const apagar = vi.fn()
const rpc = vi.fn()
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: (linha: unknown) => insert(linha),
      delete: () => ({ eq: (_coluna: string, id: string) => apagar(id) }),
    }),
    rpc: (nome: string, args: unknown) => rpc(nome, args),
  }),
}))

import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { PRAZO_DA_FILA_MS, PRAZO_DAS_REGRAS_MS, chaveDaFila, consumirFila, dispararAutomacoes } from "@/lib/automacoes/fila"
import { processarAutomacoes } from "@/lib/automacoes/index"

const motor = vi.mocked(processarAutomacoes)

const tag = (t: string): GatilhoAutomacao => ({ tipo: "tag_adicionada", workspaceId: "ws-1", contactId: "contato-1", tag: t })

async function rodarAgendados() {
  while (agendados.length) await agendados.shift()!()
}

beforeEach(() => {
  agendados.length = 0
  vi.restoreAllMocks()
  vi.clearAllMocks()
  insert.mockResolvedValue({ error: null })
  apagar.mockResolvedValue({ error: null })
  rpc.mockResolvedValue({ data: [], error: null })
})

describe("dispararAutomacoes", () => {
  it("grava o evento na fila do contato e não roda nada antes da resposta", async () => {
    await dispararAutomacoes(tag("vip"))

    expect(insert).toHaveBeenCalledWith({ workspace_id: "ws-1", chave: "contato-1", evento: tag("vip") })
    expect(after).toHaveBeenCalledTimes(1)
    expect(motor).not.toHaveBeenCalled()
  })

  it("depois da resposta, roda os eventos da chave na ordem que a fila entrega e tira cada um dela", async () => {
    rpc
      .mockResolvedValueOnce({ data: [{ id: "q1", evento: tag("a") }], error: null })
      .mockResolvedValueOnce({ data: [{ id: "q2", evento: tag("b") }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    await dispararAutomacoes(tag("a"))
    await rodarAgendados()

    expect(rpc).toHaveBeenCalledWith("reivindicar_evento_de_automacao", { p_chave: "contato-1" })
    expect(motor.mock.calls.map(([evento]) => evento)).toEqual([tag("a"), tag("b")])
    expect(apagar.mock.calls.map(([id]) => id)).toEqual(["q1", "q2"])
  })

  it("com outro evento do contato rodando, a fila não entrega nada e este consumo para", async () => {
    await dispararAutomacoes(tag("a"))
    await rodarAgendados()

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(motor).not.toHaveBeenCalled()
  })

  it("evento sem contato vai para a fila da empresa", () => {
    expect(
      chaveDaFila({ tipo: "card_movido", workspaceId: "ws-1", contactId: null, cardId: "c", funil: "entrada", etapa: "lead" })
    ).toBe("workspace:ws-1")
  })

  it("sem conseguir gravar na fila, as regras rodam do mesmo jeito depois da resposta", async () => {
    insert.mockResolvedValue({ error: { message: "timeout" } })

    await dispararAutomacoes(tag("vip"))
    expect(motor).not.toHaveBeenCalled()
    await rodarAgendados()

    expect(motor).toHaveBeenCalledWith(tag("vip"))
    expect(rpc).not.toHaveBeenCalled()
  })

  it("fora de uma requisição (script ou teste), roda na hora", async () => {
    after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope")
    })
    rpc.mockResolvedValueOnce({ data: [{ id: "q1", evento: tag("vip") }], error: null })

    await dispararAutomacoes(tag("vip"))

    expect(motor).toHaveBeenCalledWith(tag("vip"), { prazo: expect.any(Number) })
  })

  it("erro ao pedir o próximo evento encerra o consumo sem lançar", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "timeout" } })

    await dispararAutomacoes(tag("vip"))
    await expect(rodarAgendados()).resolves.toBeUndefined()
    expect(motor).not.toHaveBeenCalled()
  })

  it("nada lança erro para quem disparou", async () => {
    insert.mockRejectedValue(new Error("rede caiu"))
    await expect(dispararAutomacoes(tag("vip"))).resolves.toBeUndefined()
  })
})

describe("orçamento de tempo do consumo (B22-06)", () => {
  /** Relógio falso: começa em `inicio` e cada evento que o motor roda leva `porEvento` ms. */
  function relogio(inicio: number, porEvento: number) {
    let agora = inicio
    vi.spyOn(Date, "now").mockImplementation(() => agora)
    motor.mockImplementation(async () => {
      agora += porEvento
    })
  }
  const fila = (n: number) => {
    for (let i = 0; i < n; i++) rpc.mockResolvedValueOnce({ data: [{ id: `q${i}`, evento: tag(`t${i}`) }], error: null })
  }

  it("sem limite de quantidade: 60 eventos rápidos rodam todos no mesmo consumo", async () => {
    relogio(1_000_000, 100)
    fila(60)
    await consumirFila("contato-1")
    expect(motor).toHaveBeenCalledTimes(60)
    expect(apagar).toHaveBeenCalledTimes(60)
  })

  it("passa ao motor o prazo das regras, contado do começo do consumo", async () => {
    relogio(1_000_000, 100)
    fila(2)
    await consumirFila("contato-1")
    expect(motor.mock.calls.map(([, opcoes]) => opcoes)).toEqual([
      { prazo: 1_000_000 + PRAZO_DAS_REGRAS_MS },
      { prazo: 1_000_000 + PRAZO_DAS_REGRAS_MS },
    ])
  })

  it("depois do prazo da fila, para de pegar eventos: o que sobrar espera o próximo evento do contato", async () => {
    relogio(0, 100_000)
    fila(10)
    await consumirFila("contato-1")
    // Eventos em 0, 100 e 200 s; aos 300 s o prazo da fila (270 s) já passou
    expect(PRAZO_DA_FILA_MS).toBe(270_000)
    expect(motor).toHaveBeenCalledTimes(3)
    expect(rpc).toHaveBeenCalledTimes(3)
  })
})
