// B22-29 — limites das automações (achado M20 do QA das automações, 09/10/2026;
// valores decididos pelo Luan em 14/10): fluxo até 200 KB e 100 blocos, até 100
// automações por empresa e "Testar com um contato" até 10 vezes por minuto.
// Sessão, banco e contador de tentativas são falsos.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { BLOCOS_POR_AUTOMACAO, pendenciasDoFluxo, type Fluxo } from "@/lib/fluxo-automacao"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/lib/limite-de-tentativas", () => ({
  chaveDoUsuario: (id: string) => `chave-${id}`,
  passouDoLimite: vi.fn(async () => false),
  registrarTentativa: vi.fn(async () => {}),
}))

import { sessaoAtual } from "@/lib/sessao"
import { passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"
import { duplicarRegra, salvarRegra, simularRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const posicao = { x: 0, y: 0 }
const SIMPLES: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
    { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
}

let inseriu: boolean

/** `automacoes`: quantas a empresa já tem. */
function sessao(automacoes = 0) {
  inseriu = false
  const from = vi.fn(() => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "not", "order", "limit"]) obj[m] = vi.fn(() => obj)
    obj.insert = vi.fn(() => {
      inseriu = true
      return obj
    })
    obj.single = vi.fn(async () => ({ data: { id: "regra-nova" }, error: null }))
    obj.maybeSingle = vi.fn(async () => ({ data: { nome: "Boas-vindas", fluxo: SIMPLES, repeticao: { modo: "sempre" } }, error: null }))
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: [], count: automacoes, error: null }).then(resolve)
    return obj
  })
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: { from },
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

beforeEach(() => {
  vi.mocked(passouDoLimite).mockResolvedValue(false)
  vi.mocked(registrarTentativa).mockClear()
})

describe("B22-29 — tamanho e blocos", () => {
  it("mais de 100 blocos é pendência (o Salvar e o motor recusam)", () => {
    const grande: Fluxo = {
      blocos: [
        SIMPLES.blocos[0],
        ...Array.from({ length: BLOCOS_POR_AUTOMACAO }, (_, i) => ({
          id: `a${i}`,
          tipo: "acao" as const,
          acao: "resolver_conversa" as const,
          parametros: {},
          posicao,
        })),
      ],
      ligacoes: [],
    }
    expect(pendenciasDoFluxo(grande).gerais).toContain("Uma automação pode ter até 100 blocos; esta tem 101")
    expect(pendenciasDoFluxo(SIMPLES).gerais).toEqual([])
  })

  it("fluxo de mais de 200 KB: Salvar e Testar recusam antes de qualquer conferência", async () => {
    sessao()
    const pesado = { ...SIMPLES, blocos: [SIMPLES.blocos[0], { ...SIMPLES.blocos[1], parametros: { texto: "x".repeat(210 * 1024) } }] }
    const erro = "A automação passou do tamanho máximo (200 KB). Encurte os textos ou divida em duas."
    expect(await salvarRegra({ id: null, nome: "Grande", fluxo: pesado, repeticao: { modo: "sempre" } })).toEqual({ erro })
    expect(await simularRegra("contato-1", pesado)).toEqual({ erro })
    expect(inseriu).toBe(false)
  })
})

describe("B22-29 — até 100 automações por empresa", () => {
  const erro = "A empresa chegou ao limite de 100 automações. Exclua uma para criar outra."

  it("regra nova na centésima primeira: recusa", async () => {
    sessao(100)
    expect(await salvarRegra({ id: null, nome: "Mais uma", fluxo: SIMPLES, repeticao: { modo: "sempre" } })).toEqual({ erro })
    expect(inseriu).toBe(false)
  })

  it("duplicar também conta", async () => {
    sessao(100)
    expect(await duplicarRegra("r1")).toEqual({ erro })
    expect(inseriu).toBe(false)
  })

  it("abaixo do limite, cria", async () => {
    sessao(99)
    expect(await salvarRegra({ id: null, nome: "Mais uma", fluxo: SIMPLES, repeticao: { modo: "sempre" } })).toEqual({ id: "regra-nova" })
    expect(inseriu).toBe(true)
  })
})

describe("B22-29 — até 10 testes por minuto por pessoa", () => {
  it("no limite: recusa sem testar nem contar de novo", async () => {
    sessao()
    vi.mocked(passouDoLimite).mockResolvedValue(true)
    expect(await simularRegra("contato-1", SIMPLES)).toEqual({ erro: "Muitos testes seguidos. Espere um minuto e teste de novo." })
    expect(passouDoLimite).toHaveBeenCalledWith("teste_automacao", [{ chave: "chave-admin-1", limite: 10 }], 1)
    expect(registrarTentativa).not.toHaveBeenCalled()
  })

  it("abaixo do limite: conta o teste e segue", async () => {
    sessao()
    await simularRegra("contato-1", SIMPLES)
    expect(registrarTentativa).toHaveBeenCalledWith("teste_automacao", ["chave-admin-1"])
  })
})
