"use client"

import { useState, useRef, useEffect, useTransition, KeyboardEvent } from "react"
import { Pencil, Check, X, ChevronRight, MessageSquare, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { buscarInfoContato, atualizarNomeContato } from "../actions"
import type { Conversa } from "../mock-conversas"
import type { ConversaAnterior } from "../actions"

const STATUS_LABEL: Record<string, string> = {
  em_espera: "Em espera",
  em_atendimento: "Em atendimento",
  resolvida: "Resolvida",
}

const STATUS_CLASS: Record<string, string> = {
  em_espera: "text-amber-600",
  em_atendimento: "text-green-600",
  resolvida: "text-muted-foreground",
}

function avatarIniciais(nome: string): string {
  const partes = nome.trim().split(" ")
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  return partes[0][0].toUpperCase()
}

interface PainelContatoProps {
  conversa: Conversa
  conversaId: string
  onFechar: () => void
  onConversaAtualizada: (id: string, updates: Partial<Conversa>) => void
  onNavegar: (id: string) => void
}

export function PainelContato({ conversa, conversaId, onFechar, onConversaAtualizada, onNavegar }: PainelContatoProps) {
  const [nomeLocal, setNomeLocal] = useState<string | null>(conversa.contato.nome)
  const [editando, setEditando] = useState(false)
  const [valorEdicao, setValorEdicao] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataPrimeiroContato, setDataPrimeiroContato] = useState<string | null>(null)
  const [conversasAnteriores, setConversasAnteriores] = useState<ConversaAnterior[] | null>(null)
  const [erroInfo, setErroInfo] = useState(false)
  const [isPending, startTransition] = useTransition()

  const nomeExibido = nomeLocal ?? conversa.contato.telefone

  useEffect(() => {
    setDataPrimeiroContato(null)
    setConversasAnteriores(null)
    setErroInfo(false)
    startTransition(async () => {
      try {
        const info = await buscarInfoContato(conversaId)
        setDataPrimeiroContato(info.dataPrimeiroContato)
        setConversasAnteriores(info.conversasAnteriores)
      } catch {
        setErroInfo(true)
      }
    })
  }, [conversaId])

  function iniciarEdicao() {
    setValorEdicao(nomeLocal ?? "")
    setErroSalvar(false)
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function confirmarEdicao() {
    const trimmed = valorEdicao.trim()
    if (!trimmed || salvando) return

    const contactId = conversa.contato.contactId
    if (!contactId) {
      setNomeLocal(trimmed)
      setEditando(false)
      return
    }

    setSalvando(true)
    setErroSalvar(false)
    try {
      await atualizarNomeContato(contactId, trimmed)
      setNomeLocal(trimmed)
      onConversaAtualizada(conversaId, { contato: { ...conversa.contato, nome: trimmed } })
      setEditando(false)
    } catch {
      setErroSalvar(true)
    } finally {
      setSalvando(false)
    }
  }

  function cancelarEdicao() {
    setEditando(false)
    setErroSalvar(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") confirmarEdicao()
    if (e.key === "Escape") cancelarEdicao()
  }

  return (
    <aside className="w-72 shrink-0 border-l bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold">Informações do contato</span>
        <button
          onClick={onFechar}
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4 overflow-y-auto">
        {/* Avatar + nome + telefone */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-medium text-muted-foreground">
            {avatarIniciais(nomeExibido)}
          </div>

          {editando ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={valorEdicao}
                  onChange={(e) => setValorEdicao(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nome do contato"
                  disabled={salvando}
                  className="text-sm border rounded-md px-2 py-0.5 w-36 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                />
                <button
                  onClick={confirmarEdicao}
                  disabled={!valorEdicao.trim() || salvando}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {salvando ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {erroSalvar && (
                <p className="text-xs text-destructive">Erro ao salvar</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm">{nomeExibido}</p>
              <button
                onClick={iniciarEdicao}
                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          )}

          {nomeLocal !== null && (
            <p className="text-xs text-muted-foreground">{conversa.contato.telefone}</p>
          )}
        </div>

        {/* Data do primeiro contato */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Primeiro contato
          </p>
          {isPending || dataPrimeiroContato === null ? (
            erroInfo ? (
              <p className="text-xs text-destructive">Erro ao carregar</p>
            ) : (
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            )
          ) : (
            <p className="text-sm">{dataPrimeiroContato}</p>
          )}
        </div>

        {/* Conversas anteriores */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="size-3" />
            Conversas anteriores
          </p>
          {isPending || conversasAnteriores === null ? (
            erroInfo ? (
              <p className="text-xs text-destructive">Erro ao carregar</p>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="h-12 rounded-md bg-muted animate-pulse" />
              </div>
            )
          ) : conversasAnteriores.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma conversa anterior</p>
          ) : (
            <div className="flex flex-col gap-1">
              {conversasAnteriores.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onNavegar(c.id)}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-muted/50 text-xs text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={cn("font-medium", STATUS_CLASS[c.status])}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span className="text-muted-foreground shrink-0">{c.ultimaMensagemHorario}</span>
                  </div>
                  <p className="text-muted-foreground truncate">{c.ultimaMensagemTexto}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
