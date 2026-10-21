"use client"

// B32-06: valor vendido nos últimos 25 meses, com a variação contra o mesmo mês do ano anterior.

import { Bar, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts"
import { Balao } from "@/app/(auth)/dashboard/components/graficos"
import type { MesDoHistorico } from "@/lib/relatorios/visao-geral"

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const eixoMoeda = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))
const percentual = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)
const TICK = { fill: "var(--muted-foreground)", fontSize: 11 }

export function Grafico25Meses({ meses }: { meses: MesDoHistorico[] }) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Valor vendido ao longo do tempo</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
        Sempre os últimos 25 meses, com a variação contra o mesmo mês do ano anterior. Ignora o período; segue o atendente. O mês atual conta até ontem.
      </p>
      <ComposedChart data={meses} width={900} height={260} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} responsive style={{ width: "100%", maxWidth: "100%" }}>
        <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={TICK} interval={2} />
        <YAxis yAxisId="valor" tickLine={false} axisLine={false} tick={TICK} tickFormatter={eixoMoeda} width={48} />
        <YAxis yAxisId="variacao" orientation="right" tickLine={false} axisLine={false} tick={TICK} tickFormatter={(v: number) => `${v}%`} width={48} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={({ active, payload }) => {
            const m = payload?.[0]?.payload as MesDoHistorico | undefined
            if (!active || !m) return null
            return <Balao linhas={[{ rotulo: m.rotulo, valor: moeda(m.valor) }, { rotulo: "Variação (ano anterior)", valor: percentual(m.variacao) }]} />
          }}
        />
        <Bar yAxisId="valor" dataKey="valor" name="Valor vendido" fill="var(--primary)" fillOpacity={0.8} radius={3} isAnimationActive={false} activeBar={{ fillOpacity: 1 }} />
        <Line yAxisId="variacao" type="monotone" dataKey="variacao" name="Variação (%)" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Valor vendido</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#22c55e" }} /> Variação (%)</span>
      </div>
    </section>
  )
}
