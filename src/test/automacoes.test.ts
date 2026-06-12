// Testes unitários do motor de automações — o service client é mockado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes } from "@/lib/automacoes"

const mockCreateServiceClient = vi.mocked(createServiceClient)

type Resultado = { data?: unknown; error?: unknown }

// Builder mínimo que imita a chain do supabase-js: métodos retornam o próprio
// objeto e o await final resolve com o resultado configurado.
function chain(resultado: Resultado) {
  const obj: Record<string, unknown> = {}
  const self = () => obj
  for (const m of ["select", "eq", "in", "order", "limit", "update", "insert"]) {
    obj[m] = vi.fn(self)
  }
  obj.single = vi.fn(() => Promise.resolve(resultado))
  obj.maybeSingle = vi.fn(() => Promise.resolve(resultado))
  obj.then = (resolve: (v: Resultado) => void) => Promise.resolve(resultado).then(resolve)
  return obj
}

describe("processarAutomacoes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("conversa_criada com ação aplicar_etiqueta faz upsert do vínculo", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "automations") {
          return chain({
            data: [
              {
                id: "auto-1",
                gatilho_tipo: "conversa_criada",
                gatilho_config: {},
                acao_tipo: "aplicar_etiqueta",
                acao_config: { label_id: "label-1" },
              },
            ],
          })
        }
        if (table === "conversation_labels") return { upsert }
        return chain({ data: null })
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    await processarAutomacoes({
      tipo: "conversa_criada",
      workspaceId: "ws-1",
      contactId: "contact-1",
      conversationId: "conv-1",
    })

    expect(upsert).toHaveBeenCalledWith(
      { conversation_id: "conv-1", label_id: "label-1" },
      { onConflict: "conversation_id,label_id" }
    )
  })

  it("card_movido só executa quando funil e etapa do gatilho correspondem", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "automations") {
          return chain({
            data: [
              {
                id: "auto-1",
                gatilho_tipo: "card_movido",
                gatilho_config: { funil: "expansao", etapa: "em_negociacao" },
                acao_tipo: "aplicar_etiqueta",
                acao_config: { label_id: "label-1" },
              },
            ],
          })
        }
        if (table === "conversation_labels") return { upsert }
        if (table === "conversations") return chain({ data: { id: "conv-9" } })
        return chain({ data: null })
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    // Etapa diferente da configurada — não deve executar
    await processarAutomacoes({
      tipo: "card_movido",
      workspaceId: "ws-1",
      contactId: "contact-1",
      cardId: "card-1",
      funil: "expansao",
      etapa: "lead",
    })
    expect(upsert).not.toHaveBeenCalled()

    // Etapa correspondente — executa na conversa aberta do contato
    await processarAutomacoes({
      tipo: "card_movido",
      workspaceId: "ws-1",
      contactId: "contact-1",
      cardId: "card-1",
      funil: "expansao",
      etapa: "em_negociacao",
    })
    expect(upsert).toHaveBeenCalledWith(
      { conversation_id: "conv-9", label_id: "label-1" },
      { onConflict: "conversation_id,label_id" }
    )
  })

  it("ação atribuir_atendente atualiza conversa e card", async () => {
    const updateConversa = vi.fn(() => chain({ error: null }))
    const updateCard = vi.fn(() => chain({ error: null }))

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "automations") {
          return chain({
            data: [
              {
                id: "auto-1",
                gatilho_tipo: "card_movido",
                gatilho_config: {},
                acao_tipo: "atribuir_atendente",
                acao_config: { atendente_id: "user-7" },
              },
            ],
          })
        }
        if (table === "conversations") {
          const c = chain({ data: { id: "conv-9" } })
          c.update = updateConversa
          return c
        }
        if (table === "pipeline_cards") {
          const c = chain({ data: null })
          c.update = updateCard
          return c
        }
        return chain({ data: null })
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    await processarAutomacoes({
      tipo: "card_movido",
      workspaceId: "ws-1",
      contactId: "contact-1",
      cardId: "card-1",
      funil: "expansao",
      etapa: "lead",
    })

    expect(updateConversa).toHaveBeenCalledWith({ assigned_to: "user-7" })
    expect(updateCard).toHaveBeenCalledWith({ atendente_id: "user-7" })
  })

  it("erro no banco não propaga para o fluxo que disparou o gatilho", async () => {
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error("db caiu")
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    await expect(
      processarAutomacoes({
        tipo: "conversa_criada",
        workspaceId: "ws-1",
        contactId: "contact-1",
        conversationId: "conv-1",
      })
    ).resolves.toBeUndefined()
  })
})
