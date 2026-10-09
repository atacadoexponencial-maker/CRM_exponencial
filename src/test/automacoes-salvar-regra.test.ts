// B22-02 — salvar uma regra que atribui a um atendente desativado é recusado
// (achado A3 do QA das automações, 09/10/2026). A sessão e o banco são falsos: o
// banco conta os perfis pedidos e só conta os ativos quando o filtro de status vem.

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Fluxo } from "@/lib/fluxo-automacao"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const posicao = { x: 0, y: 0 }
const ATIVO = "user-ativo"
const DESATIVADO = "user-desativado"

/** Perfis da empresa: os dois existem, só um está ativo. */
function bancoDaSessao() {
  const insert = vi.fn()
  const from = vi.fn((tabela: string) => {
    const filtros: Array<[string, unknown]> = []
    let ids: string[] = []
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "update", "order", "limit"]) obj[m] = vi.fn(() => obj)
    obj.eq = vi.fn((coluna: string, valor: unknown) => {
      filtros.push([coluna, valor])
      return obj
    })
    obj.in = vi.fn((_coluna: string, valores: string[]) => {
      ids = valores
      return obj
    })
    obj.insert = vi.fn((linha: unknown) => {
      insert(tabela, linha)
      return obj
    })
    obj.single = vi.fn(() => Promise.resolve({ data: { id: "regra-nova" }, error: null }))
    obj.then = (resolve: (v: unknown) => void) => {
      const soAtivos = filtros.some(([c, v]) => c === "status" && v === "active")
      const existentes = tabela === "profiles" ? ids.filter((id) => id === ATIVO || (!soAtivos && id === DESATIVADO)) : ids
      return Promise.resolve({ count: existentes.length, data: null, error: null }).then(resolve)
    }
    return obj
  })
  return { cliente: { from }, insert }
}

function fluxo(blocosExtras: Fluxo["blocos"], ligacoes: Fluxo["ligacoes"]): Fluxo {
  return {
    blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao }, ...blocosExtras],
    ligacoes,
  }
}

const atribuirA = (atendenteId: string) =>
  fluxo(
    [{ id: "a", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: atendenteId }, posicao }],
    [{ de: "g", saida: "proximo", para: "a" }]
  )

let banco: ReturnType<typeof bancoDaSessao>

beforeEach(() => {
  banco = bancoDaSessao()
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: banco.cliente,
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
})

const salvar = (f: Fluxo) => salvarRegra({ id: null, nome: "Regra", fluxo: f, repeticao: { modo: "sempre" } })

describe("B22-02 — salvar regra que atribui atendente", () => {
  it("atendente ativo: salva", async () => {
    expect(await salvar(atribuirA(ATIVO))).toEqual({ id: "regra-nova" })
  })

  it("atendente desativado: recusa e não grava", async () => {
    expect(await salvar(atribuirA(DESATIVADO))).toEqual({ erro: "Um atendente escolhido está desativado. Escolha outro." })
    expect(banco.insert).not.toHaveBeenCalled()
  })

  it("atendente desativado só numa condição ('atendente é'): salva", async () => {
    const f = fluxo(
      [
        {
          id: "c",
          tipo: "condicao",
          verificacoes: [{ id: "v", tipo: "atendente", operador: "e", valor: DESATIVADO }],
          posicao,
        },
        { id: "a", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: ATIVO }, posicao },
      ],
      [
        { de: "g", saida: "proximo", para: "c" },
        { de: "c", saida: "sim", para: "a" },
      ]
    )
    expect(await salvar(f)).toEqual({ id: "regra-nova" })
  })
})
