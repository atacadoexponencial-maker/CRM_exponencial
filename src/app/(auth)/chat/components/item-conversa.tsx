"use client"

import { cn } from "@/lib/utils"
import type { Conversa } from "../mock-conversas"

function avatarIniciais(nome: string): string {
  const partes = nome.trim().split(" ")
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  return partes[0][0].toUpperCase()
}

interface ItemConversaProps {
  conversa: Conversa
  ativa: boolean
  onClick: () => void
  eMinhaConversa: boolean
}

export function ItemConversa({ conversa, ativa, onClick, eMinhaConversa }: ItemConversaProps) {
  const nomeExibido = conversa.contato.nome ?? conversa.contato.telefone
  const temNaoLidas = conversa.naoLidas > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 flex items-start gap-3 border-b border-border transition-colors hover:bg-muted/50",
        ativa && "bg-muted",
        eMinhaConversa && "border-l-2 border-l-primary"
      )}
    >
      <div className="relative shrink-0">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
          {avatarIniciais(nomeExibido)}
        </div>
        {conversa.status === "em_espera" && conversa.atribuidaA === null && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-amber-400 border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("text-sm truncate", temNaoLidas ? "font-semibold" : "font-medium")}>
            {nomeExibido}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{conversa.ultimaMensagem.horario}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{conversa.ultimaMensagem.texto}</p>
          {temNaoLidas && (
            <span className="shrink-0 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center px-1">
              {conversa.naoLidas}
            </span>
          )}
        </div>

        {conversa.etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {conversa.etiquetas.map((etiqueta) => (
              <span
                key={etiqueta.nome}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: etiqueta.cor + "20", color: etiqueta.cor }}
              >
                {etiqueta.nome}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
