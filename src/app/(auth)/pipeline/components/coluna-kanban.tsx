import { CardLeadItem } from "./card-lead"
import type { CardLead } from "../mock-pipeline"

interface ColunaKanbanProps {
  titulo: string
  cards: CardLead[]
}

export function ColunaKanban({ titulo, cards }: ColunaKanbanProps) {
  return (
    <div className="flex flex-col w-64 shrink-0 bg-muted/30 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/50">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </span>
        <span className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 tabular-nums">
          {cards.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/60">
            Nenhum lead nesta etapa
          </div>
        ) : (
          cards.map((card) => (
            <CardLeadItem key={card.id} card={card} />
          ))
        )}
      </div>
    </div>
  )
}
