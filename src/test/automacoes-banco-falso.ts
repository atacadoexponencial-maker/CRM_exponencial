// Banco falso dos testes do motor de automações: cada tabela devolve o que o
// teste mandou, e toda chamada fica registrada para conferir o que foi gravado.
// Não é um arquivo de teste; é importado pelos testes de ações e verificações.

import { vi } from "vitest"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "@/lib/automacoes/contexto"

/**
 * `lista`: o que um select aguardado devolve; `um`: o que `maybeSingle`/`single`
 * devolve. `umEmOrdem`: uma resposta por chamada de `maybeSingle`/`single`, na
 * ordem, para tabelas consultadas mais de uma vez.
 */
type Tabela = { lista?: unknown; um?: unknown; umEmOrdem?: unknown[]; erro?: { code?: string; message?: string } }
type Chamada = { tabela: string; metodo: string; args: unknown[] }
/** O que uma função do banco (`rpc`) devolve. A chamada fica em `chamadas` com tabela `rpc:<nome>`. */
type Funcao = { data?: unknown; erro?: { code?: string; message?: string } }

export function banco(tabelas: Record<string, Tabela>, funcoes: Record<string, Funcao> = {}) {
  const chamadas: Chamada[] = []
  const usadas: Record<string, number> = {}
  const from = vi.fn((tabela: string) => {
    const config = tabelas[tabela] ?? {}
    const erro = config.erro ?? null
    const obj: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "in", "is", "not", "order", "limit", "insert", "update", "upsert", "delete"]) {
      obj[metodo] = vi.fn((...args: unknown[]) => {
        chamadas.push({ tabela, metodo, args })
        return obj
      })
    }
    const proximo = () => {
      if (!config.umEmOrdem) return config.um ?? null
      const i = usadas[tabela] ?? 0
      usadas[tabela] = i + 1
      return config.umEmOrdem[i] ?? null
    }
    obj.maybeSingle = vi.fn(() => Promise.resolve({ data: proximo(), error: erro }))
    obj.single = vi.fn(() => Promise.resolve({ data: proximo(), error: erro }))
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: config.lista ?? null, error: erro }).then(resolve)
    return obj
  })
  const rpc = vi.fn((nome: string, args: unknown) => {
    chamadas.push({ tabela: `rpc:${nome}`, metodo: "rpc", args: [args] })
    return Promise.resolve({ data: funcoes[nome]?.data ?? null, error: funcoes[nome]?.erro ?? null })
  })
  const contexto = (gatilho: GatilhoAutomacao): ContextoDaExecucao => ({
    supabase: { from, rpc } as unknown as ServiceClient,
    gatilho,
  })
  const gravacoes = (tabela: string) =>
    chamadas.filter((c) => c.tabela === tabela && ["insert", "update", "upsert", "delete"].includes(c.metodo))
  const filtros = (tabela: string) => chamadas.filter((c) => c.tabela === tabela && c.metodo === "eq").map((c) => c.args)
  return { contexto, chamadas, gravacoes, filtros }
}
