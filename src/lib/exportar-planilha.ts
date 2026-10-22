// Padrão de exportação em Excel (B30-04). As telas de relatório reutilizam isto:
// descrevem as colunas, entregam as linhas e recebem os bytes do .xlsx, com data
// gravada como data e número como número (abre certo no Excel e no Google Planilhas).

import * as XLSX from "xlsx"

export type TipoCelula = "texto" | "numero" | "moeda" | "data"

export interface ColunaPlanilha<T> {
  titulo: string
  tipo: TipoCelula
  /** Valor da célula para a linha. `null`/`undefined` deixa a célula vazia. */
  valor: (linha: T) => string | number | Date | null | undefined
  /** Largura em caracteres (padrão: tamanho do título + 4, mínimo 12). */
  largura?: number
}

const FORMATO: Record<TipoCelula, string | null> = {
  texto: null,
  numero: "0",
  moeda: "#,##0.00",
  data: "dd/mm/yyyy",
}

/** Gera o .xlsx com uma aba: cabeçalho na linha 1 e uma linha por item, na ordem dada. */
export function gerarPlanilha<T>(colunas: ColunaPlanilha<T>[], linhas: T[], aba: string): Uint8Array {
  return gerarPlanilhaComAbas([{ nome: aba, colunas, linhas }])
}

/** Uma aba do .xlsx: as colunas e as linhas dela. */
export interface AbaPlanilha<T> {
  nome: string
  colunas: ColunaPlanilha<T>[]
  linhas: T[]
}

/** B39-02: o mesmo .xlsx, com várias abas, na ordem dada. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gerarPlanilhaComAbas(abas: AbaPlanilha<any>[]): Uint8Array {
  const livro = XLSX.utils.book_new()
  for (const aba of abas) XLSX.utils.book_append_sheet(livro, montarAba(aba.colunas, aba.linhas), aba.nome)
  return new Uint8Array(XLSX.write(livro, { type: "buffer", bookType: "xlsx", cellDates: true }) as Buffer)
}

function montarAba<T>(colunas: ColunaPlanilha<T>[], linhas: T[]): XLSX.WorkSheet {
  const planilha = XLSX.utils.aoa_to_sheet([colunas.map((c) => c.titulo)], { cellDates: true })

  linhas.forEach((linha, i) => {
    colunas.forEach((coluna, j) => {
      const bruto = coluna.valor(linha)
      if (bruto === null || bruto === undefined || bruto === "") return
      const endereco = XLSX.utils.encode_cell({ r: i + 1, c: j })
      const celula: XLSX.CellObject =
        coluna.tipo === "data"
          ? { t: "d", v: bruto as Date }
          : coluna.tipo === "texto"
            ? { t: "s", v: String(bruto) }
            : { t: "n", v: Number(bruto) }
      const formato = FORMATO[coluna.tipo]
      if (formato) celula.z = formato
      planilha[endereco] = celula
    })
  })

  planilha["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: linhas.length, c: Math.max(0, colunas.length - 1) } })
  planilha["!cols"] = colunas.map((c) => ({ wch: c.largura ?? Math.max(12, c.titulo.length + 4) }))
  return planilha
}

/**
 * B39-02: CSV para o Excel em português (PER-B39-07): ponto e vírgula entre colunas,
 * vírgula decimal sem separador de milhar, data dd/mm/aaaa e BOM para os acentos.
 */
export function gerarCsv<T>(colunas: ColunaPlanilha<T>[], linhas: T[]): string {
  const celula = (coluna: ColunaPlanilha<T>, linha: T): string => {
    const bruto = coluna.valor(linha)
    if (bruto === null || bruto === undefined || bruto === "") return ""
    if (coluna.tipo === "data") {
      const d = bruto as Date
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    }
    if (coluna.tipo === "moeda") return Number(bruto).toFixed(2).replace(".", ",")
    if (coluna.tipo === "numero") return String(bruto).replace(".", ",")
    const texto = String(bruto)
    return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const titulos = colunas.map((c) => (/[";]/.test(c.titulo) ? `"${c.titulo.replace(/"/g, '""')}"` : c.titulo))
  const corpo = linhas.map((linha) => colunas.map((c) => celula(c, linha)).join(";"))
  return "\uFEFF" + [titulos.join(";"), ...corpo].join("\r\n") + "\r\n"
}

/** B39-02: resposta HTTP que baixa o CSV. */
export function respostaCsv(conteudo: string, nomeArquivo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  })
}

/** Nome de arquivo seguro para o cabeçalho de download: ASCII, minúsculo, hífens. */
export function nomeDeArquivo(base: string, extensao = "xlsx"): string {
  const limpo = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${limpo || "exportacao"}.${extensao}`
}

/** Resposta HTTP que baixa a planilha. */
export function respostaPlanilha(bytes: Uint8Array, nomeArquivo: string): Response {
  // Copia para um Uint8Array de ArrayBuffer puro, o tipo que Response aceita.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  })
}
