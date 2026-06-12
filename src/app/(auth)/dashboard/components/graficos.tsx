"use client"

// Gráficos leves em CSS puro — sem dependência de biblioteca de charts.

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

export function GraficoFunil({
  etapas,
}: {
  etapas: Array<{ label: string; quantidade: number; percentualDaAnterior: number | null }>
}) {
  const max = Math.max(...etapas.map((e) => e.quantidade), 1)
  return (
    <div className="flex flex-col gap-1.5">
      {etapas.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-32 shrink-0 text-xs text-muted-foreground truncate">{e.label}</span>
          <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden">
            <div
              className="h-full rounded-md bg-primary/80 flex items-center px-2"
              style={{ width: `${Math.max((e.quantidade / max) * 100, 4)}%` }}
            >
              <span className="text-[11px] font-medium text-primary-foreground">{e.quantidade}</span>
            </div>
          </div>
          <span className="w-12 shrink-0 text-xs text-muted-foreground text-right">
            {e.percentualDaAnterior !== null ? `${e.percentualDaAnterior}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  )
}

export function GraficoDonut({ dados }: { dados: Array<{ label: string; valor: number; cor: string }> }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)

  let acumulado = 0
  const fatias = dados
    .filter((d) => d.valor > 0)
    .map((d) => {
      const inicio = (acumulado / Math.max(total, 1)) * 360
      acumulado += d.valor
      const fim = (acumulado / Math.max(total, 1)) * 360
      return `${d.cor} ${inicio}deg ${fim}deg`
    })

  return (
    <div className="flex items-center gap-6">
      <div
        className="h-28 w-28 rounded-full shrink-0"
        style={{
          background: total > 0 ? `conic-gradient(${fatias.join(", ")})` : "var(--muted)",
          mask: "radial-gradient(circle at center, transparent 38%, black 39%)",
          WebkitMask: "radial-gradient(circle at center, transparent 38%, black 39%)",
        }}
        role="img"
        aria-label="Distribuição de clientes"
      />
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
