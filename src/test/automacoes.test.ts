// Testes unitários do motor de automações — o service client é mockado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))

// Só o envio é falso; buscarConversaAberta continua a de verdade, sobre o banco mockado.
// Desde a B11-07, as automações enviam por `enviarWhatsAppComMotivo` (texto ou mídia).
vi.mock("@/lib/whatsapp-envio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp-envio")>()),
  enviarWhatsAppComMotivo: vi.fn().mockResolvedValue({ ok: true }),
}))

import { createServiceClient } from "@/integrations/supabase/service"
import { gatilhoCorresponde, processarAutomacoes } from "@/lib/automacoes"
import type { AcaoTipo, Fluxo, GatilhoTipo } from "@/lib/fluxo-automacao"
import { enviarWhatsAppComMotivo } from "@/lib/whatsapp-envio"

const mockCreateServiceClient = vi.mocked(createServiceClient)
const mockEnviar = vi.mocked(enviarWhatsAppComMotivo)

type Resultado = { data?: unknown; error?: unknown }

// Builder mínimo que imita a chain do supabase-js: métodos retornam o próprio
// objeto e o await final resolve com o resultado configurado.
function chain(resultado: Resultado) {
  const obj: Record<string, unknown> = {}
  const self = () => obj
  for (const m of ["select", "eq", "neq", "gte", "in", "not", "order", "limit", "update", "insert"]) {
    obj[m] = vi.fn(self)
  }
  obj.single = vi.fn(() => Promise.resolve(resultado))
  obj.maybeSingle = vi.fn(() => Promise.resolve(resultado))
  obj.then = (resolve: (v: Resultado) => void) => Promise.resolve(resultado).then(resolve)
  return obj
}

