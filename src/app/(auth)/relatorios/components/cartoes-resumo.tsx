"use client"

// B32-03: os dez cartões da Visão Geral, com "vs mês passado" e "vs ano passado".

import type { Cartao, Comparativo, FormatoCartao } from "@/lib/relatorios/visao-geral"

export function formatarValor(valor: number | null, formato: FormatoCartao): string {
  if (valor === null) return "—"
  if (formato === "moeda") return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  if (formato === "decimal") return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return valor.toLocaleString("pt-BR")
}

export function formatarPercentual(p: number | null): string {
  if (p === null) return "—"
  const sinal = p > 0 ? "+" : p < 0 ? "−" : ""
  return `${sinal}${Math.abs(p).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function LinhaComparativo({ rotulo, comparativo, formato }: { rotulo: string; comparativo: Comparativo; formato: FormatoCartao }) {
  const p = comparativo.percentual
  const cor = p === null || p === 0 ? "text-muted-foreground" : p > 0 ? "text-alta" : "text-queda"
  return (
    <span
      className="text-xs text-muted-foreground"
      title={`${comparativo.rotulo}: ${formatarValor(comparativo.valorComparado, formato)}`}
    >
      {rotulo}: <span className={`font-medium ${cor}`}>{formatarPercentual(p)}</span>
    </span>
  )
}

/** B46-10: os cartões de faturamento dizem de quando são (`01/10 a 27/10`). */
const CARTOES_DE_FATURAMENTO = ["faturamentoBruto", "faturamentoLiquido"]

export function CartoesResumo({ cartoes, periodo }: { cartoes: Cartao[]; periodo?: string }) {
  return (
    // B36-07: faixa de números do Caderno — linha grossa em cima, linhas finas entre as linhas.
    <div className="grid grid-cols-2 border-t-2 border-t-foreground lg:grid-cols-5" data-testid="cartoes-resumo">
      {cartoes.map((c) => (
        <div key={c.id} className="flex flex-col gap-1 border-b py-4 pr-4" data-testid={`cartao-${c.id}`}>
          <span className="text-xs text-muted-foreground">
            {c.titulo}
            {periodo && CARTOES_DE_FATURAMENTO.includes(c.id) && <span className="block">{periodo}</span>}
          </span>
          <span className="numero text-[22px] font-medium leading-tight tracking-tight">{formatarValor(c.valor, c.formato)}</span>
          {c.vsMesPassado && <LinhaComparativo rotulo="vs mês passado" comparativo={c.vsMesPassado} formato={c.formato} />}
          {c.vsAnoPassado && <LinhaComparativo rotulo="vs ano passado" comparativo={c.vsAnoPassado} formato={c.formato} />}
        </div>
      ))}
    </div>
  )
}
