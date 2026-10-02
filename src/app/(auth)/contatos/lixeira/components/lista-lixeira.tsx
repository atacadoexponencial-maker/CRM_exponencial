"use client"

// B13: lista da lixeira de contatos. Só apresenta os itens e pede confirmação
// antes de "Apagar de vez"; restaurar e apagar são decididos por quem chama.

import { useState } from "react"
import { RotateCcw, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FunilDoCard } from "../../components/dialogo-excluir-contato"

export interface ItemLixeira {
  id: string
  nome: string | null
  telefone: string
  funis: FunilDoCard[]
  excluidoPor: string
  /** Data e hora da exclusão, já formatada para exibir. */
  excluidoEm: string
  diasRestantes: number
}

const ROTULO_FUNIL: Record<FunilDoCard, string> = {
  entrada: "Entrada",
  recompra: "Recompra",
}

function textoPrazo(dias: number) {
  if (dias <= 0) return "apaga hoje"
  if (dias === 1) return "apaga em 1 dia"
  return `apaga em ${dias} dias`
}

interface ListaLixeiraProps {
  itens: ItemLixeira[]
  onRestaurar: (id: string) => void
  onApagarDeVez: (id: string) => void
}

export function ListaLixeira({ itens, onRestaurar, onApagarDeVez }: ListaLixeiraProps) {
  const [apagando, setApagando] = useState<ItemLixeira | null>(null)

  if (itens.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        A lixeira está vazia
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Funis</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Excluído</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prazo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="max-w-56 truncate font-medium">{item.nome ?? item.telefone}</p>
                  {item.nome && <p className="text-xs text-muted-foreground">{item.telefone}</p>}
                </td>
                <td className="px-4 py-3">
                  {item.funis.length === 0 ? (
                    <span className="text-muted-foreground">Sem card</span>
                  ) : (
                    <div className="flex gap-1">
                      {item.funis.map((f) => (
                        <Badge key={f} variant="secondary">{ROTULO_FUNIL[f]}</Badge>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <p>{item.excluidoEm}</p>
                  <p className="text-xs">por {item.excluidoPor}</p>
                </td>
                <td className={`px-4 py-3 ${item.diasRestantes <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                  {textoPrazo(item.diasRestantes)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onRestaurar(item.id)}>
                      <RotateCcw className="size-3.5" aria-hidden />
                      Restaurar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setApagando(item)}>
                      <Trash2 className="size-3.5" aria-hidden />
                      Apagar de vez
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={apagando !== null} onOpenChange={(aberto) => !aberto && setApagando(null)}>
        <DialogPopup>
          <DialogTitle className="mb-1 break-words">
            Apagar {apagando?.nome ?? apagando?.telefone} de vez?
          </DialogTitle>
          <DialogDescription className="mb-4">
            O contato, os cards, as conversas, as mensagens e os arquivos são apagados para
            sempre. Esta ação não pode ser desfeita.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (apagando) onApagarDeVez(apagando.id)
                setApagando(null)
              }}
            >
              Apagar de vez
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
