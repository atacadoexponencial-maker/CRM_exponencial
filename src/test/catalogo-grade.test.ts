// B17-01 — compra por grade: funções puras que montam a grade e limitam as quantidades.

import { describe, it, expect } from "vitest"
import { blocosDaGrade, limitarQuantidade, totaisDaGrade } from "@/lib/catalogo/grade"

const tamanho = { id: "t", nome: "Tamanho", opcoes: ["P", "M", "G"] }
const cor = { id: "c", nome: "Cor", opcoes: ["Areia", "Preto"] }

describe("B17-01 — Compra por grade na página do produto", () => {
  it("dois tipos: um bloco por opção do 2º tipo, uma linha por opção do 1º, na ordem cadastrada", () => {
    const blocos = blocosDaGrade([tamanho, cor])
    expect(blocos.map((b) => b.titulo)).toEqual(["Cor: Areia", "Cor: Preto"])
    expect(blocos[0].nome).toBe("Areia")
    expect(blocos[0].linhas).toEqual([
      { combinacao: "P / Areia", rotulo: "P" },
      { combinacao: "M / Areia", rotulo: "M" },
      { combinacao: "G / Areia", rotulo: "G" },
    ])
  })

  it("um tipo: uma lista só com o nome do tipo", () => {
    expect(blocosDaGrade([tamanho])).toEqual([
      { titulo: "Tamanho", nome: "", linhas: [{ combinacao: "P", rotulo: "P" }, { combinacao: "M", rotulo: "M" }, { combinacao: "G", rotulo: "G" }] },
    ])
  })

  it("tipo sem opção é ignorado; sem tipos não há grade", () => {
    expect(blocosDaGrade([])).toEqual([])
    expect(blocosDaGrade([{ id: "x", nome: "Cor", opcoes: [] }])).toEqual([])
    expect(blocosDaGrade([tamanho, { id: "x", nome: "Cor", opcoes: [] }])[0].titulo).toBe("Tamanho")
  })

  it("limita a quantidade entre 0 e o disponível", () => {
    expect(limitarQuantidade(3, 5)).toBe(3)
    expect(limitarQuantidade(24, 10)).toBe(10)
    expect(limitarQuantidade(-1, 10)).toBe(0)
    expect(limitarQuantidade(2, 0)).toBe(0)
  })

  it("quantidade digitada: número inteiro; vazio ou inválido vira 0", () => {
    expect(limitarQuantidade("12", 50)).toBe(12)
    expect(limitarQuantidade("", 50)).toBe(0)
    expect(limitarQuantidade("abc", 50)).toBe(0)
    expect(limitarQuantidade("1.5", 50)).toBe(1)
    expect(limitarQuantidade("99", 7)).toBe(7)
  })

  it("soma peças e valor da grade", () => {
    expect(totaisDaGrade({ "P / Areia": 2, "M / Areia": 2, "P / Preto": 1, "G / Preto": 0 }, 89.9)).toEqual({ pecas: 5, valor: 449.5 })
    expect(totaisDaGrade({}, 89.9)).toEqual({ pecas: 0, valor: 0 })
  })
})
