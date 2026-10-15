// B22-44 — actions chamadas por fora da tela com entrada malformada (baixo do QA
// das automações, 09/10/2026): respondem "Pedido inválido", em vez de erro 500.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import {
  alternarRegra,
  buscarContatosTeste,
  duplicarRegra,
  excluirRegra,
  guardarArquivoDaAutomacao,
  listarExecucoes,
  salvarRegra,
  simularRegra,
} from "@/app/(auth)/configuracoes/automacoes/actions"

const INVALIDO = { erro: "Pedido inválido. Recarregue a página." }
// Para chamar as actions como alguém de fora chamaria, sem o tipo da tela
const qualquer = <T,>(valor: unknown) => valor as T

beforeEach(() => {
  const obj: Record<string, unknown> = {}
  for (const m of ["select", "eq", "gte", "order", "limit", "is", "in"]) obj[m] = vi.fn(() => obj)
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve)
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from: vi.fn(() => obj) },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
})

describe("B22-44 — entrada malformada", () => {
  it("salvar sem objeto, com nome que não é texto ou id estranho", async () => {
    expect(await salvarRegra(qualquer(null))).toEqual(INVALIDO)
    expect(await salvarRegra(qualquer({ id: null, nome: 5, fluxo: {}, repeticao: {} }))).toEqual(INVALIDO)
    expect(await salvarRegra(qualquer({ id: 7, nome: "x", fluxo: {}, repeticao: {} }))).toEqual(INVALIDO)
  })

  it("alternar, duplicar e excluir com id que não é texto", async () => {
    expect(await alternarRegra(qualquer(5), qualquer("sim"))).toEqual(INVALIDO)
    expect(await duplicarRegra(qualquer({}))).toEqual(INVALIDO)
    expect(await excluirRegra(qualquer(null))).toEqual(INVALIDO)
  })

  it("arquivo que não é formulário e teste sem contato", async () => {
    expect(await guardarArquivoDaAutomacao(qualquer("arquivo"))).toEqual(INVALIDO)
    expect(await simularRegra(qualquer(null), {})).toEqual(INVALIDO)
    expect(await buscarContatosTeste(qualquer(42))).toEqual([])
  })

  it("histórico com período estranho não quebra a data da consulta", async () => {
    await expect(listarExecucoes(qualquer({ dias: "muitos" }))).resolves.toEqual({ execucoes: [] })
    expect(await listarExecucoes(qualquer(null))).toEqual({ execucoes: [], ...INVALIDO })
  })
})
