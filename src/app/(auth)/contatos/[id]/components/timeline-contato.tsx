"use client"

import { useState } from "react"
import { MessageSquare, GitBranch, ArrowRight, FileText, ShoppingBag, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { type EventoTimeline, type TipoEvento, TIPOS_EVENTO } from "../../mock-contatos"

const EVENTO_ICONE: Record<TipoEvento, React.ReactNode> = {
  conversa_iniciada: <MessageSquare className="size-3.5" />,
  card_criado: <GitBranch className="size-3.5" />,
  mudanca_etapa: <ArrowRight className="size-3.5" />,
  nota_interna: <FileText className="size-3.5" />,
  compra_registrada: <ShoppingBag className="size-3.5" />,
  dados_editados: <Pencil className="size-3.5" />,
}

const EVENTO_COR: Record<TipoEvento, string> = {
  conversa_iniciada: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  card_criado: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  mudanca_etapa: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  nota_interna: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  compra_registrada: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  dados_editados: "bg-secondary text-muted-foreground",
}

const FILTROS: { label: string; valor: TipoEvento | "todos" }[] = [
  { label: "Todos", valor: "todos" },
  { label: "Conversa", valor: "conversa_iniciada" },
  { label: "Pipeline", valor: "card_criado" },
  { label: "Etapa", valor: "mudanca_etapa" },
  { label: "Nota interna", valor: "nota_interna" },
  { label: "Compra", valor: "compra_registrada" },
  { label: "Dados editados", valor: "dados_editados" },
]

interface TimelineContatoProps {
  eventos: EventoTimeline[]
}

export function TimelineContato({ eventos }: TimelineContatoProps) {
  const [filtro, setFiltro] = useState<TipoEvento | "todos">("todos")

  if (eventos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
  }

  const eventosFiltrados = filtro === "todos"
    ? eventos
    : eventos.filter((e) => e.tipo === filtro)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-1 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md border transition-colors",
              filtro === f.valor
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
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
