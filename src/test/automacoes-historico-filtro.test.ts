// B22-19 — filtro de automação do histórico (achado M16 do QA das automações,
// 09/10/2026): as regras do filtro não dependem da lista filtrada, e erro do banco
// não vira lista vazia. A sessão e o banco são falsos.

import { describe, it, expect, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { listarExecucoes, regrasDoFiltroDoHistorico } from "@/app/(auth)/configuracoes/automacoes/actions"

/** Banco que responde por tabela; cada consulta termina num `await`. */
function sessao(respostas: Record<string, { data: unknown; error?: unknown }>) {
  const from = vi.fn((tabela: string) => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "gte", "order", "limit"]) obj[m] = vi.fn(() => obj)
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ error: null, ...respostas[tabela] }).then(resolve)
    return obj
  })
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

describe("B22-19 — regras do filtro do histórico", () => {
  it("as de agora e as excluídas com execução, sem repetir, com o nome mais recente", async () => {
    sessao({
      automation_flows: { data: [{ id: "r1", nome: "Boas-vindas" }] },
      automation_runs: {
        data: [
          { regra_id: "r1", regra_nome: "Boas-vindas" },
          { regra_id: "r9", regra_nome: "Antiga (nome novo)" },
          { regra_id: "r9", regra_nome: "Antiga" },
        ],
      },
    })
    expect(await regrasDoFiltroDoHistorico()).toEqual([
      { id: "r1", nome: "Boas-vindas" },
      { id: "r9", nome: "Antiga (nome novo) (excluída)" },
    ])
  })
})

describe("B22-19 — erro ao listar execuções", () => {
  it("erro do banco volta como erro, não como lista vazia", async () => {
    sessao({ automation_runs: { data: null, error: { message: "invalid input syntax for type uuid" } }, automation_flows: { data: [] } })
    expect(await listarExecucoes({ dias: 30, regraId: "abc" })).toEqual({
      execucoes: [],
      erro: "Não foi possível carregar o histórico. Tente novamente.",
    })
  })

  it("sem erro, devolve as execuções", async () => {
    sessao({ automation_runs: { data: [] }, automation_flows: { data: [] } })
    expect(await listarExecucoes({ dias: 30 })).toEqual({ execucoes: [] })
  })
})

describe("B28-02 — filtro por 'Esperando' e 'Cancelada'", () => {
  /** automation_runs que responde só às execuções do resultado filtrado, como o banco. */
  function sessaoComResultados(linhas: Array<{ id: string; resultado: string }>) {
    const pedidos: unknown[][] = []
    const from = vi.fn((tabela: string) => {
      const filtros: unknown[][] = []
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "gte", "order", "limit"]) obj[m] = vi.fn(() => obj)
      obj.eq = vi.fn((...args: unknown[]) => {
        filtros.push(args)
        if (tabela === "automation_runs") pedidos.push(args)
        return obj
      })
      obj.then = (resolve: (v: unknown) => void) => {
        const resultado = filtros.find((f) => f[0] === "resultado")?.[1]
        const data =
          tabela === "automation_runs"
            ? linhas
                .filter((l) => !resultado || l.resultado === resultado)
                .map((l) => ({ ...l, created_at: "2026-10-25T12:00:00Z", regra_id: "r1", regra_nome: "Lembrar", contact_id: null, evento: {}, motivo: null, caminho: [], contacts: null }))
            : []
        return Promise.resolve({ data, error: null }).then(resolve)
      }
      return obj
    })
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
    return pedidos
  }

  const linhas = [
    { id: "concluida-1", resultado: "concluida" },
    { id: "esperando-1", resultado: "esperando" },
    { id: "cancelada-1", resultado: "cancelada" },
  ]

  it("CA-B28-22: filtrando por 'Esperando', só aparecem as que estão esperando", async () => {
    const pedidos = sessaoComResultados(linhas)
    const { execucoes } = await listarExecucoes({ dias: 30, resultado: "esperando" })
    expect(pedidos).toContainEqual(["resultado", "esperando"])
    expect(execucoes.map((e) => [e.id, e.resultado])).toEqual([["esperando-1", "esperando"]])
  })

  it("CA-B28-22: 'Cancelada' também é um filtro aceito", async () => {
    sessaoComResultados(linhas)
    const { execucoes } = await listarExecucoes({ dias: 30, resultado: "cancelada" })
    expect(execucoes.map((e) => e.id)).toEqual(["cancelada-1"])
  })
})
