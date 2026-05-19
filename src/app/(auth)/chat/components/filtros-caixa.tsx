"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { ItemConversa } from "./item-conversa"
import type { Conversa, FiltroStatus, FiltroVisibilidade } from "../mock-conversas"

const FILTROS_STATUS: { label: string; valor: FiltroStatus }[] = [
  { label: "Todas", valor: "todas" },
  { label: "Em espera", valor: "em_espera" },
  { label: "Em atendimento", valor: "em_atendimento" },
  { label: "Resolvidas", valor: "resolvida" },
]

const FILTROS_VISIBILIDADE: { label: string; valor: FiltroVisibilidade }[] = [
  { label: "Minhas", valor: "minhas" },
  { label: "Meu time", valor: "meu_time" },
  { label: "Todas", valor: "todas" },
]

interface FiltrosCaixaProps {
  conversas: Conversa[]
  conversaAtivaId: string | null
  onConversaClick: (id: string) => void
  papel: string
  nomeUsuario: string
  etiquetasDisponiveis: Array<{ id: string; nome: string; cor: string }>
}

export function FiltrosCaixa({ conversas, conversaAtivaId, onConversaClick, papel, nomeUsuario, etiquetasDisponiveis }: FiltrosCaixaProps) {
  const [status, setStatus] = useState<FiltroStatus>("todas")
  const [visibilidade, setVisibilidade] = useState<FiltroVisibilidade>(
    papel === "atendente" ? "minhas" : "todas"
  )
  const [etiqueta, setEtiqueta] = useState<string | null>(null)
  const [busca, setBusca] = useState("")

  const conversasFiltradas = conversas.filter((c) => {
    if (visibilidade === "minhas" && c.atribuidaA !== nomeUsuario) return false
    if (status !== "todas" && c.status !== status) return false
    if (etiqueta && !c.etiquetas.some((e) => e.id === etiqueta)) return false
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      const nome = (c.contato.nome ?? c.contato.telefone).toLowerCase()
      const tel = c.contato.telefone.toLowerCase()
      if (!nome.includes(termo) && !tel.includes(termo)) return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm rounded-lg border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTROS_STATUS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setStatus(f.valor)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                status === f.valor
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          {FILTROS_VISIBILIDADE.filter((f) => !(papel === "atendente" && f.valor === "todas")).map((f) => (
            <button
              key={f.valor}
              onClick={() => setVisibilidade(f.valor)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                visibilidade === f.valor
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setEtiqueta(null)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md border transition-colors",
              etiqueta === null
                ? "bg-muted text-foreground border-border font-medium"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Todas etiquetas
          </button>
          {etiquetasDisponiveis.map((e) => (
            <button
              key={e.id}
              onClick={() => setEtiqueta(etiqueta === e.id ? null : e.id)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                etiqueta === e.id
                  ? "bg-muted text-foreground border-border font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {e.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversasFiltradas.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Nenhuma conversa encontrada
          </div>
        ) : (
          conversasFiltradas.map((conversa) => (
            <ItemConversa
              key={conversa.id}
              conversa={conversa}
              ativa={conversaAtivaId === conversa.id}
              onClick={() => onConversaClick(conversa.id)}
              eMinhaConversa={conversa.atribuidaA === nomeUsuario}
            />
          ))
        )}
      </div>
    </div>
  )
}
