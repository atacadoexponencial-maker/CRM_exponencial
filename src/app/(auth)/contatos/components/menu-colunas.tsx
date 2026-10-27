"use client"

import { useState } from "react"
import { Columns3 } from "lucide-react"

// B38-09: botão "Colunas" da lista de Contatos. Cada marca liga ou desliga uma coluna;
// o Nome não está aqui porque fica sempre.

export function MenuColunas({
  colunas,
  ocultas,
  onAlternar,
}: {
  colunas: Array<{ chave: string; nome: string }>
  ocultas: string[]
  onAlternar: (chave: string) => void
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="h-9 flex items-center gap-1.5 px-3 text-sm rounded-md border border-input bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Columns3 className="size-3.5" aria-hidden />
        Colunas
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden onClick={() => setAberto(false)} />
          <div
            role="group"
            aria-label="Colunas da lista"
            className="absolute right-0 sm:left-0 sm:right-auto top-10 z-20 w-60 max-h-80 overflow-y-auto bg-card border border-border rounded-lg shadow-md py-1 text-sm"
          >
            {colunas.map((c) => (
              <label key={c.chave} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={!ocultas.includes(c.chave)}
                  onChange={() => onAlternar(c.chave)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">{c.nome}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
