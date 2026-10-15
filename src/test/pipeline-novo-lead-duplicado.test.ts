// B22-26 — "novo lead" para contato que já está no Funil de Entrada (achado M6 do
// QA das automações, 09/10/2026): não cria o segundo card e diz por quê. O
// cliente do banco é falso e responde por tabela.

import { describe, it, expect, vi, beforeEach } from "vitest"

const disparar = vi.fn()
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...a: unknown[]) => disparar(...a) }))
vi.mock("@/lib/sequencias", () => ({ processarGatilhoSequencia: vi.fn() }))
vi.mock("@/lib/lixeira", () => ({ tirarDaLixeira: vi.fn(async () => {}) }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  cardsDepoisDoMovimento: vi.fn(),
  prepararGatilhoDeClassificacao: vi.fn(async () => async () => {}),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { criarNovoLead } from "@/app/(auth)/pipeline/actions"

let inseriuCard: boolean

/** `cardExistente`: o que a busca do card do funil acha; `erroAoInserir`: o erro do insert do card. */
function banco({ cardExistente = null as unknown, erroAoInserir = null as unknown } = {}) {
  inseriuCard = false
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "admin-1" } }, error: null }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let inserindo = false
      for (const m of ["select", "eq", "limit", "upsert"]) obj[m] = vi.fn(() => obj)
      obj.insert = vi.fn(() => {
        inserindo = true
        if (tabela === "pipeline_cards") inseriuCard = true
        return obj
      })
      obj.single = vi.fn(async () => {
        if (tabela === "profiles") return { data: { workspace_id: "ws-1", role: "admin" }, error: null }
        if (tabela === "contacts") return { data: { id: "contato-1" }, error: null }
        if (tabela === "pipeline_cards" && inserindo) {
          return erroAoInserir ? { data: null, error: erroAoInserir } : { data: { id: "card-novo" }, error: null }
        }
        return { data: null, error: null }
      })
      obj.maybeSingle = vi.fn(async () => ({ data: tabela === "pipeline_cards" ? cardExistente : null, error: null }))
      return obj
    }),
  }
  vi.mocked(createClient).mockResolvedValue(client as never)
}

beforeEach(() => disparar.mockClear())

describe("B22-26 — um card por contato no Funil de Entrada", () => {
  it("contato que já tem card: não cria outro e diz por quê", async () => {
    banco({ cardExistente: { id: "card-antigo" } })
    expect(await criarNovoLead("5511999998888", "Ana")).toEqual({ erro: "Este contato já está no Funil de Entrada." })
    expect(inseriuCard).toBe(false)
    expect(disparar).not.toHaveBeenCalled()
  })

  it("dois pedidos juntos: o índice único recusa o segundo, com a mesma mensagem", async () => {
    banco({ erroAoInserir: { code: "23505", message: "duplicate key" } })
    expect(await criarNovoLead("5511999998888", "Ana")).toEqual({ erro: "Este contato já está no Funil de Entrada." })
    expect(disparar).not.toHaveBeenCalled()
  })

  it("contato sem card: cria e dispara o gatilho de card em Lead", async () => {
    banco()
    expect(await criarNovoLead("5511999998888", "Ana")).toEqual({})
    expect(inseriuCard).toBe(true)
    expect(disparar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "card_movido", cardId: "card-novo", etapa: "lead" }))
  })
})
