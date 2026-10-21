// B32-05: exportação das vendas do período em Excel, no padrão da B30-04, e a
// tradução do período para a URL da rota de download (e de volta).

import type { ColunaPlanilha } from "@/lib/exportar-planilha"
import type { LinhaPorUf, PeriodoRelatorio, VendaDaTabela } from "./visao-geral"

function dataLocal(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d)
}

/** As mesmas colunas da tabela da tela, na mesma ordem. */
export const COLUNAS_EXPORTACAO_VENDAS: ColunaPlanilha<VendaDaTabela>[] = [
  { titulo: "Contato", tipo: "texto", valor: (v) => v.contato, largura: 32 },
  { titulo: "Telefone", tipo: "texto", valor: (v) => v.telefone, largura: 16 },
  { titulo: "Data", tipo: "data", valor: (v) => dataLocal(v.data) },
  { titulo: "Origem", tipo: "texto", valor: (v) => v.origem, largura: 16 },
  { titulo: "Atendente", tipo: "texto", valor: (v) => v.atendente, largura: 24 },
  { titulo: "Cidade", tipo: "texto", valor: (v) => v.cidade, largura: 20 },
  { titulo: "UF", tipo: "texto", valor: (v) => v.uf, largura: 6 },
  { titulo: "Peças", tipo: "numero", valor: (v) => v.pecas },
  { titulo: "Forma de pagamento", tipo: "texto", valor: (v) => v.formaPagamento, largura: 20 },
  { titulo: "Valor", tipo: "moeda", valor: (v) => v.valor, largura: 14 },
]

export const TITULOS_EXPORTACAO_VENDAS = COLUNAS_EXPORTACAO_VENDAS.map((c) => c.titulo)

/** Query string da rota de exportação para o filtro da tela. */
export function urlDeExportacao(periodo: PeriodoRelatorio, atendenteId: string | null): string {
  const q = new URLSearchParams()
  if (periodo.tipo === "ontem") q.set("tipo", "ontem")
  else {
    q.set("tipo", "meses")
    q.set("ano", String(periodo.ano))
    q.set("meses", periodo.meses.join(","))
  }
  if (atendenteId) q.set("atendente", atendenteId)
  return `/relatorios/vendas/exportar?${q.toString()}`
}

/** O período lido da query string; `null` quando não é válido. */
export function periodoDaUrl(q: URLSearchParams): PeriodoRelatorio | null {
  const tipo = q.get("tipo")
  if (tipo === "ontem") return { tipo: "ontem" }
  if (tipo !== "meses") return null
  const ano = Number(q.get("ano"))
  const meses = (q.get("meses") ?? "").split(",").filter(Boolean).map(Number)
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return null
  if (meses.length === 0 || meses.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) return null
  return { tipo: "meses", ano, meses: [...new Set(meses)] }
}

/** "vendas-outubro-2026", "vendas-jan-mar-2026" ou "vendas-ontem". */
export function nomeDaExportacao(periodo: PeriodoRelatorio): string {
  if (periodo.tipo === "ontem") return "vendas-ontem"
  const meses = [...periodo.meses].sort((a, b) => a - b)
  return meses.length === 1 ? `vendas-${meses[0]}-${periodo.ano}` : `vendas-${meses[0]}-a-${meses[meses.length - 1]}-${periodo.ano}`
}

// ---------- variação por UF (B32-06) ----------

export const COLUNAS_EXPORTACAO_POR_UF: ColunaPlanilha<LinhaPorUf>[] = [
  { titulo: "UF", tipo: "texto", valor: (l) => l.uf, largura: 10 },
  { titulo: "Clientes", tipo: "numero", valor: (l) => l.clientes },
  { titulo: "Cresc. clientes (ano ant.) %", tipo: "numero", valor: (l) => l.crescimentoClientes, largura: 28 },
  { titulo: "Vendas", tipo: "moeda", valor: (l) => l.vendas, largura: 16 },
  { titulo: "Cresc. vendas (ano ant.) %", tipo: "numero", valor: (l) => l.crescimentoVendas, largura: 26 },
  { titulo: "Ticket médio", tipo: "moeda", valor: (l) => l.ticketMedio, largura: 16 },
]

export const TITULOS_EXPORTACAO_POR_UF = COLUNAS_EXPORTACAO_POR_UF.map((c) => c.titulo)

export function urlDeExportacaoPorUf(periodo: PeriodoRelatorio, atendenteId: string | null): string {
  return urlDeExportacao(periodo, atendenteId).replace("/relatorios/vendas/exportar", "/relatorios/variacao-por-uf/exportar")
}
