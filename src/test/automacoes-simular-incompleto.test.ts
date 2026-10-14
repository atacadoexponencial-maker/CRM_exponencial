// B22-11 — "Testar com um contato" recusa o fluxo que não poderia ser salvo
// (achado M10 do QA das automações, 09/10/2026): uma condição vazia dava "sim".
// A sessão e o banco são falsos; o banco só é consultado quando o fluxo está completo.

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Fluxo } from "@/lib/fluxo-automacao"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { simularRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const posicao = { x: 0, y: 0 }

/** Banco em que o contato procurado não existe. */
function banco() {
  const obj: Record<string, unknown> = {}
  for (const m of ["select", "eq", "is"]) obj[m] = vi.fn(() => obj)
  obj.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  return { from: vi.fn(() => obj) }
}

let cliente: ReturnType<typeof banco>

beforeEach(() => {
  cliente = banco()
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: cliente,
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
})

function comCondicao(verificacoes: Extract<Fluxo["blocos"][number], { tipo: "condicao" }>["verificacoes"]): Fluxo {
  return {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { id: "c", tipo: "condicao", verificacoes, posicao },
      { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao },
    ],
    ligacoes: [
      { de: "g", saida: "proximo", para: "c" },
      { de: "c", saida: "sim", para: "a" },
    ],
  }
}

describe("B22-11 — testar só o fluxo completo", () => {
  it("condição sem verificação: recusa sem consultar o banco", async () => {
    const resposta = await simularRegra("contato-1", comCondicao([]))
    expect(resposta.erro).toMatch(/^Complete o fluxo antes de testar: /)
    expect(resposta.resultado).toBeUndefined()
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it("verificação sem valor: recusa", async () => {
    const resposta = await simularRegra("contato-1", comCondicao([{ id: "v", tipo: "tag_contato", operador: "tem", valor: "" }]))
    expect(resposta.erro).toMatch(/^Complete o fluxo antes de testar: /)
    expect(cliente.from).not.toHaveBeenCalled()
  })

  it("fluxo completo: segue para o contato", async () => {
    const resposta = await simularRegra(
      "contato-1",
      comCondicao([{ id: "v", tipo: "tag_contato", operador: "tem", valor: "vip" }])
    )
    expect(resposta).toEqual({ erro: "Contato não encontrado." })
    expect(cliente.from).toHaveBeenCalledWith("contacts")
  })
})
