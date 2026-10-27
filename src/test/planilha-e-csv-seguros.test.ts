// B44-08 — planilha forjada não derruba o servidor e o CSV de pedidos não vira fórmula
// (auditoria de 27/10/2026). Sem banco: a sessão é simulada e as planilhas são
// montadas aqui mesmo.

import { describe, it, expect, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/lib/sessao", () => ({
  sessaoAtual: async () => ({ supabase: {}, user: { id: "gerente" }, perfil: { role: "gerente", workspace_id: "ws" } }),
}))

import { previaImportacao } from "@/app/(auth)/catalogo/importar/actions"
import { lerArquivoPlanilha } from "@/lib/catalogo/importacao"
import { interpretarPlanilha } from "@/lib/catalogo/planilha"
import { COLUNAS_PEDIDOS } from "@/lib/catalogo/exportar-pedidos"
import { gerarCsv } from "@/lib/exportar-planilha"
import type { PedidoResumo } from "@/app/(auth)/catalogo/components/lista-pedidos"

const CABECALHO = ["Código", "Nome", "Preço"]
const PRODUTOS = [["VES-001", "Vestido", "89,90"], ["VES-002", "Saia", "59,90"], ["VES-003", "Blusa", "49,90"]]

/**
 * Planilha .xlsx com os produtos e, se pedido, uma célula longe. A área declarada é
 * trocada direto no XML da aba, como num arquivo forjado: escrever pela biblioteca com
 * a área gigante percorreria a área inteira.
 */
function planilha({ areaDeclarada, celulaLonge }: { areaDeclarada: string; celulaLonge?: string }): ArrayBuffer {
  const aba = XLSX.utils.aoa_to_sheet([CABECALHO, ...PRODUTOS])
  if (celulaLonge) {
    aba[celulaLonge] = { t: "s", v: "x" }
    aba["!ref"] = `A1:C${XLSX.utils.decode_cell(celulaLonge).r + 1}`
  }
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, aba, "Produtos")
  const zip = XLSX.CFB.read(new Uint8Array(XLSX.write(livro, { type: "array", bookType: "xlsx" }) as ArrayBuffer), { type: "array" })
  const entrada = XLSX.CFB.find(zip, "/xl/worksheets/sheet1.xml")!
  const xml = new TextDecoder().decode(entrada.content as Uint8Array)
  entrada.content = new TextEncoder().encode(xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="${areaDeclarada}"/>`)) as never
  return (XLSX.CFB.write(zip, { type: "array", fileType: "zip" }) as Uint8Array).slice().buffer
}

function formulario(bytes: ArrayBuffer, nome = "produtos.xlsx") {
  const dados = new FormData()
  dados.append("arquivo", new File([bytes], nome))
  return dados
}

describe("B44-08 — Planilha forjada e CSV sem fórmula", () => {
  it("CA-B44-29: should recusar em poucos segundos a planilha pequena que declara linhas demais", async () => {
    const bytes = planilha({ areaDeclarada: "A1:XFD1048576", celulaLonge: "A50000" })
    expect(bytes.byteLength).toBeLessThan(20 * 1024)

    const inicio = Date.now()
    const resultado = await previaImportacao(formulario(bytes))

    expect(resultado).toEqual({ erro: "A planilha passa de 1.000 linhas." })
    expect(Date.now() - inicio).toBeLessThan(2000)
  })

  it("CA-B44-30: should continuar lendo a planilha modelo, mesmo com área declarada gigante sem células", () => {
    const comAreaGigante = lerArquivoPlanilha("produtos.xlsx", planilha({ areaDeclarada: "A1:XFD1048576" }))
    expect(comAreaGigante).toHaveLength(4)
    expect(comAreaGigante[0]).toEqual(CABECALHO)
    expect(interpretarPlanilha(comAreaGigante).produtos.map((p) => p.codigo)).toEqual(["VES-001", "VES-002", "VES-003"])

    const normal = lerArquivoPlanilha("produtos.xlsx", planilha({ areaDeclarada: "A1:C4" }))
    expect(interpretarPlanilha(normal).produtos).toHaveLength(3)
  })

  it("CA-B44-31: should mostrar como texto o nome de cliente que começa como fórmula", () => {
    const pedido = (nome: string) =>
      ({ numero: 7, criadoEm: "2026-10-27T12:00:00Z", cliente: { nome, whatsapp: "5511999990000" }, pecas: 3, total: 150.5, situacao: "novo" }) as unknown as PedidoResumo
    const csv = gerarCsv(COLUNAS_PEDIDOS, ["=1+1", "+5511", "-2+3", "@SOMA(A1)", "Ana"].map(pedido))
    const linhas = csv.replace(/^﻿/, "").trim().split("\r\n")
    const colunaCliente = linhas[0].split(";").indexOf("Cliente")
    const clientes = linhas.slice(1).map((l) => l.split(";")[colunaCliente])

    expect(clientes).toEqual(["'=1+1", "'+5511", "'-2+3", "'@SOMA(A1)", "Ana"])
    // As colunas de valor não mudam.
    expect(linhas[1]).toContain("150,50")
  })
})
