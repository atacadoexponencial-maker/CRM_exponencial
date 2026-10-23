"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Sanfona das perguntas frequentes (B24-01): uma aberta por vez. Usa `<details>`,
 * então o texto existe no HTML para buscadores e abre mesmo sem JavaScript.
 */
export function Perguntas({ itens }: { itens: ReadonlyArray<{ pergunta: string; resposta: string }> }) {
  const [aberta, setAberta] = useState<number | null>(0)

  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {itens.map((item, i) => {
        const estaAberta = aberta === i
        return (
          <details
            key={item.pergunta}
            open={estaAberta}
            data-pergunta={i}
            className="group"
            onToggle={(e) => {
              // O navegador alterna o `open` sozinho; aqui só guardamos qual ficou aberta.
              const el = e.currentTarget
              if (el.open && aberta !== i) setAberta(i)
              if (!el.open && aberta === i) setAberta(null)
            }}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-foreground select-none [&::-webkit-details-marker]:hidden"
              onClick={(e) => {
                e.preventDefault()
                setAberta(estaAberta ? null : i)
              }}
            >
              {item.pergunta}
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", estaAberta && "rotate-180")} aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.resposta}</p>
          </details>
        )
      })}
    </div>
  )
}
