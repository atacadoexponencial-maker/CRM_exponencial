// Melhorias da vitrine (21/10/2026): resumo das variações no cartão, ordem dos produtos,
// carga em blocos e código do produto na mensagem do pedido. Funções puras.

import { describe, it, expect } from "vitest"
import { LIMITE_POR_SECAO, ordemVitrineValida, ordenarProdutos, resumoDasVariacoes } from "@/lib/catalogo/vitrine"
import { montarMensagemPedido } from "@/app/loja/components/pedido"

const tamanho = { id: "t", nome: "Tamanho", opcoes: ["P", "M", "G", "GG"] }
const cor = { id: "c", nome: "Cor", opcoes: ["Azul", "Preto"] }
const muitasCores = { id: "c", nome: "Cor", opcoes: ["Azul-marinho", "Preto", "Vermelho", "Verde-musgo"] }

describe("Vitrine — resumo das variações no cartão", () => {
  it("lista as opções quando cabem; conta quando são muitas", () => {
    expect(resumoDasVariacoes([tamanho, cor])).toBe("P, M, G, GG · Azul, Preto")
    expect(resumoDasVariacoes([tamanho, muitasCores])).toBe("P, M, G, GG · 4 opções de cor")
  })

  it("uma opção só aparece pelo nome; sem variação não há resumo", () => {
    expect(resumoDasVariacoes([{ id: "c", nome: "Cor", opcoes: ["Único"] }])).toBe("Único")
    expect(resumoDasVariacoes([])).toBeNull()
    expect(resumoDasVariacoes([{ id: "x", nome: "Cor", opcoes: [] }])).toBeNull()
  })
})

describe("Vitrine — ordem dos produtos", () => {
  const produtos = [
    { nome: "Regata", preco: 19.9 },
    { nome: "Camiseta", preco: 29.9 },
    { nome: "Ágata", preco: 19.9 },
  ]

  it("ordem da loja mantém a lista como veio; preço e nome reordenam sem mexer na original", () => {
    expect(ordenarProdutos(produtos, "loja")).toBe(produtos)
    expect(ordenarProdutos(produtos, "menor-preco").map((p) => p.nome)).toEqual(["Regata", "Ágata", "Camiseta"])
    expect(ordenarProdutos(produtos, "maior-preco").map((p) => p.nome)).toEqual(["Camiseta", "Regata", "Ágata"])
    expect(ordenarProdutos(produtos, "nome").map((p) => p.nome)).toEqual(["Ágata", "Camiseta", "Regata"])
    expect(produtos.map((p) => p.nome)).toEqual(["Regata", "Camiseta", "Ágata"])
  })

  it("só aceita as ordens conhecidas (o que vem do armazenamento pode estar corrompido)", () => {
    expect(ordemVitrineValida("menor-preco")).toBe(true)
    expect(ordemVitrineValida("qualquer")).toBe(false)
    expect(ordemVitrineValida(undefined)).toBe(false)
  })

  it("cada seção mostra até 24 produtos antes do Ver mais", () => {
    expect(LIMITE_POR_SECAO).toBe(24)
  })
})

describe("Pedido — código do produto na mensagem", () => {
  it("o item com código leva o código; sem código a linha fica como era", () => {
    const mensagem = montarMensagemPedido({
      numero: 7,
      nomeCliente: "Ana",
      itens: [
        { nome: "Camiseta", codigo: "CAM-01", variacao: "M / Azul", quantidade: 2, precoUnitario: 29.9 },
        { nome: "Regata", codigo: "  ", variacao: "", quantidade: 1, precoUnitario: 19.9 },
      ],
    })
    expect(mensagem).toContain("• 2x Camiseta (M / Azul) · cód. CAM-01 — ")
    expect(mensagem).toContain("• 1x Regata — ")
    expect(mensagem).not.toContain("cód.  ")
  })
})
