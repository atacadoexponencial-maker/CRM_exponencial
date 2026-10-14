// B22-10 — o resultado de "Testar com um contato" deixa de valer quando o fluxo
// muda (achado M9 do QA das automações, 09/10/2026). A assinatura do caminho diz
// se mudou; arrastar um bloco não conta. A faixa na tela é conferida no preview
// (e2e/preview/roteiro-b22-10.cjs).

import { describe, expect, it } from "vitest"
import type { Fluxo } from "@/lib/fluxo-automacao"
import { assinaturaDoCaminho } from "@/app/(auth)/configuracoes/automacoes/components/rascunho-editor"

const fluxo = (): Fluxo => ({
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada" }, posicao: { x: 0, y: 0 } },
    {
      id: "c",
      tipo: "condicao",
      verificacoes: [{ id: "v", tipo: "tag_contato", operador: "tem", valor: "vip" }],
      posicao: { x: 0, y: 150 },
    },
    { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "e1" }, posicao: { x: -170, y: 300 } },
  ],
  ligacoes: [
    { de: "g", saida: "proximo", para: "c" },
    { de: "c", saida: "sim", para: "a" },
  ],
})

describe("B22-10 — assinatura do caminho testado", () => {
  it("arrastar um bloco não muda a assinatura", () => {
    const movido = fluxo()
    movido.blocos[2].posicao = { x: 400, y: 900 }
    expect(assinaturaDoCaminho(movido)).toBe(assinaturaDoCaminho(fluxo()))
  })

  it("a ordem das chaves não conta", () => {
    const reordenado = fluxo()
    const { id, tipo, acao, parametros, posicao } = reordenado.blocos[2] as Extract<Fluxo["blocos"][number], { tipo: "acao" }>
    reordenado.blocos[2] = { posicao, parametros, acao, tipo, id }
    expect(assinaturaDoCaminho(reordenado)).toBe(assinaturaDoCaminho(fluxo()))
  })

  it("mudar uma verificação muda a assinatura", () => {
    const outro = fluxo()
    outro.blocos[1] = { ...outro.blocos[1], verificacoes: [{ id: "v", tipo: "tag_contato", operador: "tem", valor: "atacado" }] } as Fluxo["blocos"][number]
    expect(assinaturaDoCaminho(outro)).not.toBe(assinaturaDoCaminho(fluxo()))
  })

  it("trocar a saída de uma ligação muda a assinatura", () => {
    const outro = fluxo()
    outro.ligacoes[1] = { de: "c", saida: "nao", para: "a" }
    expect(assinaturaDoCaminho(outro)).not.toBe(assinaturaDoCaminho(fluxo()))
  })

  it("acrescentar ou tirar um bloco muda a assinatura", () => {
    const sem = fluxo()
    sem.blocos.pop()
    sem.ligacoes.pop()
    expect(assinaturaDoCaminho(sem)).not.toBe(assinaturaDoCaminho(fluxo()))
  })
})
