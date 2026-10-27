// B46-08: a automação nova nasce desligada, e editar uma ligada não a desliga.
// A sessão e o banco são falsos: o banco guarda o que o servidor grava.

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Fluxo } from "@/lib/fluxo-automacao"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const posicao = { x: 0, y: 0 }
const FLUXO: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
    { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
}

function bancoDaSessao() {
  const gravacoes: Array<{ tabela: string; tipo: "insert" | "update"; linha: Record<string, unknown> }> = []
  const from = vi.fn((tabela: string) => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "order", "limit", "lt", "neq"]) obj[m] = vi.fn(() => obj)
    obj.insert = vi.fn((linha: Record<string, unknown>) => {
      gravacoes.push({ tabela, tipo: "insert", linha })
      return obj
    })
    obj.update = vi.fn((linha: Record<string, unknown>) => {
      gravacoes.push({ tabela, tipo: "update", linha })
      return obj
    })
    obj.single = vi.fn(() => Promise.resolve({ data: { id: "regra-nova" }, error: null }))
    obj.maybeSingle = vi.fn(() => Promise.resolve({ data: { id: "regra-1" }, error: null }))
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ count: 0, data: [], error: null }).then(resolve)
    return obj
  })
  return { cliente: { from }, gravacoes }
}

let banco: ReturnType<typeof bancoDaSessao>

beforeEach(() => {
  banco = bancoDaSessao()
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: banco.cliente,
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
})

const daRegra = () => banco.gravacoes.filter((g) => g.tabela === "automation_flows")

describe("B46-08: automação nova nasce desligada", () => {
  it("CA-B46-19: salvar uma automação nova grava com ativa falso", async () => {
    expect(await salvarRegra({ id: null, nome: "Nova", fluxo: FLUXO, repeticao: { modo: "uma_vez_por_contato" } })).toEqual({ id: "regra-nova" })
    const [gravada] = daRegra()
    expect(gravada.tipo).toBe("insert")
    expect(gravada.linha.ativa).toBe(false)
  })

  it("CA-B46-21: salvar uma automação que já existe não mexe no ligada/desligada", async () => {
    expect(await salvarRegra({ id: "regra-1", nome: "Nome novo", fluxo: FLUXO, repeticao: { modo: "uma_vez_por_contato" } })).toEqual({ id: "regra-1" })
    const [gravada] = daRegra()
    expect(gravada.tipo).toBe("update")
    expect(gravada.linha.nome).toBe("Nome novo")
    expect("ativa" in gravada.linha).toBe(false)
  })
})
