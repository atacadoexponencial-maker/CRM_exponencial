"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { CardLeadItem } from "./card-lead"
import { cn } from "@/lib/utils"
import type { CardLead, CardCliente, CorColuna } from "../mock-pipeline"

type CardQualquer = CardLead | CardCliente

// Classes inteiras (o Tailwind só gera o que encontra escrito). Tema sempre escuro.
const CLASSES_COR: Record<CorColuna, { borda: string; titulo: string }> = {
  verde: { borda: "border-emerald-500/40", titulo: "text-emerald-400" },
  amarelo: { borda: "border-yellow-500/40", titulo: "text-yellow-400" },
  cinza: { borda: "border-zinc-400/40", titulo: "text-zinc-300" },
  laranja: { borda: "border-orange-500/40", titulo: "text-orange-400" },
  vermelho: { borda: "border-red-500/40", titulo: "text-red-400" },
}

interface ColunaKanbanProps {
  titulo: string
  etapaId: string
  cards: CardQualquer[]
  alertaVisual?: boolean
  cor?: CorColuna
  mensagemVazia?: string
  onCardClick?: (card: CardQualquer) => void
  onCardDrop?: (cardId: string, deEtapa: string, paraEtapa: string) => void
}

export function ColunaKanban({ titulo, etapaId, cards, alertaVisual, cor, mensagemVazia = "Nenhum lead nesta etapa", onCardClick, onCardDrop }: ColunaKanbanProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const classesCor = alertaVisual ? CLASSES_COR.vermelho : cor ? CLASSES_COR[cor] : null

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const cardId = e.dataTransfer.getData("cardId")
        const deEtapa = e.dataTransfer.getData("deEtapa")
        if (cardId && deEtapa !== etapaId) {
          onCardDrop?.(cardId, deEtapa, etapaId)
        }
      }}
      className={cn(
        "flex flex-col w-64 shrink-0 bg-muted/30 rounded-lg border overflow-hidden transition-all",
        classesCor ? classesCor.borda : "border-border",
        isDragOver && "ring-2 ring-primary/40"
      )}
    >
      <div className={cn(
        "flex items-center justify-between px-3 py-2.5 border-b bg-muted/50",
        classesCor ? classesCor.borda : "border-border"
      )}>
        <div className="flex items-center gap-1.5">
          {alertaVisual && <AlertTriangle className="size-3 text-red-400 shrink-0" />}
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            classesCor ? classesCor.titulo : "text-muted-foreground"
          )}>
            {titulo}
          </span>
        </div>
        <span className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 tabular-nums">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/60">
            {mensagemVazia}
          </div>
        ) : (
          cards.map((card) => (
            <CardLeadItem key={card.id} card={card} onPainelAbrir={() => onCardClick?.(card)} />
          ))
        )}
      </div>
    </div>
  )
}