/** Linha de `automation_flows` com um fluxo de dois blocos: gatilho → ação. */
function regraDeDoisBlocos(
  gatilho: GatilhoTipo,
  parametrosDoGatilho: Record<string, string>,
  acao: AcaoTipo,
  parametrosDaAcao: Record<string, string>,
  linha: { id?: string; created_at?: string } = {}
) {
  const posicao = { x: 0, y: 0 }
  const fluxo: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho, parametros: parametrosDoGatilho, posicao },
      { id: "a", tipo: "acao", acao, parametros: parametrosDaAcao, posicao },
    ],
    ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
  }
  return { id: "regra-1", nome: "Regra", created_at: "2026-10-01T10:00:00Z", fluxo, repeticao: { modo: "sempre" }, ...linha }
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
        if (table === "automation_flows") {
          return chain({ data: [regraDeDoisBlocos("conversa_criada", {}, "aplicar_etiqueta", { label_id: "label-1" })] })
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
        if (table === "automation_flows") {
          return chain({
            data: [
              regraDeDoisBlocos("card_movido", { funil: "entrada", etapa: "negociacao" }, "aplicar_etiqueta", {
                label_id: "label-1",
              }),
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
        if (table === "automation_flows") {
          return chain({ data: [regraDeDoisBlocos("card_movido", {}, "atribuir_atendente", { atendente_id: "user-7" })] })
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
    expect(mockEnviar).toHaveBeenCalledTimes(1)
    expect(mockEnviar).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", { tipo: "texto", texto: "Oi pelo canal direto" }, "conv-1")
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
    expect(mockEnviar).toHaveBeenCalledTimes(1)
    expect(mockEnviar).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", { tipo: "texto", texto: "Oi pela API Oficial" }, "conv-1")
  })

  it("conversa sem número gravado: o canal não vale e o caminho vai pelo não", async () => {
    banco({
      automation_flows: chain({ data: [{ id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal }] }),
      conversations: chain({ data: { whatsapp_connection_id: null, conexao: null } }),
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviar).toHaveBeenCalledWith(expect.anything(), "ws-1", "contact-1", { tipo: "texto", texto: "Oi pela API Oficial" }, "conv-1")
  })

  it("as regras do evento rodam na ordem de criação", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automation_flows: chain({
        data: [
          regraDeDoisBlocos("conversa_criada", {}, "aplicar_etiqueta", { label_id: "label-da-segunda" }, {
            id: "fluxo-2",
            created_at: "2026-10-02T10:00:00Z",
          }),
          regraDeDoisBlocos("conversa_criada", {}, "aplicar_etiqueta", { label_id: "label-da-primeira" }, {
            id: "fluxo-1",
            created_at: "2026-10-01T10:00:00Z",
          }),
        ],
      }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(upsert.mock.calls.map(([vinculo]) => vinculo.label_id)).toEqual(["label-da-primeira", "label-da-segunda"])
  })

  it("não consulta a tabela das regras da primeira versão (B11-13)", async () => {
    const tabelas: string[] = []
    mockCreateServiceClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false }),
      from: vi.fn((tabela: string) => {
        tabelas.push(tabela)
        return chain({ data: null })
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    await processarAutomacoes(conversaCriada)

    expect(tabelas).toContain("automation_flows")
    expect(tabelas).not.toContain("automations")
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
      automation_flows: chain({
        data: [
          { id: "fluxo-1", created_at: "2026-10-01T10:00:00Z", fluxo: fluxoComLaco },
          regraDeDoisBlocos("conversa_criada", {}, "aplicar_etiqueta", { label_id: "label-da-outra" }, {
            id: "fluxo-2",
            created_at: "2026-10-02T10:00:00Z",
          }),
        ],
      }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviar).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledTimes(1)
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
    expect(mockEnviar).not.toHaveBeenCalled()
  })

  it("erro de banco numa condição encerra só aquela regra", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({
      automation_flows: chain({
        data: [
          { id: "fluxo-1", created_at: "2026-10-07T10:00:00Z", fluxo: fluxoPorCanal },
          regraDeDoisBlocos("conversa_criada", {}, "aplicar_etiqueta", { label_id: "label-da-outra" }, {
            id: "fluxo-2",
            created_at: "2026-10-08T10:00:00Z",
          }),
        ],
      }),
      conversations: chain({ data: null, error: { message: "timeout" } }),
      conversation_labels: { upsert },
    })

    await processarAutomacoes(conversaCriada)

    // O fluxo parou na condição: nenhuma das duas mensagens saiu
    expect(mockEnviar).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith(
      { conversation_id: "conv-1", label_id: "label-da-outra" },
      { onConflict: "conversation_id,label_id" }
    )
  })
})

describe("histórico e proteção de repetição (B11-03)", () => {
  const posicao = { x: 0, y: 0 }
  const conversaCriada = {
    tipo: "conversa_criada" as const,
    workspaceId: "ws-1",
    contactId: "contact-1",
    conversationId: "conv-1",
  }

  // Gatilho → aplicar etiqueta → enviar mensagem
  const fluxo: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { id: "etiqueta", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "label-1" }, posicao },
      { id: "msg", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "Oi" }, posicao },
    ],
    ligacoes: [
      { de: "g", saida: "proximo", para: "etiqueta" },
      { de: "etiqueta", saida: "proximo", para: "msg" },
    ],
  }

  /** automation_runs falso: a execução anterior que a proteção acha, e as linhas gravadas. */
  function historico(anterior: unknown = null, erro: unknown = null) {
    const gravadas: Array<Record<string, unknown>> = []
    const filtros: unknown[][] = []
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "gte", "limit"]) {
      obj[m] = vi.fn((...args: unknown[]) => {
        filtros.push([m, ...args])
        return obj
      })
    }
    obj.maybeSingle = vi.fn(() => Promise.resolve({ data: anterior, error: erro }))
    obj.insert = vi.fn((linha: Record<string, unknown>) => {
      gravadas.push(linha)
      return Promise.resolve({ error: null })
    })
    return { obj, gravadas, filtros }
  }

  function banco(tabelas: Record<string, unknown>) {
    mockCreateServiceClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false }),
      from: vi.fn((tabela: string) => tabelas[tabela] ?? chain({ data: null })),
    } as unknown as ReturnType<typeof createServiceClient>)
  }

  const regra = (repeticao: unknown) =>
    chain({ data: [{ id: "regra-1", nome: "Boas-vindas", created_at: "2026-10-07T10:00:00Z", fluxo, repeticao }] })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("grava a execução concluída com o caminho, o evento e o nome da regra", async () => {
    const h = historico()
    banco({
      automation_flows: regra({ modo: "sempre" }),
      automation_runs: h.obj,
      conversation_labels: { upsert: vi.fn().mockResolvedValue({ error: null }) },
    })

    await processarAutomacoes(conversaCriada)

    expect(h.gravadas).toHaveLength(1)
    expect(h.gravadas[0]).toMatchObject({
      workspace_id: "ws-1",
      regra_id: "regra-1",
      regra_origem: "fluxo",
      regra_nome: "Boas-vindas",
      contact_id: "contact-1",
      evento: { tipo: "conversa_criada", conversationId: "conv-1" },
      resultado: "concluida",
      motivo: null,
    })
    // "Sempre" nem consulta a execução anterior
    expect(h.filtros.some((f) => f[0] === "neq")).toBe(false)
    const caminho = h.gravadas[0].caminho as Array<Record<string, unknown>>
    expect(caminho.map((p) => [(p.bloco as { id: string }).id, p.ok])).toEqual([
      ["g", undefined],
      ["etiqueta", true],
      ["msg", true],
    ])
  })

  it("ação que falha fica com o motivo, a seguinte roda, e a execução fica 'falhou'", async () => {
    const h = historico()
    banco({
      automation_flows: regra({ modo: "sempre" }),
      automation_runs: h.obj,
      conversation_labels: { upsert: vi.fn().mockResolvedValue({ error: { code: "23503" } }) },
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviar).toHaveBeenCalledTimes(1)
    expect(h.gravadas[0].resultado).toBe("falhou")
    const caminho = h.gravadas[0].caminho as Array<Record<string, unknown>>
    expect(caminho[1]).toMatchObject({ ok: false, motivo: "A etiqueta não existe mais" })
    expect(caminho[2]).toMatchObject({ ok: true })
  })

  it("'uma vez por contato' com execução anterior: ignora, grava o motivo e não executa nada", async () => {
    const h = historico({ id: "execucao-anterior" })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    banco({ automation_flows: regra({ modo: "uma_vez_por_contato" }), automation_runs: h.obj, conversation_labels: { upsert } })

    await processarAutomacoes(conversaCriada)

    expect(upsert).not.toHaveBeenCalled()
    expect(mockEnviar).not.toHaveBeenCalled()
    expect(h.gravadas[0]).toMatchObject({
      resultado: "ignorada",
      motivo: "Já rodou para este contato (proteção: uma vez por contato)",
      caminho: [],
    })
    // Procura só execuções que contaram: ignorada não gasta a vez
    expect(h.filtros).toContainEqual(["neq", "resultado", "ignorada"])
    expect(h.filtros).toContainEqual(["eq", "contact_id", "contact-1"])
  })

  it("'uma vez por contato' sem execução anterior: roda", async () => {
    const h = historico(null)
    banco({
      automation_flows: regra({ modo: "uma_vez_por_contato" }),
      automation_runs: h.obj,
      conversation_labels: { upsert: vi.fn().mockResolvedValue({ error: null }) },
    })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviar).toHaveBeenCalledTimes(1)
    expect(h.gravadas[0].resultado).toBe("concluida")
  })

  it("'a cada N horas' procura só a janela das últimas N horas", async () => {
    const h = historico({ id: "recente" })
    banco({ automation_flows: regra({ modo: "a_cada_horas", horas: 6 }), automation_runs: h.obj })

    const antes = Date.now()
    await processarAutomacoes(conversaCriada)

    const gte = h.filtros.find((f) => f[0] === "gte")
    expect(gte?.[1]).toBe("created_at")
    const desde = new Date(gte?.[2] as string).getTime()
    expect(antes - desde).toBeGreaterThanOrEqual(6 * 3_600_000 - 1000)
    expect(antes - desde).toBeLessThanOrEqual(6 * 3_600_000 + 1000)
    expect(h.gravadas[0]).toMatchObject({ resultado: "ignorada", motivo: expect.stringContaining("6 horas") })
  })

  it("erro ao conferir a proteção: não roda e grava 'falhou'", async () => {
    const h = historico(null, { message: "timeout" })
    banco({ automation_flows: regra({ modo: "uma_vez_por_contato" }), automation_runs: h.obj })

    await processarAutomacoes(conversaCriada)

    expect(mockEnviar).not.toHaveBeenCalled()
    expect(h.gravadas[0]).toMatchObject({ resultado: "falhou", motivo: "Não foi possível conferir a proteção de repetição" })
  })
})

