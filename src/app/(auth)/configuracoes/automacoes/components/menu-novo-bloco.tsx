"use client"

import { Split } from "lucide-react"
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import type { AcaoTipo } from "@/lib/fluxo-automacao"
import { ACOES, GRUPOS_NOVO_BLOCO } from "./catalogo"

export type ItemNovoBloco = "condicao" | AcaoTipo

interface MenuNovoBlocoProps {
  aberto: boolean
  /** Quando o bloco nasce ligado a uma saída, o título diz qual. */
  saida: "sim" | "nao" | "proximo" | null
  onFechar: () => void
  onEscolher: (item: ItemNovoBloco) => void
}

const TITULO_POR_SAIDA = {
  sim: "Próximo bloco, quando a condição vale (sim)",
  nao: "Próximo bloco, quando a condição não vale (não)",
  proximo: "Próximo bloco",
} as const

export function MenuNovoBloco({ aberto, saida, onFechar, onEscolher }: MenuNovoBlocoProps) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogPopup className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogTitle>{saida ? TITULO_POR_SAIDA[saida] : "Adicionar bloco"}</DialogTitle>
        <DialogDescription className="mb-4">
          {saida ? "O bloco novo já nasce ligado." : "O bloco nasce solto; ligue-o a um caminho depois."}
        </DialogDescription>

        <div className="flex flex-col gap-4">
          {GRUPOS_NOVO_BLOCO.map((grupo) => (
            <section key={grupo.titulo}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {grupo.titulo}
              </h3>
              <div className="grid gap-1 sm:grid-cols-2">
                {grupo.itens.map((item) => {
                  const Icone = item === "condicao" ? Split : ACOES[item].icone
                  const rotulo = item === "condicao" ? "Condição (sim / não)" : ACOES[item].rotulo
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onEscolher(item)}
                      className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Icone className="size-4 shrink-0 text-muted-foreground" />
                      {rotulo}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </DialogPopup>
    </Dialog>
  )
}
