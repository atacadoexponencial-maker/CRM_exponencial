"use client"

import { MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ETAPAS_RECOMPRA, type CardLead, type CardCliente, type CorColuna } from "../mock-pipeline"

// Cards das colunas de risco da Recompra levam a cor da coluna (B15-02). Classes inteiras para o Tailwind.
const DESTAQUE_RISCO: Partial<Record<CorColuna, string>> = {
  amarelo: "border-l-2 border-l-yellow-500 bg-yellow-500/5",
  cinza: "border-l-2 border-l-zinc-400 bg-zinc-400/5",
  laranja: "border-l-2 border-l-orange-500 bg-orange-500/5",
}

interface CardLeadProps {
  card: CardLead | CardCliente
  onPainelAbrir?: () => void
}

export function CardLeadItem({ card, onPainelAbrir }: CardLeadProps) {
  const semAtendente = card.atendente === null
  const emRisco = card.etapa === "ativos_ri" || card.etapa === "inativos" || card.etapa === "inativos_rp"
  const corRisco = emRisco ? ETAPAS_RECOMPRA.find((e) => e.id === card.etapa)?.cor : undefined
  // "perdido" é do Funil de Entrada; "perdidos", da Recompra.
  const perdido = card.etapa === "perdido" || card.etapa === "perdidos"
  const router = useRouter()

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("cardId", card.id)
        e.dataTransfer.setData("deEtapa", card.etapa)
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={onPainelAbrir}
      className={cn(
        "bg-card rounded-lg border border-border p-3 flex flex-col gap-2 cursor-pointer hover:border-muted-foreground/40 transition-colors",
        corRisco && DESTAQUE_RISCO[corRisco],
        perdido && "border-l-2 border-l-muted-foreground/40 opacity-60",
        semAtendente && !emRisco && !perdido && "border-l-2 border-l-amber-500"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{card.contato.nome}</span>
        <button
          aria-label="Abrir conversa"
          disabled={!card.conversaId}
          className={cn(
            "shrink-0 text-muted-foreground transition-colors mt-0.5",
            card.conversaId ? "hover:text-foreground cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (card.conversaId) router.push(`/chat?conversa=${card.conversaId}`)
          }}
        >
          <MessageSquare className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground shrink-0">
          {semAtendente ? "?" : card.atendente![0].toUpperCase()}
        </div>
        <span
          className={cn(
            "text-xs truncate",
            semAtendente ? "text-amber-400 font-medium" : "text-muted-foreground"
          )}
        >
          {semAtendente ? "Sem atendente" : card.atendente}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{card.tempoNaEtapa}</span>
        {card.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {card.etiquetas.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium"
                style={{ backgroundColor: e.cor + "20", color: e.cor }}
              >
                {e.nome}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
