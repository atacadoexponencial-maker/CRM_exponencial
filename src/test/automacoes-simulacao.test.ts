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
  const from = vi.fn((tabela: string) => {
    const resultado = tabelas[tabela] ?? { data: null }
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) obj[m] = vi.fn(() => obj)
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
  return { supabase: { from } as unknown as ServiceClient, gravacoes }
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

  it("gatilho que o motor ainda não executa não tem evento", async () => {
    const { supabase } = banco({})
    const fluxo: Fluxo = {
      blocos: [{ id: "g", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao }],
      ligacoes: [],
    }
    expect(await eventoDaSimulacao(supabase, "ws-1", "contato-1", fluxo)).toBeNull()
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
