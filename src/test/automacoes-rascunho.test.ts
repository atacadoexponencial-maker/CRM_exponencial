// Testes do rascunho do editor de automações (B22-08): chave, assinatura, ler,
// guardar e apagar no localStorage do jsdom, e a leitura de quando o editor abre.

import { afterEach, describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import type { RegraEditada } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import {
  apagarRascunho,
  assinatura,
  chaveDoRascunho,
  guardarRascunho,
  lerRascunho,
  useRascunhoDaAbertura,
  type RascunhoEditor,
} from "@/app/(auth)/configuracoes/automacoes/components/rascunho-editor"

const regra = (nome = "Boas-vindas"): RegraEditada => ({
  nome,
  repeticao: { modo: "uma_vez_por_contato" },
  fluxo: {
    blocos: [
      { id: "gatilho", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada" }, posicao: { x: 0, y: 0 } },
      { id: "a1", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "e1" }, posicao: { x: 0, y: 200 } },
    ],
    ligacoes: [{ de: "gatilho", saida: "proximo", para: "a1" }],
  },
})

const rascunho = (r = regra()): RascunhoEditor => ({ regra: r, base: assinatura(regra()), guardadoEm: "2026-10-13T17:32:00.000Z" })

const CHAVE = chaveDoRascunho("u1", "r1")

afterEach(() => localStorage.clear())

describe("chaveDoRascunho", () => {
  it("separa por pessoa e por regra, e a regra não salva é 'nova'", () => {
    expect(chaveDoRascunho("u1", "r1")).not.toBe(chaveDoRascunho("u2", "r1"))
    expect(chaveDoRascunho("u1", "r1")).not.toBe(chaveDoRascunho("u1", "r2"))
    expect(chaveDoRascunho("u1", null)).toBe("automacoes:rascunho:u1:nova")
  })
})

describe("assinatura", () => {
  it("não muda com a ordem das chaves nem com espaço nas pontas do nome", () => {
    const r = regra()
    const { posicao, ...resto } = r.fluxo.blocos[1]
    const reordenada: RegraEditada = {
      fluxo: { ligacoes: r.fluxo.ligacoes, blocos: [r.fluxo.blocos[0], { posicao, ...resto }] },
      repeticao: r.repeticao,
      nome: "  Boas-vindas ",
    }
    expect(assinatura(reordenada)).toBe(assinatura(r))
  })

  it("muda com o nome, a repetição, a posição de um bloco ou uma ligação", () => {
    const r = regra()
    const base = assinatura(r)
    expect(assinatura({ ...r, nome: "Outra" })).not.toBe(base)
    expect(assinatura({ ...r, repeticao: { modo: "sempre" } })).not.toBe(base)
    const movida = structuredClone(r)
    movida.fluxo.blocos[1].posicao = { x: 10, y: 200 }
    expect(assinatura(movida)).not.toBe(base)
    expect(assinatura({ ...r, fluxo: { ...r.fluxo, ligacoes: [] } })).not.toBe(base)
  })
})

describe("guardar, ler e apagar", () => {
  it("lê de volta o que foi guardado", () => {
    guardarRascunho(CHAVE, rascunho())
    expect(lerRascunho(CHAVE)).toEqual(rascunho())
  })

  it("sem rascunho, lê null", () => {
    expect(lerRascunho(CHAVE)).toBeNull()
  })

  it("apagar tira o rascunho", () => {
    guardarRascunho(CHAVE, rascunho())
    apagarRascunho(CHAVE)
    expect(localStorage.getItem(CHAVE)).toBeNull()
  })

  it.each([
    ["JSON quebrado", "{"],
    ["fluxo fora do formato", JSON.stringify({ ...rascunho(), regra: { ...regra(), fluxo: { blocos: "x" } } })],
    ["sem base", JSON.stringify({ regra: regra(), guardadoEm: "2026-10-13T17:32:00.000Z" })],
    ["data inválida", JSON.stringify({ ...rascunho(), guardadoEm: "ontem" })],
  ])("%s: lê null e apaga", (_, bruto) => {
    localStorage.setItem(CHAVE, bruto)
    expect(lerRascunho(CHAVE)).toBeNull()
    expect(localStorage.getItem(CHAVE)).toBeNull()
  })
})

describe("useRascunhoDaAbertura", () => {
  it("devolve o rascunho que existia ao abrir", () => {
    guardarRascunho(CHAVE, rascunho())
    const { result, unmount } = renderHook(() => useRascunhoDaAbertura(CHAVE))
    expect(result.current).toEqual(rascunho())
    unmount()
  })

  it("não troca pelo rascunho que o próprio editor grava depois", () => {
    const { result, rerender, unmount } = renderHook(() => useRascunhoDaAbertura(CHAVE))
    expect(result.current).toBeNull()
    guardarRascunho(CHAVE, rascunho(regra("Editada agora")))
    rerender()
    expect(result.current).toBeNull()
    unmount()
  })

  it("abrir o editor de novo lê outra vez", () => {
    const primeira = renderHook(() => useRascunhoDaAbertura(CHAVE))
    guardarRascunho(CHAVE, rascunho())
    primeira.unmount()
    const segunda = renderHook(() => useRascunhoDaAbertura(CHAVE))
    expect(segunda.result.current).toEqual(rascunho())
    segunda.unmount()
  })
})
