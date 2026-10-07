// Testes unitários do motor de automações — o service client é mockado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))

// Só o envio é falso; buscarConversaAberta continua a de verdade, sobre o banco mockado.
vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarTextoWhatsApp: vi.fn().mockResolvedValue(true),
}))

import { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes } from "@/lib/automacoes"
import type { Fluxo } from "@/lib/fluxo-automacao"
import { enviarTextoWhatsApp } from "@/lib/whatsapp-envio"

const mockCreateServiceClient = vi.mocked(createServiceClient)
const mockEnviarTexto = vi.mocked(enviarTextoWhatsApp)

type Resultado = { data?: unknown; error?: unknown }

// Builder mínimo que imita a chain do supabase-js: métodos retornam o próprio
// objeto e o await final resolve com o resultado configurado.
function chain(resultado: Resultado) {
  const obj: Record<string, unknown> = {}
  const self = () => obj
  for (const m of ["select", "eq", "in", "not", "order", "limit", "update", "insert"]) {
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
      // B13-03: o contato não está na lixeira.
      rpc: vi.fn().mockResolvedValue({ data: false }),
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
      // B13-03: o contato não está na lixeira.
      rpc: vi.fn().mockResolvedValue({ data: false }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "automations") {
          return chain({
            data: [
              {
                id: "auto-1",
                gatilho_tipo: "card_movido",
                gatilho_config: { funil: "entrada", etapa: "negociacao" },
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
      funil: "entrada",
      etapa: "lead",
    })
    expect(upsert).not.toHaveBeenCalled()

    // Etapa correspondente — executa na conversa aberta do contato
    await processarAutomacoes({
      tipo: "card_movido",
      workspaceId: "ws-1",
      contactId: "contact-1",
      cardId: "card-1",
      funil: "entrada",
      etapa: "negociacao",
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
      // B13-03: o contato não está na lixeira.
      rpc: vi.fn().mockResolvedValue({ data: false }),
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
      funil: "entrada",
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

describe("processarAutomacoes com fluxo de blocos (B11-02)", () => {
  const posicao = { x: 0, y: 0 }
  const conversaCriada = {
    tipo: "conversa_criada" as const,
    workspaceId: "ws-1",
    contactId: "contact-1",
    conversationId: "conv-1",
  }

  // Gatilho → canal é "direto"? sim: etiqueta e depois mensagem / não: outra mensagem
  const fluxoPorCanal: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "canal", operador: "e", valor: "direto" }], posicao },
      { id: "etiqueta", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-direto" }, posicao },
      { id: "msg-sim", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "Oi pelo canal direto" }, posicao },
      { id: "msg-nao", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "Oi pela API Oficial" }, posicao },
    ],
    ligacoes: [
      { de: "g", saida: "proximo", para: "c" },
      { de: "c", saida: "sim", para: "etiqueta" },
      { de: "etiqueta", saida: "proximo", para: "msg-sim" },
      { de: "c", saida: "nao", para: "msg-nao" },
    ],
  }

  /** Banco falso: cada tabela devolve o que o teste mandou; as outras, nada. */
  function banco(tabelas: Record<string, unknown>) {
    mockCreateServiceClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false }),
      from: vi.fn((tabela: string) => tabelas[tabela] ?? chain({ data: null })),
    } as unknown as ReturnType<typeof createServiceClient>)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("condição de canal: no canal direto aplica a etiqueta e manda a mensagem do sim", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal }] }),
      conversations: chain({ data: { whatsapp_connection_id: "conn-1", conexao: { canal: "gateway" } } }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(upsert).toHaveBeenCalledWith(
      { conversation_id: "conv-1", label_id: "label-direto" },
      { onConflict: "conversation_id,label_id" }
    )
    expect(mockEnviarTexto).toHaveBeenCalledTimes(1)
    expect(mockEnviarTexto).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", "Oi pelo canal direto")
  })

  it("condição de canal: na API Oficial segue pelo não e manda só a outra mensagem", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal }] }),
      conversations: chain({ data: { whatsapp_connection_id: "conn-1", conexao: { canal: "meta" } } }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(upsert).not.toHaveBeenCalled()
    expect(mockEnviarTexto).toHaveBeenCalledTimes(1)
    expect(mockEnviarTexto).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", "Oi pela API Oficial")
  })

  it("conversa sem número gravado: o canal não vale e o caminho vai pelo não", async () => {
    banco({
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal }] }),
      conversations: chain({ data: { whatsapp_connection_id: null, conexao: null } }),
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviarTexto).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", "Oi pela API Oficial")
  })

  it("regras antigas e fluxos rodam juntos, na ordem de criação", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const fluxoEtiqueta: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
        { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-do-fluxo" }, posicao },
      ],
      ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
    }
    banco({
      automations: chain({
        data: [
          {
            id: "antiga-1",
            created_at: "2026-10-02T10:00:00Z",
            gatilho_tipo: "conversa_criada",
            gatilho_config: {},
            acao_tipo: "aplicar_etiqueta",
            acao_config: { label_id: "label-da-antiga" },
          },
        ],
      }),
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-01T10:00:00Z", fluxo: fluxoEtiqueta }] }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(upsert.mock.calls.map(([vinculo]) => vinculo.label_id)).toEqual(["label-do-fluxo", "label-da-antiga"])
  })

  it("fluxo com laço não roda, e as outras regras do evento rodam", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const fluxoComLaco: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
        { id: "a1", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "laço" }, posicao },
        { id: "a2", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "laço" }, posicao },
      ],
      ligacoes: [
        { de: "g", saida: "proximo", para: "a1" },
        { de: "a1", saida: "proximo", para: "a2" },
        { de: "a2", saida: "proximo", para: "a1" },
      ],
    }
    banco({
      automations: chain({
        data: [
          {
            id: "antiga-1",
            created_at: "2026-10-02T10:00:00Z",
            gatilho_tipo: "conversa_criada",
            gatilho_config: {},
            acao_tipo: "aplicar_etiqueta",
            acao_config: { label_id: "label-da-antiga" },
          },
        ],
      }),
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-01T10:00:00Z", fluxo: fluxoComLaco }] }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviarTexto).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it("regra antiga que já tem versão em fluxo não roda; a versão nova roda (B11-10)", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const fluxoEtiqueta: Fluxo = {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
        { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-da-nova" }, posicao },
      ],
      ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
    }
    banco({
      automations: chain({
        data: [
          {
            id: "antiga-1",
            created_at: "2026-10-02T10:00:00Z",
            gatilho_tipo: "conversa_criada",
            gatilho_config: {},
            acao_tipo: "aplicar_etiqueta",
            acao_config: { label_id: "label-da-antiga" },
          },
        ],
      }),
      // As duas consultas de automation_flows (regras e convertidas) leem esta linha
      automation_flows: chain({
        data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoEtiqueta, automation_id: "antiga-1" }],
      }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(upsert.mock.calls.map(([vinculo]) => vinculo.label_id)).toEqual(["label-da-nova"])
  })

  it("fluxo gravado fora do formato não roda", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automation_flows: chain({
        data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: { blocos: [{ tipo: "gatilho" }], ligacoes: [] } }],
      }),
      conversation_labels: { upsert },
    })

    await expect(processarAutomacoes(conversaCriada)).resolves.toBeUndefined()
    expect(upsert).not.toHaveBeenCalled()
    expect(mockEnviarTexto).not.toHaveBeenCalled()
  })

  it("erro de banco numa condição encerra só aquela regra", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automations: chain({
        data: [
          {
            id: "antiga-1",
            created_at: "2026-10-08T10:00:00Z",
            gatilho_tipo: "conversa_criada",
            gatilho_config: {},
            acao_tipo: "aplicar_etiqueta",
            acao_config: { label_id: "label-da-antiga" },
          },
        ],
      }),
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal }] }),
      conversations: chain({ data: null, error: { message: "timeout" } }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    // O fluxo parou na condição: nenhuma das duas mensagens saiu
    expect(mockEnviarTexto).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith(
      { conversation_id: "conv-1", label_id: "label-da-antiga" },
      { onConflict: "conversation_id,label_id" }
    )
  })
})
