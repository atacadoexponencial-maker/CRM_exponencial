// B22-22 — atendente que move o card para Ganho (achado A7 do QA das automações,
// 09/10/2026): o card de Recompra nasce pela chave de serviço, porque a RLS só
// deixa admin e gerente criarem card. Sem a etapa ter mudado de fato, nada é criado.
// Os clientes do banco são falsos e registram o que foi pedido.

import { describe, it, expect, vi, beforeEach } from "vitest"

const disparar = vi.fn()
const sequencia = vi.fn()
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...a: unknown[]) => disparar(...a) }))
vi.mock("@/lib/sequencias", () => ({ processarGatilhoSequencia: (...a: unknown[]) => sequencia(...a) }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  cardsDepoisDoMovimento: vi.fn(),
  prepararGatilhoDeClassificacao: vi.fn(async () => async () => {}),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { moverCard } from "@/app/(auth)/pipeline/actions"

const CARD = { etapa: "negociacao", contact_id: "contato-1", workspace_id: "ws-1", funil: "entrada", atendente_id: "atendente-1" }

/** Cliente falso: cada `from` devolve uma cadeia que termina com a resposta da tabela. */
function cliente(respostas: Record<string, unknown>) {
  const inseridos: Array<[string, unknown]> = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "atendente-1" } }, error: null }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "update"]) obj[m] = vi.fn(() => obj)
      obj.insert = vi.fn((linha: unknown) => {
        inseridos.push([tabela, linha])
        return obj
      })
      const resposta = () => Promise.resolve({ data: respostas[tabela] ?? null, error: null })
      obj.single = vi.fn(resposta)
      obj.maybeSingle = vi.fn(resposta)
      obj.then = (resolve: (v: unknown) => void) => resposta().then(resolve)
      return obj
    }),
  }
  return { client, inseridos }
}

beforeEach(() => {
  disparar.mockClear()
  sequencia.mockClear()
})

describe("B22-22 — Ganho pelo atendente cria o card de Recompra", () => {
  it("cria pela chave de serviço e dispara o onboarding", async () => {
    // Pelo cliente do atendente: o card (leitura e etapa alterada); o pedido de card novo nunca vai por ele
    const usuario = cliente({ pipeline_cards: CARD })
    vi.mocked(usuario.client.from).mockImplementation(((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let atualizando = false
      for (const m of ["select", "eq"]) obj[m] = vi.fn(() => obj)
      obj.update = vi.fn(() => {
        atualizando = true
        return obj
      })
      obj.insert = vi.fn((linha: unknown) => {
        usuario.inseridos.push([tabela, linha])
        return obj
      })
      obj.single = vi.fn(async () => ({ data: CARD, error: null }))
      obj.maybeSingle = vi.fn(async () => ({ data: atualizando ? { id: "card-1" } : null, error: null }))
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(resolve)
      return obj
    }) as never)
    const servico = cliente({})
    vi.mocked(servico.client.from).mockImplementation(((tabela: string) => {
      const obj: Record<string, unknown> = {}
      let inserindo = false
      for (const m of ["select", "eq"]) obj[m] = vi.fn(() => obj)
      obj.insert = vi.fn((linha: unknown) => {
        inserindo = true
        servico.inseridos.push([tabela, linha])
        return obj
      })
      obj.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      obj.single = vi.fn(async () => ({ data: inserindo ? { id: "card-recompra" } : null, error: null }))
      return obj
    }) as never)
    vi.mocked(createClient).mockResolvedValue(usuario.client as never)
    vi.mocked(createServiceClient).mockReturnValue(servico.client as never)

    await moverCard("card-1", "ganho")

    expect(servico.inseridos).toEqual([
      ["pipeline_cards", { funil: "recompra", etapa: "onboarding", contact_id: "contato-1", workspace_id: "ws-1" }],
    ])
    expect(usuario.inseridos.filter(([t]) => t === "pipeline_cards")).toEqual([])
    expect(disparar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: "card_movido", cardId: "card-recompra", funil: "recompra", etapa: "onboarding" })
    )
    expect(sequencia).toHaveBeenCalledWith(expect.objectContaining({ gatilho: "onboarding", contactId: "contato-1" }))
  })

  it("se a RLS barrou a mudança de etapa, recusa e não cria nada", async () => {
    const usuario = cliente({ pipeline_cards: CARD })
    vi.mocked(usuario.client.from).mockImplementation((() => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "update"]) obj[m] = vi.fn(() => obj)
      obj.single = vi.fn(async () => ({ data: CARD, error: null }))
      obj.maybeSingle = vi.fn(async () => ({ data: null, error: null }))
      return obj
    }) as never)
    const servico = cliente({})
    vi.mocked(createClient).mockResolvedValue(usuario.client as never)
    vi.mocked(createServiceClient).mockReturnValue(servico.client as never)

    await expect(moverCard("card-1", "ganho")).rejects.toThrow("Sem permissão para mover este card")
    expect(servico.client.from).not.toHaveBeenCalled()
    expect(disparar).not.toHaveBeenCalled()
  })
})
