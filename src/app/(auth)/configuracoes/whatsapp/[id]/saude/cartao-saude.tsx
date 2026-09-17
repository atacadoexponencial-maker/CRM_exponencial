"use client"

// Cartão de saúde do número (B4-01): estado da conexão, tempo conectado e
// volume enviado na hora e no dia.
//
// O tempo conectado é das últimas 24 horas, não desde sempre: é o que diz se a
// conexão está estável agora. Número que caiu três vezes hoje aparece aqui
// mesmo estando conectado neste instante.

import { Clock, MessageSquare, Plug } from "lucide-react"
import { EstadoBadge } from "../../canal-direto/estado-badge"
import { formatarNumero } from "../../canal-direto/cartao-numero"
import type { SaudeDoNumero } from "./tipos"

/** 82_800_000 ms → "23h00". Mostra minutos porque queda curta importa. */
export function duracaoHumana(ms: number): string {
  const minutos = Math.round(ms / 60_000)
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  return `${h}h${String(m).padStart(2, "0")}`
}

export function CartaoSaude({ saude }: { saude: SaudeDoNumero }) {
  const percentualDoDia = Math.round((saude.tempoConectado24hMs / (24 * 60 * 60 * 1000)) * 100)

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{formatarNumero(saude.numero)}</p>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {saude.nomeExibicao ?? "Sem nome de exibição"}
          </p>
        </div>
        <EstadoBadge estado={saude.estado} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plug className="size-3.5 shrink-0" aria-hidden />
            Conectado nas últimas 24h
          </dt>
          <dd className="mt-1 text-base font-medium tabular-nums">
            {duracaoHumana(saude.tempoConectado24hMs)}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({percentualDoDia}% do dia)
            </span>
          </dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0" aria-hidden />
            Enviadas na última hora
          </dt>
          <dd className="mt-1 text-base font-medium tabular-nums">{saude.enviadasNaHora}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5 shrink-0" aria-hidden />
            Enviadas nas últimas 24h
          </dt>
          <dd className="mt-1 text-base font-medium tabular-nums">
            {saude.enviadasNoDia}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              · {saude.recebidasNoDia} recebidas
            </span>
          </dd>
        </div>
      </dl>
    </div>
  )
}
