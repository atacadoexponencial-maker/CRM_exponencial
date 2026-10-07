// Modelo da planilha de importação (B18): aba "Produtos" com exemplos e aba "Como preencher".

import * as XLSX from "xlsx"
import { sessaoAtual } from "@/lib/sessao"
import { COLUNAS_PLANILHA, LINHAS_EXEMPLO } from "@/lib/catalogo/planilha"

export async function GET() {
  const { user, perfil } = await sessaoAtual()
  if (!user || (perfil?.role !== "admin" && perfil?.role !== "gerente")) return new Response("Sem permissão.", { status: 403 })

  const produtos = XLSX.utils.aoa_to_sheet([
    COLUNAS_PLANILHA.map((c) => c.titulo),
    ...LINHAS_EXEMPLO.map((linha) => COLUNAS_PLANILHA.map((c) => linha[c.chave] ?? "")),
  ])
  produtos["!cols"] = COLUNAS_PLANILHA.map((c) => ({ wch: Math.max(12, c.titulo.length + 2, c.chave === "fotos" ? 40 : 0) }))
  const comoPreencher = XLSX.utils.aoa_to_sheet([
    ["Coluna", "Obrigatória", "O que vai nela", "Exemplo"],
    ...COLUNAS_PLANILHA.map((c) => [c.titulo, c.obrigatoria ? "sim" : "não", c.oQueVai, c.exemplo]),
    [],
    ["Produto com variação: uma linha por combinação, todas com o mesmo código. Nome, preço, categoria, descrição, visível e fotos bastam na primeira linha."],
    ["Reimportar com o mesmo código atualiza o produto. Coluna vazia não apaga o que o produto já tem."],
  ])
  comoPreencher["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 90 }, { wch: 34 }]

  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, produtos, "Produtos")
  XLSX.utils.book_append_sheet(livro, comoPreencher, "Como preencher")
  const bytes = XLSX.write(livro, { type: "buffer", bookType: "xlsx" }) as Buffer

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-produtos.xlsx"',
      "Cache-Control": "no-store",
    },
  })
}
