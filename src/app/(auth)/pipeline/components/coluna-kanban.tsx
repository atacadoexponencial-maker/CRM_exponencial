"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { CardLeadItem } from "./card-lead"
import { cn } from "@/lib/utils"
import { resumoDaColuna } from "@/lib/card-parado"
import type { CardLead, CardCliente, CorColuna } from "../mock-pipeline"

type CardQualquer = CardLead | CardCliente

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// B36-05: a cor da etapa (B15-02) vira o traço embaixo do título da coluna, como no quadro
// Caderno. Classes inteiras: o Tailwind só gera o que encontra escrito.
const TRACO_COR: Record<CorColuna, { traco: string; titulo: string }> = {
  verde: { traco: "border-b-sucesso", titulo: "text-sucesso" },
  amarelo: { traco: "border-b-aviso", titulo: "text-aviso" },
  cinza: { traco: "border-b-muted-foreground/50", titulo: "text-muted-foreground" },
  laranja: { traco: "border-b-orange-600 dark:border-b-orange-400", titulo: "text-orange-700 dark:text-orange-300" },
  vermelho: { traco: "border-b-erro", titulo: "text-erro" },
}

interface ColunaKanbanProps {
  titulo: string
  etapaId: string
  cards: CardQualquer[]
  alertaVisual?: boolean
  cor?: CorColuna
  /** A etapa final de sucesso (Ganho) leva o traço grafite. */
  destaque?: boolean
  mensagemVazia?: string
  onCardClick?: (card: CardQualquer) => void
  onCardDrop?: (cardId: string, deEtapa: string, paraEtapa: string) => void
}

export function ColunaKanban({ titulo, etapaId, cards, alertaVisual, cor, destaque, mensagemVazia = "Nenhum lead nesta etapa", onCardClick, onCardDrop }: ColunaKanbanProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const estilo = alertaVisual ? TRACO_COR.vermelho : cor ? TRACO_COR[cor] : null
  const { quantidade, soma } = resumoDaColuna(cards)

  return (
    <section
      aria-label={titulo}
      data-etapa={etapaId}
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
        "flex w-64 shrink-0 flex-col border-r px-3 transition-colors first:border-l",
        isDragOver && "bg-muted/60"
      )}
    >
      <header
        className={cn(
          "flex flex-col gap-0.5 border-b-2 px-0.5 pb-2.5 pt-1",
          estilo ? estilo.traco : destaque ? "border-b-primary" : "border-b-border"
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", estilo?.titulo)}>
            {alertaVisual && <AlertTriangle className="size-3.5 shrink-0" />}
            {titulo}
          </span>
          <span className="numero text-xs text-muted-foreground" data-quantidade>{quantidade}</span>
        </span>
        <span className="numero text-xs text-muted-foreground" data-soma={soma}>{soma > 0 ? moeda(soma) : "—"}</span>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-3" style={{ maxHeight: "calc(100vh - 210px)" }}>
        {cards.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
            {mensagemVazia}
          </div>
        ) : (
          cards.map((card) => (
            <CardLeadItem key={card.id} card={card} onPainelAbrir={() => onCardClick?.(card)} />
          ))
        )}
      </div>
    </section>
  )
}
