// B18-01 — leitura da planilha de importação: cabeçalho, agrupamento pelo código e erros por linha.

import { describe, it, expect } from "vitest"
import { COLUNAS_PLANILHA, interpretarPlanilha, lerInteiro, lerPreco, lerSimNao, LINHAS_EXEMPLO } from "@/lib/catalogo/planilha"

const CAB = COLUNAS_PLANILHA.map((c) => c.titulo)
/** Monta uma linha a partir de pares coluna → valor. */
const linha = (v: Record<string, unknown>) => COLUNAS_PLANILHA.map((c) => v[c.chave] ?? null)

describe("B18-01 — leitores de valor", () => {
  it("preço aceita vírgula, ponto, R$, milhar e número", () => {
    expect(lerPreco("89,90")).toBe(89.9)
    expect(lerPreco("89.90")).toBe(89.9)
    expect(lerPreco("R$ 1.234,56")).toBe(1234.56)
    expect(lerPreco("1.234")).toBe(1234)
    expect(lerPreco(39.9)).toBe(39.9)
    expect(lerPreco("oitenta")).toBeNull()
    expect(lerPreco("")).toBeNull()
  })

  it("estoque só aceita inteiro", () => {
    expect(lerInteiro("12")).toBe(12)
    expect(lerInteiro(5)).toBe(5)
    expect(lerInteiro("1,5")).toBeNull()
    expect(lerInteiro(2.5)).toBeNull()
  })

  it("visível aceita sim/não com e sem acento", () => {
    expect(lerSimNao("Sim")).toBe(true)
    expect(lerSimNao("NÃO")).toBe(false)
    expect(lerSimNao("n")).toBe(false)
    expect(lerSimNao("talvez")).toBeUndefined()
  })
})

