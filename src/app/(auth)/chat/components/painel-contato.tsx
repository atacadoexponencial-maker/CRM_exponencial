"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { Pencil, Check, X, ChevronRight, Tag, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversa } from "../mock-conversas"

const STATUS_LABEL: Record<string, string> = {
  em_espera: "Em espera",
  em_atendimento: "Em atendimento",
  resolvida: "Resolvida",
}

function avatarIniciais(nome: string): string {
  const partes = nome.trim().split(" ")
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  return partes[0][0].toUpperCase()
}

interface PainelContatoProps {
  conversa: Conversa
  todasConversas: Conversa[]
  onFechar: () => void
}

export function PainelContato({ conversa, todasConversas, onFechar }: PainelContatoProps) {
  const [nomeLocal, setNomeLocal] = useState<string | null>(conversa.contato.nome)
  const [editando, setEditando] = useState(false)
  const [valorEdicao, setValorEdicao] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const nomeExibido = nomeLocal ?? conversa.contato.telefone

  const conversasAnteriores = todasConversas.filter(
    (c) => c.contato.telefone === conversa.contato.telefone && c.id !== conversa.id
  )

  function iniciarEdicao() {
    setValorEdicao(nomeLocal ?? "")
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function confirmarEdicao() {
    const trimmed = valorEdicao.trim()
    if (trimmed) setNomeLocal(trimmed)
    setEditando(false)
  }

  function cancelarEdicao() {
    setEditando(false)
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
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={valorEdicao}
                onChange={(e) => setValorEdicao(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nome do contato"
                className="text-sm border rounded-md px-2 py-0.5 w-36 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                onClick={confirmarEdicao}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-green-600"
              >
                <Check className="size-3.5" />
              </button>
              <button
                onClick={cancelarEdicao}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
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

          <p className="text-xs text-muted-foreground">{conversa.contato.telefone}</p>
        </div>

        {/* Data do primeiro contato */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Primeiro contato
          </p>
          <p className="text-sm">{conversa.dataPrimeiroContato}</p>
        </div>

        {/* Etiquetas */}
        {conversa.etiquetas.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Tag className="size-3" />
              Etiquetas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {conversa.etiquetas.map((etiqueta) => (
                <span
                  key={etiqueta.nome}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: etiqueta.cor + "20", color: etiqueta.cor }}
                >
                  {etiqueta.nome}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conversas anteriores */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="size-3" />
            Conversas anteriores
          </p>
          {conversasAnteriores.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma conversa anterior</p>
          ) : (
            <div className="flex flex-col gap-1">
              {conversasAnteriores.map((c) => (
                <button
                  key={c.id}
                  disabled
                  title="Navegar para conversa (indisponível no protótipo)"
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-md bg-muted/50 text-xs text-left opacity-70 cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className={cn(
                      "font-medium",
                      c.status === "em_espera" && "text-amber-600",
                      c.status === "em_atendimento" && "text-green-600",
                      c.status === "resolvida" && "text-muted-foreground",
                    )}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span className="text-muted-foreground shrink-0">{c.ultimaMensagem.horario}</span>
                  </div>
                  <p className="text-muted-foreground truncate">{c.ultimaMensagem.texto}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
