"use client"

import { MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { situacaoDoCard } from "@/lib/card-parado"
import { ETAPAS_RECOMPRA, type CardLead, type CardCliente, type CardDoFunil, type CorColuna } from "../etapas-e-tipos"

// Cards das colunas de risco da Recompra levam a cor da coluna (B15-02) num traço à
// esquerda. Classes inteiras para o Tailwind.
const TRACO_RISCO: Partial<Record<CorColuna, string>> = {
  amarelo: "border-l-2 border-l-aviso",
  cinza: "border-l-2 border-l-muted-foreground/50",
  laranja: "border-l-2 border-l-orange-600 dark:border-l-orange-400",
}

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

interface CardLeadProps {
  card: CardLead | CardCliente | CardDoFunil
  onPainelAbrir?: () => void
  /** B60: avisa o funil quando o arraste começa (true) e termina (false). */
  onArrastar?: (arrastando: boolean) => void
}

/**
 * B60: o navegador fotografa o card como ele aparece na tela, e a parte escondida pela
 * rolagem do quadro (ou da coluna) saía cortada. Uma cópia inteira, solta no body,
 * vira a imagem do arraste e sai logo depois que o navegador tira a foto.
 */
function imagemInteiraDoArraste(e: React.DragEvent<HTMLDivElement>) {
  const card = e.currentTarget
  const caixa = card.getBoundingClientRect()
  const copia = card.cloneNode(true) as HTMLElement
  Object.assign(copia.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
    width: `${caixa.width}px`,
    zIndex: "-1",
    pointerEvents: "none",
  })
  document.body.appendChild(copia)
  e.dataTransfer.setDragImage(copia, e.clientX - caixa.left, e.clientY - caixa.top)
  setTimeout(() => copia.remove(), 0)
}

/** B36-05: card do Caderno — nome, cidade, atendente, total já comprado e há quanto tempo está parado. */
export function CardLeadItem({ card, onPainelAbrir, onArrastar }: CardLeadProps) {
  const semAtendente = card.atendente === null
  const emRisco = card.etapa === "ativos_ri" || card.etapa === "inativos" || card.etapa === "inativos_rp"
  const corRisco = emRisco ? ETAPAS_RECOMPRA.find((e) => e.id === card.etapa)?.cor : undefined
  // "perdido" é do Funil de Entrada; "perdidos", da Recompra.
  const perdido = card.etapa === "perdido" || card.etapa === "perdidos"
  const router = useRouter()
  const situacao = card.etapaDesde ? situacaoDoCard(card.etapaDesde, card.limiteParadoDias ?? null) : { texto: card.tempoNaEtapa, parado: false }

  return (
    <div
      draggable={true}
      data-card={card.id}
      onDragStart={(e) => {
        e.dataTransfer.setData("cardId", card.id)
        e.dataTransfer.setData("deEtapa", card.etapa)
        e.dataTransfer.effectAllowed = "move"
        imagemInteiraDoArraste(e)
        // Mexer na tela dentro do dragstart pode cancelar o arraste no Chrome
        setTimeout(() => onArrastar?.(true), 0)
      }}
      onDragEnd={() => onArrastar?.(false)}
      onClick={onPainelAbrir}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded-md border bg-card px-3 py-2.5 transition-colors hover:border-muted-foreground/50",
        corRisco && TRACO_RISCO[corRisco],
        perdido && "opacity-60",
        semAtendente && !emRisco && !perdido && "border-l-2 border-l-aviso"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-medium leading-snug [overflow-wrap:anywhere]">{card.contato.nome}</span>
        <button
          aria-label="Abrir conversa"
          disabled={!card.conversaId}
          className={cn(
            "mt-0.5 shrink-0 text-muted-foreground transition-colors",
            card.conversaId ? "cursor-pointer hover:text-foreground" : "cursor-not-allowed opacity-50"
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (card.conversaId) router.push(`/chat?conversa=${card.conversaId}`)
          }}
        >
          <MessageSquare className="size-3.5" />
        </button>
      </div>

      <span className="truncate text-xs text-muted-foreground">
        {card.cidade ?? "Sem cidade"} ·{" "}
        <span className={cn(semAtendente && "font-medium text-aviso")}>{semAtendente ? "Sem atendente" : card.atendente}</span>
      </span>

      {card.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.etiquetas.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium"
              style={{ backgroundColor: e.cor + "20", color: e.cor }}
            >
              {e.nome}
            </span>
          ))}
        </div>
      )}

      <div className="mt-0.5 flex items-center justify-between gap-2 border-t border-dashed pt-1.5 text-xs">
        <span className="numero" data-total={card.totalComprado ?? 0}>{card.totalComprado ? moeda(card.totalComprado) : "—"}</span>
        <span data-parado={situacao.parado || undefined} suppressHydrationWarning className={cn("numero", situacao.parado ? "font-medium text-queda" : "text-muted-foreground")}>
          {situacao.texto}
        </span>
      </div>
    </div>
  )
}
