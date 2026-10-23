"use client"

import { useState } from "react"
import { AlertTriangle, Plus } from "lucide-react"
import { CardLeadItem } from "./card-lead"
import { cn } from "@/lib/utils"
import { resumoDaColuna } from "@/lib/card-parado"
import { ehCorPronta, ehCorPropria, estiloDaCorPropria } from "@/lib/funis"
import type { CardLead, CardCliente, CardDoFunil } from "../mock-pipeline"

type CardQualquer = CardLead | CardCliente | CardDoFunil

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

// B36-05: a cor da etapa (B15-02) vira o traço embaixo do título da coluna, como no quadro
// Caderno. Classes inteiras: o Tailwind só gera o que encontra escrito.
const TRACO_COR: Record<"verde" | "amarelo" | "cinza" | "laranja" | "vermelho", { traco: string; titulo: string }> = {
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
  /** Cor pronta da paleta ou, nos funis da empresa (B41-01), cor própria "#rrggbb". */
  cor?: string | null
  /** A etapa final de sucesso (Ganho) leva o traço grafite. */
  destaque?: boolean
  mensagemVazia?: string
  onCardClick?: (card: CardQualquer) => void
  onCardDrop?: (cardId: string, deEtapa: string, paraEtapa: string) => void
  /** "+" no topo da coluna: cria o card direto nesta etapa. Sem ele, a coluna não tem o botão. */
  onAdicionar?: () => void
}

export function ColunaKanban({ titulo, etapaId, cards, alertaVisual, cor, destaque, mensagemVazia = "Nenhum lead nesta etapa", onCardClick, onCardDrop, onAdicionar }: ColunaKanbanProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const estilo = alertaVisual ? TRACO_COR.vermelho : cor && ehCorPronta(cor) ? TRACO_COR[cor] : null
  // B41-01: cor própria pinta o título da coluna; o texto fica preto ou branco, o que
  // ler melhor sobre a cor (CA-B41-42).
  const propria = !alertaVisual && cor && ehCorPropria(cor) ? estiloDaCorPropria(cor) : null
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
        data-cor-propria={propria ? propria.fundo : undefined}
        style={propria ? { backgroundColor: propria.fundo, color: propria.texto, borderBottomColor: propria.fundo } : undefined}
        className={cn(
          "flex flex-col gap-0.5 border-b-2 px-0.5 pb-2.5 pt-1",
          propria ? "rounded-t-md px-2" : estilo ? estilo.traco : destaque ? "border-b-primary" : "border-b-border"
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className={cn("flex items-center gap-1.5 text-sm font-semibold", estilo?.titulo)}>
            {alertaVisual && <AlertTriangle className="size-3.5 shrink-0" />}
            {titulo}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("numero text-xs", !propria && "text-muted-foreground")} data-quantidade>{quantidade}</span>
            {onAdicionar && (
              <button
                type="button"
                aria-label={`Adicionar card em ${titulo}`}
                title={`Adicionar card em ${titulo}`}
                onClick={onAdicionar}
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded transition-colors",
                  propria ? "hover:bg-black/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Plus className="size-3.5" />
              </button>
            )}
          </span>
        </span>
        <span className={cn("numero text-xs", !propria && "text-muted-foreground")} data-soma={soma}>{soma > 0 ? moeda(soma) : "—"}</span>
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
