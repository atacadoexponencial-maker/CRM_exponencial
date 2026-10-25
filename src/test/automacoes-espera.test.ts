// B28-02 — bloco "esperar" por tempo, no motor: as ações antes do bloco rodam e a
// execução fica esperando; o relógio a segue pela saída do tempo; a lixeira e a
// proteção conhecem a espera. O service client é falso.

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirContatoExcluido: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import { processarAutomacoes } from "@/lib/automacoes"
import { CONTATO_NA_LIXEIRA, seguirEsperasVencidas } from "@/lib/automacoes/esperas"
import { JA_ESPERANDO, type PassoGravado } from "@/lib/automacoes/execucoes"
import { excluirContato } from "@/app/(auth)/contatos/lixeira/actions"
import type { Fluxo } from "@/lib/fluxo-automacao"

const HORA = 3_600_000
const posicao = { x: 0, y: 0 }

// gatilho → etiqueta A → esperar 1 hora → etiqueta B
const fluxo: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
    { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "etiqueta-a" }, posicao },
    {
      id: "e",
      tipo: "espera",
      tempo: { quantidade: "1", unidade: "horas" },
      recebeuMensagem: false,
      atendenteEnviou: false,
      limite: "30_dias",
      posicao,
    },
    { id: "b", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "etiqueta-b" }, posicao },
  ],
  ligacoes: [
    { de: "g", saida: "proximo", para: "a" },
    { de: "a", saida: "proximo", para: "e" },
    { de: "e", saida: "tempo", para: "b" },
  ],
}

const evento = { tipo: "conversa_criada" as const, workspaceId: "ws-1", contactId: "contato-1", conversationId: "conv-1" }

/**
 * Banco falso. `esperando`: o contato já espera na regra. `vencidas`: o que a
 * função de reivindicar entrega. `naLixeira`: o que `contato_na_lixeira` responde.
 */
