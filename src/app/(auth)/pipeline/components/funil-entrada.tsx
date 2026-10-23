"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { contemTermo } from "@/lib/normalizar-busca"
import { Button } from "@/components/ui/button"
import { ColunaKanban } from "./coluna-kanban"
import { CabecalhoDoPipeline } from "./cabecalho-do-pipeline"
import { PainelCard } from "./painel-card"
import { ModalNovoLead } from "./modal-novo-lead"
import { ETAPAS_ENTRADA, type CardLead } from "../mock-pipeline"
import { moverCard } from "../actions"

interface FunilEntradaProps {
  cards: CardLead[]
  papel: string
  atendentes: { id: string; nome: string }[]
  /** B41-01: funis da empresa, para as abas do cabeçalho. */
  funis?: Array<{ id: string; nome: string }>
}

export function FunilEntrada({ cards, papel, atendentes, funis = [] }: FunilEntradaProps) {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [atendenteFiltro, setAtendenteFiltro] = useState<string | null>(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [cardSelecionado, setCardSelecionado] = useState<CardLead | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  // QA M27 (06/10): mover levava segundos sem nada na tela, e o erro era engolido.
  const [movendo, setMovendo] = useState(false)
  const [erroMover, setErroMover] = useState<string | null>(null)

  async function handleMoverCard(cardId: string, deEtapa: string, paraEtapa: string) {
    setMovendo(true)
    setErroMover(null)
    try {
      await moverCard(cardId, paraEtapa)
    } catch (e) {
      setErroMover(e instanceof Error && e.message ? e.message : "Não foi possível mover o card. Tente de novo.")
    } finally {
      setMovendo(false)
      router.refresh()
    }
  }

  const cardsFiltrados = cards.filter((card) => {
    // QA M29 (06/10): sem acento e sem formatação de telefone
    if (busca.trim() && !contemTermo(card.contato.nome, busca) && !contemTermo(card.contato.telefone, busca)) return false
    if (atendenteFiltro !== null) {
      if (atendenteFiltro === "__sem_atendente__") {
        if (card.atendente !== null) return false
      } else {
        if (card.atendente !== atendenteFiltro) return false
      }
    }

    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PainelCard key={cardSelecionado?.id ?? "fechado"} card={cardSelecionado} onFechar={() => setCardSelecionado(null)} onMover={() => router.refresh()} papel={papel} atendentes={atendentes} />
      {modalAberto && (
        <ModalNovoLead
          onSucesso={() => { setModalAberto(false); router.refresh() }}
          onFechar={() => setModalAberto(false)}
        />
      )}
      {(movendo || erroMover) && (
        <div
          role={erroMover ? "alert" : "status"}
          className={cn("px-6 py-2 text-sm border-b border-border", erroMover ? "text-erro" : "text-muted-foreground")}
        >
          {erroMover ?? "Movendo o card…"}
        </div>
      )}
      {/* Cabeçalho (B36-05). QA M23 (06/10): no celular, "Atendente" e "Novo lead" quebram a linha. */}
      <CabecalhoDoPipeline atual="entrada" quantidade={cardsFiltrados.length} funis={funis} papel={papel}>
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 w-52 pl-8 pr-3 text-sm rounded-md border border-input bg-card outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
          </div>

          {/* Filtro de atendente — visível apenas para admin e gerente */}
          {papel !== "atendente" && (
          <div className="relative">
            <button
              onClick={() => setFiltroAberto((v) => !v)}
              className={cn(
                "h-9 flex items-center gap-1.5 px-3 text-sm rounded-md border bg-card transition-colors",
                atendenteFiltro !== null
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {atendenteFiltro === null
                ? "Atendente"
                : atendenteFiltro === "__sem_atendente__"
                ? "Sem atendente"
                : atendenteFiltro}
              <ChevronDown className="size-3" />
            </button>

            {filtroAberto && (
              <div className="absolute right-0 top-9 z-10 w-44 bg-card border border-border rounded-lg shadow-md py-1 text-sm">
                <button
                  onClick={() => { setAtendenteFiltro(null); setFiltroAberto(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 hover:bg-muted transition-colors",
                    atendenteFiltro === null && "text-primary font-medium"
                  )}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setAtendenteFiltro("__sem_atendente__"); setFiltroAberto(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 hover:bg-muted transition-colors",
                    atendenteFiltro === "__sem_atendente__" && "text-primary font-medium"
                  )}
                >
                  Sem atendente
                </button>
                {atendentes.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setAtendenteFiltro(a.nome); setFiltroAberto(false) }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 hover:bg-muted transition-colors",
                      atendenteFiltro === a.nome && "text-primary font-medium"
                    )}
                  >
                    {a.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {papel !== "atendente" && (
            <Button size="sm" onClick={() => setModalAberto(true)}>
              <Plus className="size-3.5" />
              Novo lead
            </Button>
          )}
      </CabecalhoDoPipeline>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full items-start px-4 pt-5 sm:px-6 lg:px-8">
          {ETAPAS_ENTRADA.map((etapa) => {
            const cardsColuna = cardsFiltrados.filter((c) => c.etapa === etapa.id)
            return (
              <ColunaKanban
                key={etapa.id}
                titulo={etapa.label}
                etapaId={etapa.id}
                cards={cardsColuna}
                alertaVisual={etapa.alerta}
                destaque={etapa.id === "ganho"}
                onCardClick={(card) => setCardSelecionado(card as CardLead)}
                onCardDrop={handleMoverCard}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
