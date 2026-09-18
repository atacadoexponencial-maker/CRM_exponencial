"use client"

// Medidor de consumo dos tetos (B4-01).
//
// Não existe primitivo de barra de progresso em `src/components/ui/`, e a issue
// pede para não instalar biblioteca de gráfico por causa disto: a barra é uma
// div com largura proporcional.
//
// A cor muda com a proporção porque é ela que comunica: 90% do teto da hora é
// um aviso, 30% não é nada. O número absoluto fica ao lado, porque "45 de 60" é
// o que o cliente confere.

const FAIXA = [
  { ate: 0.6, classe: "bg-emerald-500" },
  { ate: 0.85, classe: "bg-amber-500" },
  { ate: Infinity, classe: "bg-red-500" },
]

export function MedidorConsumo({
  rotulo,
  usado,
  teto,
  observacao,
}: {
  rotulo: string
  usado: number
  teto: number
  observacao?: string
}) {
  // Teto zero não acontece no gateway (o mínimo é 1), mas dividir por zero na
  // tela renderizaria "Infinity%" — e a tela não é lugar de descobrir isso.
  const proporcao = teto > 0 ? usado / teto : 0
  const porcento = Math.min(100, Math.round(proporcao * 100))
  const classe = FAIXA.find((f) => proporcao <= f.ate)!.classe

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium">{rotulo}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {usado} de {teto} <span className="text-xs">({porcento}%)</span>
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={rotulo}
        aria-valuenow={usado}
        aria-valuemin={0}
        aria-valuemax={teto}
      >
        <div className={`h-full rounded-full transition-[width] ${classe}`} style={{ width: `${porcento}%` }} />
      </div>

      {observacao && <p className="text-xs text-muted-foreground mt-1.5">{observacao}</p>}
    </div>
  )
}