function montarBanco(opcoes: { esperando?: boolean; vencidas?: unknown[]; naLixeira?: boolean } = {}) {
  const inseridas: Array<Record<string, unknown>> = []
  const atualizadas: Array<{ tabela: string; valores: Record<string, unknown>; filtros: unknown[][] }> = []
  const etiquetas: string[] = []
  let entregou = false

  const from = vi.fn((tabela: string) => {
    const filtros: unknown[][] = []
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "is", "not", "in", "contains", "gte", "order", "limit"]) {
      obj[m] = vi.fn((...args: unknown[]) => {
        filtros.push([m, ...args])
        return obj
      })
    }
    const resposta = () => {
      if (tabela === "automation_flows") {
        return { id: "regra-1", nome: "Lembrar depois", ativa: true, fluxo, created_at: "2026-10-01T10:00:00Z", repeticao: { modo: "sempre" } }
      }
      if (tabela === "automation_runs") {
        const procuraEspera = filtros.some((f) => f[0] === "eq" && f[1] === "resultado" && f[2] === "esperando")
        return procuraEspera && opcoes.esperando ? { id: "esperando-1" } : null
      }
      if (tabela === "contacts") return { id: "contato-1", name: "Bruno", phone_number: "5511999990000" }
      return null
    }
    obj.maybeSingle = vi.fn(() => Promise.resolve({ data: resposta(), error: null }))
    obj.then = (resolve: (v: unknown) => void) =>
      Promise.resolve({ data: tabela === "automation_flows" ? [resposta()] : [], error: null }).then(resolve)
    obj.insert = vi.fn((linha: Record<string, unknown>) => {
      inseridas.push(linha)
      return Promise.resolve({ error: null })
    })
    obj.update = vi.fn((valores: Record<string, unknown>) => {
      atualizadas.push({ tabela, valores, filtros })
      return obj
    })
    obj.upsert = vi.fn((linha: { label_id: string }) => {
      etiquetas.push(linha.label_id)
      return Promise.resolve({ error: null })
    })
    return obj
  })
  const rpc = vi.fn((nome: string) => {
    if (nome === "contato_na_lixeira") return Promise.resolve({ data: opcoes.naLixeira ?? false, error: null })
    if (nome === "reivindicar_esperas_vencidas") {
      // Entrega uma vez; na segunda chamada a fila está vazia
      const data = entregou ? [] : (opcoes.vencidas ?? [])
      entregou = true
      return Promise.resolve({ data, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
  vi.mocked(createServiceClient).mockReturnValue({ from, rpc } as unknown as ReturnType<typeof createServiceClient>)
  return { inseridas, atualizadas, etiquetas, rpc }
}

/** A execução esperando como o motor grava: o caminho até o bloco, desde uma hora atrás. */
function esperandoHaUmaHora() {
  const desde = new Date(Date.now() - HORA).toISOString()
  const caminho: PassoGravado[] = [
    { bloco: fluxo.blocos[0] },
    { bloco: fluxo.blocos[1], ok: true },
    { bloco: fluxo.blocos[2], desde },
  ]
  return { id: "execucao-1", regra_id: "regra-1", contact_id: "contato-1", gatilho: evento, caminho }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("B28-02 — o contato esperando no bloco", () => {
  it("CA-B28-06: a ação antes do bloco roda, a de depois espera, e a execução fica esperando desde o disparo", async () => {
    const banco = montarBanco()
    const antes = Date.now()

    await processarAutomacoes(evento)

    expect(banco.etiquetas).toEqual(["etiqueta-a"])
    expect(banco.inseridas).toHaveLength(1)
    const linha = banco.inseridas[0]
    expect(linha).toMatchObject({ resultado: "esperando", regra_id: "regra-1", contact_id: "contato-1", gatilho: evento })
    const caminho = linha.caminho as PassoGravado[]
    expect(caminho.map((p) => p.bloco.id)).toEqual(["g", "a", "e"])
    const desde = new Date(caminho[2].desde!).getTime()
    expect(desde).toBeGreaterThanOrEqual(antes)
    expect(desde).toBeLessThanOrEqual(Date.now())
    // O relógio segue uma hora depois de o contato entrar no bloco
    expect(new Date(linha.retomar_em as string).getTime() - desde).toBe(HORA)
  })

  it("CA-B28-07: passado o tempo, o relógio segue pela saída do tempo e a mesma execução fica concluída", async () => {
    const banco = montarBanco({ vencidas: [esperandoHaUmaHora()] })

    expect(await seguirEsperasVencidas()).toBe(1)

    expect(banco.etiquetas).toEqual(["etiqueta-b"])
    expect(banco.inseridas).toHaveLength(0)
    const atualizacao = banco.atualizadas.find((a) => a.tabela === "automation_runs")!
    expect(atualizacao.filtros).toContainEqual(["eq", "id", "execucao-1"])
    expect(atualizacao.valores).toMatchObject({ resultado: "concluida", retomar_em: null, retomada_em: null })
    const caminho = atualizacao.valores.caminho as PassoGravado[]
    expect(caminho.map((p) => [p.bloco.id, p.saida ?? null, p.ok ?? null])).toEqual([
      ["g", null, null],
      ["a", null, true],
      ["e", "tempo", null],
      ["b", null, true],
    ])
    expect(caminho[2].em).toBeTruthy()
  })
})

describe("B28-02 — lixeira", () => {
  it("CA-B28-16: mandar o contato para a lixeira cancela as esperas dele", async () => {
    const banco = montarBanco()
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: (createServiceClient as unknown as () => unknown)(),
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

    expect(await excluirContato("contato-1")).toEqual({ ok: true })

    const cancelamento = banco.atualizadas.find((a) => a.tabela === "automation_runs")!
    expect(cancelamento.valores).toMatchObject({ resultado: "cancelada", motivo: CONTATO_NA_LIXEIRA, retomar_em: null })
    expect(cancelamento.filtros).toEqual(
      expect.arrayContaining([
        ["eq", "workspace_id", "ws-1"],
        ["eq", "contact_id", "contato-1"],
        ["eq", "resultado", "esperando"],
      ])
    )
  })

  it("CA-B28-16: a espera vencida de contato na lixeira é cancelada sem rodar nenhuma ação", async () => {
    const banco = montarBanco({ vencidas: [esperandoHaUmaHora()], naLixeira: true })

    await seguirEsperasVencidas()

    expect(banco.etiquetas).toEqual([])
    const atualizacao = banco.atualizadas.find((a) => a.tabela === "automation_runs")!
    expect(atualizacao.valores).toMatchObject({ resultado: "cancelada", motivo: CONTATO_NA_LIXEIRA })
  })
})

describe("B28-02 — proteção", () => {
  it("CA-B28-17: com repetição 'sempre', o contato esperando não recomeça a regra", async () => {
    const banco = montarBanco({ esperando: true })

    await processarAutomacoes(evento)

    expect(banco.etiquetas).toEqual([])
    expect(banco.inseridas).toHaveLength(1)
    expect(banco.inseridas[0]).toMatchObject({ resultado: "ignorada", motivo: JA_ESPERANDO })
    expect(JA_ESPERANDO).toBe("O contato já está esperando nesta regra")
  })
})