describe("gatilhos de tag, etiqueta e dado do contato (B11-06)", () => {
  const posicao = { x: 0, y: 0 }
  const bloco = (gatilho: GatilhoTipo, parametros: Record<string, string> = {}) =>
    ({ id: "g", tipo: "gatilho", gatilho, parametros, posicao }) as const
  const tag = (t: string) => ({ tipo: "tag_adicionada" as const, workspaceId: "ws", contactId: "c", tag: t })
  const etiqueta = (labelId: string) => ({
    tipo: "etiqueta_aplicada" as const,
    workspaceId: "ws",
    contactId: "c",
    conversationId: "conv",
    labelId,
  })
  const dado = (campo: string, valor: string) => ({
    tipo: "dado_contato_alterado" as const,
    workspaceId: "ws",
    contactId: "c",
    campo,
    valor,
  })

  it("tag: a do gatilho (normalizada) ou qualquer uma", () => {
    expect(gatilhoCorresponde(bloco("tag_adicionada", { tag: "VIP" }), tag("vip"))).toBe(true)
    expect(gatilhoCorresponde(bloco("tag_adicionada", { tag: "vip" }), tag("atacado"))).toBe(false)
    expect(gatilhoCorresponde(bloco("tag_adicionada"), tag("atacado"))).toBe(true)
  })

  it("etiqueta: a do gatilho ou qualquer uma", () => {
    expect(gatilhoCorresponde(bloco("etiqueta_aplicada", { label_id: "l1" }), etiqueta("l1"))).toBe(true)
    expect(gatilhoCorresponde(bloco("etiqueta_aplicada", { label_id: "l1" }), etiqueta("l2"))).toBe(false)
    expect(gatilhoCorresponde(bloco("etiqueta_aplicada"), etiqueta("l2"))).toBe(true)
  })

  it("dado: o campo precisa ser o mesmo; o valor, só quando o gatilho tem um", () => {
    expect(gatilhoCorresponde(bloco("dado_contato_alterado", { campo: "tipo" }), dado("tipo", "lojista"))).toBe(true)
    expect(gatilhoCorresponde(bloco("dado_contato_alterado", { campo: "tipo", valor: "lojista" }), dado("tipo", "lojista"))).toBe(true)
    expect(gatilhoCorresponde(bloco("dado_contato_alterado", { campo: "tipo", valor: "lojista" }), dado("tipo", "revendedor"))).toBe(false)
    expect(gatilhoCorresponde(bloco("dado_contato_alterado", { campo: "tipo" }), dado("cidade", "Natal"))).toBe(false)
  })

  it("gatilho de outro tipo não casa", () => {
    expect(gatilhoCorresponde(bloco("tag_adicionada"), etiqueta("l1"))).toBe(false)
  })
})
