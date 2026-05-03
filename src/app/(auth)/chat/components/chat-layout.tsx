"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { FiltrosCaixa } from "./filtros-caixa"
import { PainelConversa } from "./painel-conversa"
import { buscarMensagens } from "../actions"
import type { Conversa } from "../mock-conversas"
import type { Mensagem } from "../mock-mensagens"

interface ChatLayoutProps {
  conversas: Conversa[]
  papel: string
  nomeUsuario: string
}

export function ChatLayout({ conversas, papel, nomeUsuario }: ChatLayoutProps) {
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null)
  const [mensagensLocais, setMensagensLocais] = useState<Record<string, Mensagem[]>>({})
  const [erroConversaId, setErroConversaId] = useState<string | null>(null)
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const conversasComLeitura = conversas.map((c) =>
    abertas.has(c.id) ? { ...c, naoLidas: 0 } : c
  )

  const conversaAtiva = conversaAtivaId
    ? conversasComLeitura.find((c) => c.id === conversaAtivaId) ?? null
    : null

  function handleConversaClick(id: string) {
    setConversaAtivaId(id)
    setAbertas((prev) => new Set(prev).add(id))
    setErroConversaId(null)

    if (mensagensLocais[id] !== undefined) return

    startTransition(async () => {
      try {
        const msgs = await buscarMensagens(id)
        setMensagensLocais((prev) => {
          if (prev[id] !== undefined) return prev
          return { ...prev, [id]: msgs }
        })
      } catch {
        setErroConversaId(id)
      }
    })
  }

  function handleMensagemEnviada(msg: Mensagem) {
    setMensagensLocais((prev) => ({
      ...prev,
      [msg.conversaId]: [...(prev[msg.conversaId] ?? []), msg],
    }))
  }

  const carregando = isPending && conversaAtivaId !== null && mensagensLocais[conversaAtivaId] === undefined

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
      <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Caixa de Entrada</h1>
        </div>
        <FiltrosCaixa
          conversas={conversasComLeitura}
          conversaAtivaId={conversaAtivaId}
          onConversaClick={handleConversaClick}
          papel={papel}
          nomeUsuario={nomeUsuario}
        />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        {conversaAtiva && carregando ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="size-4 animate-spin" />
            Carregando mensagens...
          </div>
        ) : conversaAtiva && erroConversaId === conversaAtiva.id ? (
          <div className="flex-1 flex items-center justify-center text-sm text-destructive">
            Erro ao carregar mensagens
          </div>
        ) : conversaAtiva ? (
          <PainelConversa
            key={conversaAtiva.id}
            conversa={conversaAtiva}
            mensagens={mensagensLocais[conversaAtiva.id] ?? []}
            onMensagemEnviada={handleMensagemEnviada}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione uma conversa para começar
          </div>
        )}
      </main>
    </div>
  )
}
