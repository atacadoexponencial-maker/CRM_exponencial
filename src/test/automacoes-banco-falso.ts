// Banco falso dos testes do motor de automações: cada tabela devolve o que o
// teste mandou, e toda chamada fica registrada para conferir o que foi gravado.
// Não é um arquivo de teste; é importado pelos testes de ações e verificações.

import { vi } from "vitest"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "@/lib/automacoes/contexto"

/** `lista`: o que um select aguardado devolve; `um`: o que `maybeSingle`/`single` devolve. */
type Tabela = { lista?: unknown; um?: unknown; erro?: { code?: string; message?: string } }
type Chamada = { tabela: string; metodo: string; args: unknown[] }

export function banco(tabelas: Record<string, Tabela>) {
  const chamadas: Chamada[] = []
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
    obj.maybeSingle = vi.fn(() => Promise.resolve({ data: config.um ?? null, error: erro }))
    obj.single = vi.fn(() => Promise.resolve({ data: config.um ?? null, error: erro }))
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: config.lista ?? null, error: erro }).then(resolve)
    return obj
  })
  const contexto = (gatilho: GatilhoAutomacao): ContextoDaExecucao => ({
    supabase: { from } as unknown as ServiceClient,
    gatilho,
  })
  const gravacoes = (tabela: string) =>
    chamadas.filter((c) => c.tabela === tabela && ["insert", "update", "upsert", "delete"].includes(c.metodo))
  const filtros = (tabela: string) => chamadas.filter((c) => c.tabela === tabela && c.metodo === "eq").map((c) => c.args)
  return { contexto, chamadas, gravacoes, filtros }
}
