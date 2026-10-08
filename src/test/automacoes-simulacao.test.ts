// Testes do "Testar com um contato" (B11-10): o evento montado a partir do
// contato e o caminho percorrido com as verificações reais, sem ação nenhuma.
// O banco é falso: cada tabela devolve o que o teste mandou.

import { describe, it, expect, vi } from "vitest"
import type { ServiceClient } from "@/lib/automacoes/contexto"
import { eventoDaSimulacao, simularFluxo } from "@/lib/automacoes/simulacao"
import type { Fluxo } from "@/lib/fluxo-automacao"

type Resultado = { data?: unknown; error?: unknown }

/** Imita a chain do supabase-js e registra as gravações, que não podem acontecer. */
function banco(tabelas: Record<string, Resultado>) {
  const gravacoes: string[] = []
  /** Filtros pedidos, por tabela: `[tabela, método, coluna, valor]`. */
  const filtros: Array<[string, string, ...unknown[]]> = []
  const from = vi.fn((tabela: string) => {
    const resultado = tabelas[tabela] ?? { data: null }
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "order", "limit"]) obj[m] = vi.fn(() => obj)
    for (const m of ["eq", "neq", "in", "is"]) {
      obj[m] = vi.fn((...args: unknown[]) => {
        filtros.push([tabela, m, ...args])
        return obj
      })
    }
    for (const m of ["insert", "update", "upsert", "delete"]) {
      obj[m] = vi.fn(() => {
        gravacoes.push(`${m} ${tabela}`)
        return obj
      })
    }
    obj.maybeSingle = vi.fn(() => Promise.resolve(resultado))
    obj.single = vi.fn(() => Promise.resolve(resultado))
    obj.then = (resolve: (v: Resultado) => void) => Promise.resolve(resultado).then(resolve)
    return obj
  })
  return { supabase: { from } as unknown as ServiceClient, gravacoes, filtros }
}

const posicao = { x: 0, y: 0 }

const fluxoCard = (etapa = ""): Fluxo => ({
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "recompra", ...(etapa && { etapa }) }, posicao },
    { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "atendente", operador: "sem_atendente", valor: "" }], posicao },
    { id: "sim", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: "user-1" }, posicao },
    { id: "nao", tipo: "acao", acao: "enviar_mensagem", parametros: { texto: "oi" }, posicao },
  ],
  ligacoes: [
    { de: "g", saida: "proximo", para: "c" },
    { de: "c", saida: "sim", para: "sim" },
    { de: "c", saida: "nao", para: "nao" },
  ],
})

describe("eventoDaSimulacao", () => {
  it("card movido: usa o card do contato no funil do gatilho e a etapa do gatilho", async () => {
    const { supabase } = banco({ pipeline_cards: { data: { id: "card-9", etapa: "ativos" } } })
    const evento = await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxoCard("reposicao"))
    expect(evento).toEqual({
      tipo: "card_movido",
      workspaceId: "ws-1",
      contactId: "contato-1",
      cardId: "card-9",
      funil: "recompra",
      etapa: "reposicao",
    })
  })

  it("card movido para 'qualquer etapa': o card fica na etapa em que está", async () => {
    const { supabase } = banco({ pipeline_cards: { data: { id: "card-9", etapa: "ativos" } } })
    const evento = await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxoCard())
    expect(evento).toMatchObject({ etapa: "ativos" })
  })

  it("conversa criada: usa a conversa mais recente do contato, ou nenhuma", async () => {
    const fluxo: Fluxo = {
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao }],
      ligacoes: [],
    }
    const comConversa = banco({ conversations: { data: { id: "conv-3" } } })
    const semConversa = banco({ conversations: { data: null } })

    expect(await eventoDaSimulacao(comConversa.supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
      conversationId: "conv-3",
    })
    expect(await eventoDaSimulacao(semConversa.supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
      conversationId: "",
    })
  })

  it("gatilho que o motor não conhece (fluxo gravado por fora do editor) não tem evento", async () => {
    const { supabase } = banco({})
    const fluxo = {
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "gatilho_inexistente", parametros: {}, posicao }],
      ligacoes: [],
    } as unknown as Fluxo
    expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toBeNull()
  })

  it("B11-05: mensagem enviada pelo time usa a última mensagem enviada, sem as que falharam", async () => {
    const { supabase, filtros } = banco({
      conversations: { data: { id: "conv-3" } },
      messages: { data: { id: "msg-9", type: "texto", content: "Segue o catálogo", media_caption: null } },
    })
    const fluxo: Fluxo = {
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "mensagem_enviada_time", parametros: {}, posicao }],
      ligacoes: [],
    }
    expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toEqual({
      tipo: "mensagem_enviada_time",
      workspaceId: "ws-1",
      contactId: "contato-1",
      conversationId: "conv-3",
      messageId: "msg-9",
      tipoMensagem: "texto",
      texto: "Segue o catálogo",
    })
    expect(filtros.filter(([tabela]) => tabela === "messages")).toEqual([
      ["messages", "eq", "conversation_id", "conv-3"],
      ["messages", "eq", "direction", "enviada"],
      ["messages", "neq", "status", "falhou"],
    ])
  })

  describe("B11-04 — mensagem recebida: a última que o contato mandou", () => {
    const fluxo: Fluxo = {
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao }],
      ligacoes: [],
    }

    it("texto: o conteúdo da mensagem, na conversa mais recente", async () => {
      const { supabase } = banco({
        conversations: { data: { id: "conv-3" } },
        messages: { data: { id: "msg-1", type: "texto", content: "Quero o catálogo", media_caption: null } },
      })
      expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toEqual({
        tipo: "mensagem_recebida",
        workspaceId: "ws-1",
        contactId: "contato-1",
        conversationId: "conv-3",
        messageId: "msg-1",
        tipoMensagem: "texto",
        texto: "Quero o catálogo",
      })
    })

    it("mídia: a legenda, e não a URL do arquivo", async () => {
      const { supabase } = banco({
        conversations: { data: { id: "conv-3" } },
        messages: { data: { id: "msg-2", type: "imagem", content: "https://storage/x.jpg", media_caption: "segue o catálogo" } },
      })
      expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
        tipoMensagem: "imagem",
        texto: "segue o catálogo",
      })
    })

    it("resposta citada (desconhecido com texto) conta como texto; localização não tem texto do cliente", async () => {
      const citada = banco({
        conversations: { data: { id: "conv-3" } },
        messages: { data: { id: "msg-3", type: "desconhecido", content: "sim, esse", media_caption: null } },
      })
      const local = banco({
        conversations: { data: { id: "conv-3" } },
        messages: { data: { id: "msg-4", type: "localizacao", content: "📍 https://maps", media_caption: null } },
      })
      expect(await eventoDaSimulacao(citada.supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
        tipoMensagem: "texto",
        texto: "sim, esse",
      })
      expect(await eventoDaSimulacao(local.supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
        tipoMensagem: "localizacao",
        texto: "",
      })
    })

    it("sem conversa ou sem mensagem: texto e tipo vazios", async () => {
      const { supabase } = banco({ conversations: { data: null } })
      expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toMatchObject({
        conversationId: "",
        messageId: "",
        tipoMensagem: "",
        texto: "",
      })
    })

    it("o caminho segue pelo texto da mensagem, sem gravar nada", async () => {
      const comCondicao: Fluxo = {
        blocos: [
          ...fluxo.blocos,
          { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "texto_mensagem", operador: "contem", valor: "catálogo" }], posicao },
          { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "l-1" }, posicao },
        ],
        ligacoes: [
          { de: "g", saida: "proximo", para: "c" },
          { de: "c", saida: "sim", para: "a" },
        ],
      }
      const { supabase, gravacoes } = banco({
        conversations: { data: { id: "conv-3" } },
        messages: { data: { id: "msg-1", type: "texto", content: "QUERO O CATALOGO", media_caption: null } },
      })
      expect(await simularFluxo(supabase, "ws-1", "contato-1", comCondicao)).toEqual({
        blocos: ["g", "c", "a"],
        saidas: { c: "sim" },
      })
      expect(gravacoes).toEqual([])
    })
  })
})