describe("B18-01 — interpretar a planilha", () => {
  it("o modelo de exemplo vira 2 produtos sem erro", () => {
    const r = interpretarPlanilha([CAB, ...LINHAS_EXEMPLO.map(linha)])
    expect(r.erros).toEqual([])
    expect(r.produtos.map((p) => p.codigo)).toEqual(["CIN-001", "VES-001"])
    const vestido = r.produtos[1]
    expect(vestido).toMatchObject({ nome: "Vestido Linho", preco: 89.9, precoDe: 119.9, categoria: "Vestidos", visivel: true, linhas: [3, 4, 5] })
    expect(vestido.tipos).toEqual([{ nome: "Tamanho", opcoes: ["P", "M", "G"] }])
    expect(vestido.estoque).toEqual({ P: 5, M: 8, G: 3 })
    expect(r.produtos[0].estoque).toEqual({ "": 20 })
  })

  it("cabeçalho em outra ordem, sem acento e em maiúsculas", () => {
    const r = interpretarPlanilha([["PRECO", "nome", "codigo", "Estoque"], ["10", "Meia", "M-1", "4"]])
    expect(r.faltando).toEqual([])
    expect(r.produtos[0]).toMatchObject({ codigo: "M-1", nome: "Meia", preco: 10, estoque: { "": 4 } })
  })

  it("aponta as colunas obrigatórias que faltam", () => {
    expect(interpretarPlanilha([["Código", "Nome"], ["A", "B"]]).faltando).toEqual(["Preço"])
  })

  it("duas variações: combinações na ordem Tamanho / Cor", () => {
    const r = interpretarPlanilha([
      CAB,
      linha({ codigo: "B-1", nome: "Blusa", preco: "50", variacao1: "Tamanho", opcao1: "P", variacao2: "Cor", opcao2: "Areia", estoque: 2 }),
      linha({ codigo: "B-1", variacao1: "Tamanho", opcao1: "M", variacao2: "Cor", opcao2: "Areia", estoque: 3 }),
      linha({ codigo: "B-1", variacao1: "tamanho", opcao1: "P", variacao2: "Cor", opcao2: "Preto" }),
    ])
    expect(r.erros).toEqual([])
    expect(r.produtos[0].tipos).toEqual([{ nome: "Tamanho", opcoes: ["P", "M"] }, { nome: "Cor", opcoes: ["Areia", "Preto"] }])
    expect(r.produtos[0].estoque).toEqual({ "P / Areia": 2, "M / Areia": 3, "P / Preto": null })
  })

  it("linhas em branco são puladas sem mudar a numeração", () => {
    const r = interpretarPlanilha([CAB, [], linha({ codigo: "X", nome: "X", preco: "oitenta" })])
    expect(r.erros[0].texto).toBe('Linha 3: o preço "oitenta" não é um número.')
    expect(r.totalLinhas).toBe(1)
  })

  it("erros de linha tiram o produto e apontam a linha", () => {
    const r = interpretarPlanilha([
      CAB,
      linha({ codigo: "", nome: "Sem código", preco: "10" }),
      linha({ codigo: "A", nome: "A", preco: "10", precoDe: "5" }),
      linha({ codigo: "B", nome: "B", preco: "10", estoque: "-1" }),
      linha({ codigo: "C", nome: "C", preco: "10", visivel: "talvez" }),
      linha({ codigo: "D", nome: "D", preco: "10", fotos: "foto.jpg" }),
      linha({ codigo: "E", nome: "E", preco: "10", opcao1: "P" }),
      linha({ codigo: "F", nome: "F", preco: "10", variacao2: "Cor", opcao2: "Azul" }),
      linha({ codigo: "OK", nome: "Certo", preco: "10" }),
    ])
    expect(r.produtos.map((p) => p.codigo)).toEqual(["OK"])
    const textos = r.erros.map((e) => e.texto)
    expect(textos).toContain("Linha 2: falta o código do produto.")
    expect(textos).toContain('Linha 3: o "Preço de" de A precisa ser maior que o preço.')
    expect(textos.some((t) => t.startsWith("Linha 4: o estoque"))).toBe(true)
    expect(textos.some((t) => t.startsWith('Linha 5: em "Visível na loja"'))).toBe(true)
    expect(textos.some((t) => t.startsWith("Linha 6: o link de foto"))).toBe(true)
    expect(textos).toContain("Linha 7: Opção 1 sem Variação 1.")
    expect(textos).toContain("Linha 8: F tem Variação 2 sem Variação 1.")
  })

  it("combinação repetida e produto sem variação em duas linhas", () => {
    const r = interpretarPlanilha([
      CAB,
      linha({ codigo: "V", nome: "V", preco: "10", variacao1: "Tamanho", opcao1: "M" }),
      linha({ codigo: "V", variacao1: "Tamanho", opcao1: "m" }),
      linha({ codigo: "S", nome: "S", preco: "10" }),
      linha({ codigo: "S" }),
    ])
    expect(r.produtos).toEqual([])
    expect(r.erros.map((e) => e.texto)).toEqual([
      "Linhas 2 e 3: o produto V tem a combinação M repetida.",
      "Linhas 4 e 5: o produto S não tem variação e aparece em mais de uma linha.",
    ])
  })

  it("nome de variação diferente entre linhas e opção faltando", () => {
    const r = interpretarPlanilha([
      CAB,
      linha({ codigo: "V", nome: "V", preco: "10", variacao1: "Tamanho", opcao1: "P" }),
      linha({ codigo: "V", variacao1: "Cor", opcao1: "Azul" }),
      linha({ codigo: "V", variacao1: "Tamanho" }),
    ])
    const textos = r.erros.map((e) => e.texto)
    expect(textos).toContain('Linha 3: a Variação 1 de V é "Tamanho" na linha 2 e "Cor" aqui.')
    expect(textos).toContain("Linha 4: falta a Opção 1 (Tamanho) de V.")
  })

  it("vazios ficam nulos (a atualização mantém o que o produto tem)", () => {
    const p = interpretarPlanilha([CAB, linha({ codigo: 1001, nome: "Meia", preco: 10 })]).produtos[0]
    expect(p).toMatchObject({ codigo: "1001", precoDe: null, categoria: null, descricao: null, visivel: null, fotos: null, estoque: { "": null } })
  })

  it("fotos separadas por espaço, vírgula ou ponto e vírgula", () => {
    const p = interpretarPlanilha([CAB, linha({ codigo: "A", nome: "A", preco: 10, fotos: "https://a.com/1.jpg; https://a.com/2.jpg,https://a.com/3.jpg" })]).produtos[0]
    expect(p.fotos).toEqual(["https://a.com/1.jpg", "https://a.com/2.jpg", "https://a.com/3.jpg"])
  })
})
