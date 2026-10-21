// B30-04: exportação do histórico de compras em Excel (lógica pura, sem banco).
// Gera a planilha e lê de volta com a própria biblioteca para conferir o conteúdo.

import { describe, it, expect } from "vitest"
import * as XLSX from "xlsx"
import { gerarPlanilha, nomeDeArquivo } from "@/lib/exportar-planilha"
import { COLUNAS_EXPORTACAO_COMPRAS, TITULOS_EXPORTACAO_COMPRAS } from "@/lib/exportar-compras"
import type { Compra } from "@/app/(auth)/contatos/mock-contatos"

const colunas = (l: unknown[]) => Array.from({ length: 8 }, (_, i) => l[i])
const CABECALHO = ["Data", "Valor", "Peças", "Desconto", "Forma de pagamento", "Atendente", "Origem", "Pedido"]

function lerAba(bytes: Uint8Array) {
  const livro = XLSX.read(bytes, { type: "array", cellDates: true })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { nome: livro.SheetNames[0], aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

describe("B30-04 — Exportar compras do contato em Excel", () => {
  it("CA-B30-13: três compras viram cabeçalho e três linhas na ordem da tela, com data como data e valor como número", () => {
    const compras: Compra[] = [
      { id: "c3", data: "05/03/2026", valor: 5100, pecas: 12, desconto: 100, formaPagamento: "pix", atendente: "Fernanda", origem: "manual" },
      { id: "c2", data: "12/02/2026", valor: 350, pecas: 7, desconto: null, formaPagamento: null, atendente: "Bruno", origem: "catalogo", pedidoId: "p1", pedidoNumero: 1001 },
      { id: "c1", data: "15/01/2026", valor: 4200 },
    ]

    const { nome, aba, linhas } = lerAba(gerarPlanilha(COLUNAS_EXPORTACAO_COMPRAS, compras, "Compras"))

    expect(nome).toBe("Compras")
    expect(TITULOS_EXPORTACAO_COMPRAS).toEqual(CABECALHO)
    expect(linhas[0]).toEqual(CABECALHO)
    expect(linhas).toHaveLength(4)

    // Ordem da tela e conteúdo de cada linha.
    expect(colunas(linhas[1]).slice(1)).toEqual([5100, 12, 100, "Pix", "Fernanda", "Manual", undefined])
    expect(colunas(linhas[2]).slice(1)).toEqual([350, 7, undefined, undefined, "Bruno", "Catálogo", "#1001"])
    expect(colunas(linhas[3]).slice(1)).toEqual([4200, undefined, undefined, undefined, undefined, "Manual", undefined])

    // Data é célula de data, valor é célula numérica (não texto).
    const dataA2 = aba["A2"]
    expect(dataA2.t).toBe("d")
    expect((dataA2.v as Date).toLocaleDateString("pt-BR")).toBe("05/03/2026")
    expect(aba["A4"].v instanceof Date).toBe(true)
    expect(aba["B2"].t).toBe("n")
    expect(aba["B2"].v).toBe(5100)
    expect(aba["C2"].t).toBe("n")
  })

  it("CA-B30-14: sem compras, a planilha tem só o cabeçalho", () => {
    const { linhas } = lerAba(gerarPlanilha(COLUNAS_EXPORTACAO_COMPRAS, [], "Compras"))
    expect(linhas).toEqual([CABECALHO])
    expect(nomeDeArquivo("compras-Padaria do Centro & Cia")).toBe("compras-padaria-do-centro-cia.xlsx")
  })
})
