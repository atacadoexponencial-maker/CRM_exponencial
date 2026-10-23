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
import { ModalAdicionarContato } from "./modal-adicionar-contato"
import type { CardDoFunil, FunilDaEmpresa } from "../mock-pipeline"
import { moverCard } from "../actions"

interface FunilPersonalizadoProps {
  funil: FunilDaEmpresa
  cards: CardDoFunil[]
  papel: string
  atendentes: { id: string; nome: string }[]
  funis: Array<{ id: string; nome: string }>
}

/** B41-01: quadro de um funil da empresa — mesmas colunas, cards e painel de Entrada. */
export function FunilPersonalizado({ funil, cards, papel, atendentes, funis }: FunilPersonalizadoProps) {
  const router = useRouter()
  const [busca, setBusca] = useState("")
  const [atendenteFiltro, setAtendenteFiltro] = useState<string | null>(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [cardSelecionado, setCardSelecionado] = useState<CardDoFunil | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [etapaDoMais, setEtapaDoMais] = useState<{ id: string; label: string } | null>(null)
  const [movendo, setMovendo] = useState(false)
  const [erroMover, setErroMover] = useState<string | null>(null)

  async function handleMoverCard(cardId: string, _deEtapa: string, paraEtapa: string) {
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
    if (busca.trim() && !contemTermo(card.contato.nome, busca) && !contemTermo(card.contato.telefone, busca)) return false
    if (atendenteFiltro === "__sem_atendente__") return card.atendente === null
    if (atendenteFiltro !== null) return card.atendente === atendenteFiltro
    return true
  })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PainelCard
        key={cardSelecionado?.id ?? "fechado"}
        card={cardSelecionado}
        onFechar={() => setCardSelecionado(null)}
        onMover={() => router.refresh()}
        papel={papel}
        atendentes={atendentes}
        funilDaEmpresa={{ nome: funil.nome, etapas: funil.etapas }}
      />
      {modalAberto && (
        <ModalAdicionarContato
          funilId={funil.id}
          funilNome={funil.nome}
          onSucesso={() => { setModalAberto(false); router.refresh() }}
          onFechar={() => setModalAberto(false)}
        />
      )}
      {etapaDoMais && (
        <ModalAdicionarContato
          funilId={funil.id}
          funilNome={funil.nome}
          etapa={etapaDoMais}
          onSucesso={() => { setEtapaDoMais(null); router.refresh() }}
          onFechar={() => setEtapaDoMais(null)}
        />
      )}
      {(movendo || erroMover) && (
        <div
          role={erroMover ? "alert" : "status"}
          className={cn("border-b border-border px-6 py-2 text-sm", erroMover ? "text-erro" : "text-muted-foreground")}
        >
          {erroMover ?? "Movendo o card…"}
        </div>
      )}
      <CabecalhoDoPipeline atual={funil.id} quantidade={cardsFiltrados.length} funis={funis} papel={papel}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar card..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 w-52 rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        {papel !== "atendente" && (
          <div className="relative">
            <button
              onClick={() => setFiltroAberto((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm transition-colors",
                atendenteFiltro !== null
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {atendenteFiltro === null ? "Atendente" : atendenteFiltro === "__sem_atendente__" ? "Sem atendente" : atendenteFiltro}
              <ChevronDown className="size-3" />
            </button>
            {filtroAberto && (
              <div className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-border bg-card py-1 text-sm shadow-md">
                {[{ valor: null, rotulo: "Todos" }, { valor: "__sem_atendente__", rotulo: "Sem atendente" }, ...atendentes.map((a) => ({ valor: a.nome, rotulo: a.nome }))].map((o) => (
                  <button
                    key={o.valor ?? "todos"}
                    onClick={() => { setAtendenteFiltro(o.valor); setFiltroAberto(false) }}
                    className={cn("w-full px-3 py-1.5 text-left transition-colors hover:bg-muted", atendenteFiltro === o.valor && "font-medium text-primary")}
                  >
                    {o.rotulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {papel !== "atendente" && (
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="size-3.5" />
            Adicionar contato
          </Button>
        )}
      </CabecalhoDoPipeline>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full items-start px-4 pt-5 sm:px-6 lg:px-8">
          {funil.etapas.map((etapa) => (
            <ColunaKanban
              key={etapa.id}
              titulo={etapa.label}
              etapaId={etapa.id}
              cor={etapa.cor}
              cards={cardsFiltrados.filter((c) => c.etapa === etapa.id)}
              onCardClick={(card) => setCardSelecionado(card as CardDoFunil)}
              onCardDrop={handleMoverCard}
              onAdicionar={papel !== "atendente" ? () => setEtapaDoMais({ id: etapa.id, label: etapa.label }) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
