"use client"

import { useState } from "react"
import { FiltrosCaixa } from "./filtros-caixa"
import { PainelConversa } from "./painel-conversa"
import type { Conversa } from "../mock-conversas"
import type { Mensagem } from "../mock-mensagens"

interface ChatLayoutProps {
  conversas: Conversa[]
  mensagens: Record<string, Mensagem[]>
}

export function ChatLayout({ conversas, mensagens }: ChatLayoutProps) {
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null)
  const [mensagensLocais, setMensagensLocais] = useState<Record<string, Mensagem[]>>(mensagens)

  const conversaAtiva = conversaAtivaId
    ? conversas.find((c) => c.id === conversaAtivaId) ?? null
    : null

  function handleMensagemEnviada(msg: Mensagem) {
    setMensagensLocais((prev) => ({
      ...prev,
      [msg.conversaId]: [...(prev[msg.conversaId] ?? []), msg],
    }))
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
      <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Caixa de Entrada</h1>
        </div>
        <FiltrosCaixa
          conversas={conversas}
          conversaAtivaId={conversaAtivaId}
          onConversaClick={setConversaAtivaId}
        />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        {conversaAtiva ? (
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
