"use client"

// Gráficos do dashboard. Donut e funil usam Recharts (B30-05), a biblioteca dos
// relatórios; o gráfico de barras das semanas segue em CSS puro.

import { Bar, BarChart, Cell, LabelList, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts"

export function GraficoBarras({ dados }: { dados: Array<{ label: string; valor: number }> }) {
  const max = Math.max(...dados.map((d) => d.valor), 1)
  return (
    <div className="flex items-end gap-2 h-36 pt-2">
      {dados.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs text-muted-foreground">{d.valor}</span>
          <div
            className="w-full rounded-t-md bg-primary/80 transition-all"
            style={{ height: `${Math.max((d.valor / max) * 100, 2)}%` }}
            title={`${d.label}: ${d.valor}`}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Balão do tema escuro: o padrão da biblioteca é branco com texto escuro. Os relatórios (B32-04) reutilizam. */
export function Balao({ linhas }: { linhas: Array<{ rotulo: string; valor: string }> }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {linhas.map((l) => (
        <div key={l.rotulo} className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">{l.rotulo}</span>
          <span className="font-semibold tabular-nums">{l.valor}</span>
        </div>
      ))}
    </div>
  )
}

type Etapa = { label: string; quantidade: number; percentualDaAnterior: number | null }

const ALTURA_LINHA_FUNIL = 30

export function GraficoFunil({ etapas }: { etapas: Etapa[] }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0">
        <BarChart
          data={etapas}
          layout="vertical"
          width={520}
          height={etapas.length * ALTURA_LINHA_FUNIL + 8}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          barCategoryGap={6}
          responsive
          style={{ width: "100%", maxWidth: "100%" }}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            interval={0}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              const e = payload?.[0]?.payload as Etapa | undefined
              if (!active || !e) return null
              return (
                <Balao
                  linhas={[
                    { rotulo: e.label, valor: String(e.quantidade) },
                    { rotulo: "Sobre a etapa anterior", valor: e.percentualDaAnterior !== null ? `${e.percentualDaAnterior}%` : "—" },
                  ]}
                />
              )
            }}
          />
          <Bar
            dataKey="quantidade"
            fill="var(--primary)"
            fillOpacity={0.8}
            radius={4}
            minPointSize={6}
            isAnimationActive={false}
            activeBar={{ fillOpacity: 1 }}
          >
            <LabelList dataKey="quantidade" position="insideLeft" fill="var(--primary-foreground)" fontSize={11} fontWeight={500} offset={8} />
          </Bar>
        </BarChart>
      </div>
      <div className="flex flex-col shrink-0" style={{ paddingTop: 4 }}>
        {etapas.map((e, i) => (
          <span key={i} className="w-12 text-xs text-muted-foreground text-right flex items-center justify-end" style={{ height: ALTURA_LINHA_FUNIL }}>
            {e.percentualDaAnterior !== null ? `${e.percentualDaAnterior}%` : "—"}
          </span>
        ))}
      </div>
    </div>
  )
}

export function GraficoDonut({ dados }: { dados: Array<{ label: string; valor: number; cor: string }> }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  const fatias = dados.filter((d) => d.valor > 0)

  return (
    <div className="flex items-center gap-6">
      <div className="h-28 w-28 shrink-0" role="img" aria-label="Distribuição de clientes">
        <PieChart width={112} height={112} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {total > 0 ? (
            <Pie
              data={fatias}
              dataKey="valor"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={56}
              paddingAngle={fatias.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {fatias.map((d) => (
                <Cell key={d.label} fill={d.cor} />
              ))}
            </Pie>
          ) : (
            <Pie data={[{ label: "Sem dados", valor: 1 }]} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={40} outerRadius={56} fill="var(--muted)" stroke="none" isAnimationActive={false} />
          )}
          {total > 0 && (
            <Tooltip
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as { label: string; valor: number } | undefined
                if (!active || !d) return null
                return <Balao linhas={[{ rotulo: d.label, valor: `${d.valor} (${Math.round((d.valor / total) * 100)}%)` }]} />
              }}
            />
          )}
        </PieChart>
      </div>
      <div className="flex flex-col gap-1.5">
        {dados.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-medium">{d.valor}</span>
            {total > 0 && (
              <span className="text-muted-foreground">({Math.round((d.valor / total) * 100)}%)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardMetrica({
  titulo,
  valor,
  sufixo,
}: {
  titulo: string
  valor: string | number | null
  sufixo?: string
}) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{titulo}</span>
      <span className="text-2xl font-semibold">
        {valor === null ? "—" : valor}
        {valor !== null && sufixo ? <span className="text-base font-normal text-muted-foreground ml-0.5">{sufixo}</span> : null}
      </span>
    </div>
  )
}

export function formatarMoeda(valor: number | null): string | null {
  if (valor === null) return null
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
