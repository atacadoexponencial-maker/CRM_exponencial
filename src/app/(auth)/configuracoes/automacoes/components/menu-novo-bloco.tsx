"use client"

import { Hourglass, Split } from "lucide-react"
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { ACOES_DISPONIVEIS, type AcaoTipo, type Saida } from "@/lib/fluxo-automacao"
import { ACOES, GRUPOS_NOVO_BLOCO } from "./catalogo"

export type ItemNovoBloco = "condicao" | "espera" | AcaoTipo

interface MenuNovoBlocoProps {
  aberto: boolean
  /** Quando o bloco nasce ligado a uma saída, o título diz qual. */
  saida: Saida | null
  onFechar: () => void
  onEscolher: (item: ItemNovoBloco) => void
}

const TITULO_POR_SAIDA: Record<Saida, string> = {
  sim: "Próximo bloco, quando a condição vale (sim)",
  nao: "Próximo bloco, quando a condição não vale (não)",
  proximo: "Próximo bloco",
  // B28-02: as saídas do bloco "esperar"
  tempo: "Próximo bloco, depois do tempo de espera",
  recebeu_mensagem: "Próximo bloco, quando o contato mandar mensagem",
  atendente_enviou: "Próximo bloco, quando o time mandar mensagem",
}

/** Os blocos que não são ação: o ícone e o nome no menu. */
const LOGICA = {
  condicao: { icone: Split, rotulo: "Condição (sim / não)" },
  espera: { icone: Hourglass, rotulo: "Esperar" },
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
                  const ehLogica = item === "condicao" || item === "espera"
                  const Icone = ehLogica ? LOGICA[item].icone : ACOES[item].icone
                  const rotulo = ehLogica ? LOGICA[item].rotulo : ACOES[item].rotulo
                  // O que o motor ainda não executa aparece, mas não dá para escolher
                  const emBreve = !ehLogica && !ACOES_DISPONIVEIS.includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={emBreve}
                      onClick={() => onEscolher(item)}
                      className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Icone className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{rotulo}</span>
                      {emBreve && <span className="text-xs text-muted-foreground">em breve</span>}
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
