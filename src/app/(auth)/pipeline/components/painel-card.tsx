"use client"

import { useState, useEffect } from "react"
import { X, MessageSquare, ChevronDown, Phone, Clock, Tag, FileText, History } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ETAPAS_EXPANSAO, ETAPAS_RETENCAO, type CardLead, type CardCliente, type HistoricoEtapa, type NotaInterna } from "../mock-pipeline"
import { buscarDadosPainel, moverCard, atribuirAtendente } from "../actions"

interface PainelCardProps {
  card: CardLead | CardCliente | null
  onFechar: () => void
  funil?: "expansao" | "retencao"
  onMover?: () => void
  papel?: string
  atendentes?: { id: string; nome: string }[]
}

export function PainelCard({ card, onFechar, funil = "expansao", onMover, papel, atendentes }: PainelCardProps) {
  const [novaNota, setNovaNota] = useState("")
  const [etapaDropdownAberto, setEtapaDropdownAberto] = useState(false)
  const [atribuirDropdownAberto, setAtribuirDropdownAberto] = useState(false)
  const [movendo, setMovendo] = useState(false)
  const [atribuindo, setAtribuindo] = useState(false)
  const [painelData, setPainelData] = useState<{ historico: HistoricoEtapa[]; notas: NotaInterna[] }>({ historico: [], notas: [] })
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!card) return
    setCarregando(true)
    setPainelData({ historico: [], notas: [] })
    buscarDadosPainel(card.id)
      .then((data) => setPainelData(data))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [card?.id])

  if (!card) return null

  const semAtendente = card.atendente === null
  const etapas = funil === "retencao" ? ETAPAS_RETENCAO : ETAPAS_EXPANSAO
  const etapaLabel = etapas.find((e) => e.id === card.etapa)?.label ?? card.etapa
  const funilLabel = funil === "retencao" ? "Retenção" : "Expansão"

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-20"
        onClick={onFechar}
      />

      {/* Painel */}
      <div className="fixed right-0 top-0 bottom-0 z-30 w-96 bg-card border-l border-border flex flex-col shadow-xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold truncate">{card.contato.nome}</h2>
          <button
            onClick={onFechar}
            aria-label="Fechar painel"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Info do contato */}
          <div className="px-4 py-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-3.5 shrink-0" />
              <span>{card.contato.telefone}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Funil:</span>
              <span className="font-medium">{funilLabel}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Etapa:</span>
              <span className="font-medium">{etapaLabel}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Tempo na etapa:</span>
              <span>{card.tempoNaEtapa}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                {semAtendente ? "?" : card.atendente![0].toUpperCase()}
              </div>
              <span className={cn(
                "text-sm",
                semAtendente ? "text-amber-400 font-medium" : "text-muted-foreground"
              )}>
                {semAtendente ? "Sem atendente" : card.atendente}
              </span>
            </div>

            {semAtendente && papel !== "atendente" && (
              <div className="relative">
                <button
                  onClick={() => setAtribuirDropdownAberto((v) => !v)}
                  className="w-full h-8 flex items-center justify-between px-3 text-sm rounded-lg border border-input hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground">Atribuir atendente...</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>

                {atribuirDropdownAberto && (
                  <div className="absolute left-0 right-0 top-9 z-10 bg-card border border-border rounded-lg shadow-md py-1 text-sm">
                    {(atendentes ?? []).length === 0 ? (
                      <p className="px-3 py-1.5 text-muted-foreground/60">Nenhum atendente disponível</p>
                    ) : (
                      (atendentes ?? []).map((a) => (
                        <button
                          key={a.id}
                          disabled={atribuindo}
                          onClick={() => {
                            setAtribuindo(true)
                            atribuirAtendente(card.id, a.id)
                              .then(() => { setAtribuirDropdownAberto(false); onMover?.() })
                              .catch(() => { setAtribuirDropdownAberto(false) })
                              .finally(() => setAtribuindo(false))
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {a.nome}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {card.etiquetas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="size-3.5 text-muted-foreground shrink-0" />
                {card.etiquetas.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium"
                    style={{ backgroundColor: e.cor + "20", color: e.cor }}
                  >
                    {e.nome}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mudar etapa */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <button
                onClick={() => setEtapaDropdownAberto((v) => !v)}
                className="w-full h-8 flex items-center justify-between px-3 text-sm rounded-lg border border-input hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground">Mover para etapa...</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>

              {etapaDropdownAberto && (
                <div className="absolute left-0 right-0 top-9 z-10 bg-card border border-border rounded-lg shadow-md py-1 text-sm">
                  {etapas.filter((e) => e.id !== card.etapa).map((e) => (
                    <button
                      key={e.id}
                      disabled={movendo}
                      onClick={() => {
                        setMovendo(true)
                        moverCard(card.id, e.id)
                          .then(() => { setEtapaDropdownAberto(false); onMover?.() })
                          .catch(() => {})
                          .finally(() => setMovendo(false))
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botão abrir conversa */}
          <div className="px-4 py-3 border-b border-border">
            <button
              disabled={!card.conversaId}
              onClick={() => { if (card.conversaId) router.push(`/chat?conversa=${card.conversaId}`) }}
              className={cn(
                "w-full h-8 flex items-center justify-center gap-2 text-sm rounded-lg border border-input transition-colors",
                card.conversaId
                  ? "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  : "opacity-50 cursor-not-allowed text-muted-foreground"
              )}
            >
              <MessageSquare className="size-3.5" />
              Abrir conversa
            </button>
          </div>

          {/* Histórico de etapas */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-1.5 mb-3">
              <History className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</span>
            </div>
            {carregando ? (
              <p className="text-xs text-muted-foreground/60">Carregando...</p>
            ) : painelData.historico.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Nenhum histórico disponível.</p>
            ) : (
              <div className="space-y-1.5">
                {painelData.historico.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-foreground truncate">{h.etapa}</span>
                      {h.responsavel && (
                        <span className="text-muted-foreground/60 shrink-0">· {h.responsavel}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0">{h.data}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas internas */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas</span>
            </div>

            {carregando ? (
              <p className="text-xs text-muted-foreground/60 mb-3">Carregando...</p>
            ) : painelData.notas.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 mb-3">Nenhuma nota ainda.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {painelData.notas.map((nota) => (
                  <div key={nota.id} className="bg-muted/40 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{nota.autor}</span>
                      <span className="text-[10px] text-muted-foreground">{nota.data}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{nota.texto}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Campo de nova nota */}
            <div className="space-y-2">
              <textarea
                value={novaNota}
                onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Adicionar nota interna..."
                rows={3}
                className="w-full text-sm rounded-lg border border-input bg-transparent px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-none"
              />
              <button
                disabled={novaNota.trim() === ""}
                className="w-full h-8 text-sm rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                Adicionar nota
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