describe("simularFluxo", () => {
  it("segue o caminho pelos dados reais do contato e não grava nada", async () => {
    // A conversa aberta do contato não tem atendente: a condição vale
    const { supabase, gravacoes } = banco({
      pipeline_cards: { data: { id: "card-9", etapa: "ativos" } },
      conversations: { data: { id: "conv-1", assigned_to: null } },
    })

    const resultado = await simularFluxo(supabase, "ws-1", "contato-1", fluxoCard("reposicao"))

    expect(resultado).toEqual({ blocos: ["g", "c", "sim"], saidas: { c: "sim" } })
    expect(gravacoes).toEqual([])
  })

  it("com atendente na conversa, vai pelo não", async () => {
    const { supabase } = banco({
      pipeline_cards: { data: { id: "card-9", etapa: "ativos" } },
      conversations: { data: { id: "conv-1", assigned_to: "user-7" } },
    })

    const resultado = await simularFluxo(supabase, "ws-1", "contato-1", fluxoCard())

    expect(resultado).toEqual({ blocos: ["g", "c", "nao"], saidas: { c: "nao" } })
  })
})

describe("eventoDaSimulacao dos gatilhos de tag, etiqueta e dado (B11-06)", () => {
  const so = (gatilho: string, parametros: Record<string, string>): Fluxo => ({
    blocos: [{ id: "g", tipo: "gatilho", gatilho: gatilho as "tag_adicionada", parametros, posicao }],
    ligacoes: [],
  })

  it("tag: o evento leva a tag do gatilho, normalizada", async () => {
    const { supabase } = banco({})
    expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", so("tag_adicionada", { tag: " VIP" }))).toEqual({
      tipo: "tag_adicionada",
      workspaceId: "ws-1",
      contactId: "contato-1",
      tag: "vip",
    })
  })

  it("etiqueta: a conversa mais recente do contato e a etiqueta do gatilho", async () => {
    const { supabase } = banco({ conversations: { data: { id: "conv-7" } } })
    expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", so("etiqueta_aplicada", { label_id: "l1" }))).toMatchObject({
      conversationId: "conv-7",
      labelId: "l1",
    })
  })

  it("dado: o campo e o valor do gatilho", async () => {
    const { supabase } = banco({})
    expect(
      await eventoDaSimulacao(supabase, "ws-1", "contato-1", so("dado_contato_alterado", { campo: "tipo", valor: "lojista" }))
    ).toMatchObject({ tipo: "dado_contato_alterado", campo: "tipo", valor: "lojista" })
  })
})
