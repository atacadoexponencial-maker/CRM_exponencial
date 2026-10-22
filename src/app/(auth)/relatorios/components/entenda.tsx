"use client"

// Bloco recolhível de explicação das abas de Relatórios (Coorte e RFV).

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function Entenda({ titulo, itens }: { titulo: string; itens: ReadonlyArray<readonly [string, string]> }) {
  const [aberto, setAberto] = useState(false)
  return (
    <section className="rounded-md border bg-card p-5">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center justify-between text-left">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <div className="grid gap-3 mt-3 sm:grid-cols-2">
          {itens.map(([t, texto]) => (
            <div key={t} className="border-t pt-3">
              <p className="text-sm font-medium mb-1">{t}</p>
              <p className="text-xs text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
