// B39-02: exportação da tela Pedidos. Colunas das abas "Pedidos" e "Itens", prontas para
// `gerarPlanilhaComAbas` e `gerarCsv`, o nome do arquivo e os filtros levados na URL.

import type { PedidoResumo } from "@/app/(auth)/catalogo/components/lista-pedidos"
import { ROTULO_SITUACAO } from "@/app/(auth)/catalogo/components/situacao-pedido"
import { FUSO_DA_OPERACAO } from "@/lib/datas"
import type { ColunaPlanilha } from "@/lib/exportar-planilha"
import { FILTROS_PADRAO, type FiltrosPedidos } from "@/lib/catalogo/filtros-pedidos"

export type FormatoExportacao = "xlsx" | "csv-pedidos" | "csv-itens"
export type EscopoExportacao = "filtrados" | "todos"

export interface ItemExportado {
  numero: number
  criadoEm: string
  cliente: string
  produto: string
  variacao: string
  quantidade: number
  precoUnitario: number
  /** Ordem do item dentro do pedido (a do carrinho). */
  posicao: number
}

const partesDoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_DA_OPERACAO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Dia do pedido em Brasília, como Date local à meia-noite (o mesmo jeito das compras). */
export function diaDoPedido(iso: string): Date {
  const [ano, mes, dia] = partesDoDia.format(new Date(iso)).split("-").map(Number)
  return new Date(ano, mes - 1, dia)
}

export const COLUNAS_PEDIDOS: ColunaPlanilha<PedidoResumo>[] = [
  { titulo: "Número", tipo: "numero", valor: (p) => p.numero },
  { titulo: "Data", tipo: "data", valor: (p) => diaDoPedido(p.criadoEm) },
  { titulo: "Cliente", tipo: "texto", valor: (p) => p.cliente.nome, largura: 28 },
  { titulo: "WhatsApp", tipo: "texto", valor: (p) => p.cliente.whatsapp, largura: 16 },
  { titulo: "Peças", tipo: "numero", valor: (p) => p.pecas },
  { titulo: "Desconto", tipo: "moeda", valor: (p) => p.desconto?.valor ?? null, largura: 14 },
  { titulo: "Total", tipo: "moeda", valor: (p) => p.total, largura: 14 },
  { titulo: "Situação", tipo: "texto", valor: (p) => ROTULO_SITUACAO[p.situacao] },
]

export const COLUNAS_ITENS: ColunaPlanilha<ItemExportado>[] = [
  { titulo: "Pedido", tipo: "numero", valor: (i) => i.numero },
  { titulo: "Data", tipo: "data", valor: (i) => diaDoPedido(i.criadoEm) },
  { titulo: "Cliente", tipo: "texto", valor: (i) => i.cliente, largura: 28 },
  { titulo: "Produto", tipo: "texto", valor: (i) => i.produto, largura: 28 },
  { titulo: "Variação", tipo: "texto", valor: (i) => i.variacao || null, largura: 20 },
  { titulo: "Quantidade", tipo: "numero", valor: (i) => i.quantidade },
  { titulo: "Preço unitário", tipo: "moeda", valor: (i) => i.precoUnitario, largura: 16 },
  { titulo: "Subtotal", tipo: "moeda", valor: (i) => Math.round(i.quantidade * i.precoUnitario * 100) / 100, largura: 14 },
]

const BASE_DO_PERIODO: Record<FiltrosPedidos["periodo"], string> = {
  hoje: "pedidos-hoje",
  "7": "pedidos-ultimos-7-dias",
  "30": "pedidos-ultimos-30-dias",
  tudo: "pedidos-filtrados",
  personalizado: "pedidos",
}

/** Nome do arquivo (CA-B39-18): diz o período, "todos" ou "-itens". */
export function nomeDaExportacao(formato: FormatoExportacao, escopo: EscopoExportacao, filtros: FiltrosPedidos): string {
  const base =
    escopo === "todos"
      ? "pedidos-todos"
      : filtros.periodo === "personalizado"
        ? `pedidos-${filtros.de}-a-${filtros.ate}`
        : BASE_DO_PERIODO[filtros.periodo]
  return formato === "xlsx" ? `${base}.xlsx` : `${base}${formato === "csv-itens" ? "-itens" : ""}.csv`
}

const CAMPOS = Object.keys(FILTROS_PADRAO) as Array<keyof FiltrosPedidos>

/** Filtros da tela lidos da URL da exportação; o que faltar fica no padrão. */
export function filtrosDaUrl(q: URLSearchParams): FiltrosPedidos {
  const filtros = { ...FILTROS_PADRAO }
  for (const campo of CAMPOS) {
    const valor = q.get(campo)
    if (valor !== null) (filtros as Record<string, string>)[campo] = valor
  }
  return filtros
}

/** Endereço que baixa a exportação com os filtros da tela. */
export function urlDaExportacao(formato: FormatoExportacao, escopo: EscopoExportacao, filtros: FiltrosPedidos): string {
  const q = new URLSearchParams({ formato, escopo })
  if (escopo === "filtrados") {
    for (const campo of CAMPOS) if (filtros[campo] !== FILTROS_PADRAO[campo]) q.set(campo, filtros[campo])
    // O padrão do período também vai, para o nome do arquivo não depender dele.
    q.set("periodo", filtros.periodo)
  }
  return `/catalogo/pedidos/exportar?${q.toString()}`
}
