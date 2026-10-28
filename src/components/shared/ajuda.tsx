"use client"

// B48-15: o "?" ao lado de um termo ou botão que a tela não explica. Aberto, diz em
// uma frase o que é ou o que faz; fecha no próprio "?" ou com Esc.

import { useId, useState, type ReactNode } from "react"
import { CircleHelp } from "lucide-react"
import { useFecharComEsc } from "@/hooks/use-fechar-com-esc"

export function Ajuda({ termo, children }: { termo: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(false)
  const id = useId()
  useFecharComEsc(() => setAberta(false), aberta)

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`O que é ${termo}?`}
        aria-expanded={aberta}
        aria-controls={id}
        onClick={() => setAberta((v) => !v)}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <CircleHelp className="size-3.5" />
      </button>
      {aberta && (
        <span
          id={id}
          role="note"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-popover p-2.5 text-xs font-normal normal-case leading-relaxed tracking-normal text-popover-foreground shadow-md"
        >
          {children}
        </span>
      )}
    </span>
  )
}
