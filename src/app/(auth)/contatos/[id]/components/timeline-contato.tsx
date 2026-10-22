"use client"

import { useState } from "react"
import { MessageSquare, GitBranch, ArrowRight, FileText, ShoppingBag, Pencil, Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { type EventoTimeline, type TipoEvento, TIPOS_EVENTO } from "../../mock-contatos"

const EVENTO_ICONE: Record<TipoEvento, React.ReactNode> = {
  conversa_iniciada: <MessageSquare className="size-3.5" />,
  card_criado: <GitBranch className="size-3.5" />,
  mudanca_etapa: <ArrowRight className="size-3.5" />,
  nota_interna: <FileText className="size-3.5" />,
  compra_registrada: <ShoppingBag className="size-3.5" />,
  pedido_catalogo: <Store className="size-3.5" />,
  dados_editados: <Pencil className="size-3.5" />,
}

const EVENTO_COR: Record<TipoEvento, string> = {
  conversa_iniciada: "bg-info-fundo text-info",
  card_criado: "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300",
  mudanca_etapa: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300",
  nota_interna: "bg-aviso-fundo text-aviso",
  compra_registrada: "bg-sucesso-fundo text-sucesso",
  pedido_catalogo: "bg-info-fundo text-info",
  dados_editados: "bg-secondary text-muted-foreground",
}

const FILTROS: { label: string; valor: TipoEvento | "todos" }[] = [
  { label: "Todos", valor: "todos" },
  { label: "Conversa", valor: "conversa_iniciada" },
  { label: "Pipeline", valor: "card_criado" },
  { label: "Etapa", valor: "mudanca_etapa" },
  { label: "Nota interna", valor: "nota_interna" },
  { label: "Compra", valor: "compra_registrada" },
  { label: "Pedido do catálogo", valor: "pedido_catalogo" },
  { label: "Dados editados", valor: "dados_editados" },
]

interface TimelineContatoProps {
  eventos: EventoTimeline[]
}

export function TimelineContato({ eventos }: TimelineContatoProps) {
  const [filtros, setFiltros] = useState<Set<TipoEvento>>(new Set())

  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
  }

  const eventosFiltrados = filtros.size === 0
    ? eventos
    : eventos.filter((e) => filtros.has(e.tipo))

  function toggleFiltro(valor: TipoEvento | "todos") {
    if (valor === "todos") {
      setFiltros(new Set())
      return
    }
    setFiltros((prev) => {
      const next = new Set(prev)
      if (next.has(valor)) {
        next.delete(valor)
      } else {
        next.add(valor)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-1 flex-wrap">
        {FILTROS.map((f) => {
          const ativo = f.valor === "todos" ? filtros.size === 0 : filtros.has(f.valor as TipoEvento)
          return (
            <button
              key={f.valor}
              onClick={() => toggleFiltro(f.valor)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                ativo
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {eventosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento encontrado para este filtro</p>
      ) : (
        <div className="flex flex-col gap-0 relative">
          {/* Linha vertical */}
          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-border" />

          {eventosFiltrados.map((evento) => (
            <div key={evento.id} className="flex gap-3 py-3 relative">
              {/* Ícone */}
              <div className={cn(
                "shrink-0 size-9 rounded-full flex items-center justify-center border border-border relative z-10",
                EVENTO_COR[evento.tipo]
              )}>
                {EVENTO_ICONE[evento.tipo]}
              </div>

              {/* Conteúdo */}
              <div className="flex flex-col gap-0.5 pt-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">
                    {TIPOS_EVENTO[evento.tipo]}
                  </span>
                  <span className="text-xs text-muted-foreground">{evento.data}</span>
                </div>
                <p className="text-sm text-foreground">{evento.descricao}</p>
                <p className="text-xs text-muted-foreground">{evento.responsavel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
