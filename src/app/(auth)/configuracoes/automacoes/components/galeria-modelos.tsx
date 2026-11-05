"use client"

// B59-02: a galeria de modelos, aberta pelo botão "Modelos" da lista de automações.

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { MODELOS } from "@/lib/automacoes/modelos"

export function GaleriaModelos({
  aberta,
  onFechar,
  onUsar,
}: {
  aberta: boolean
  onFechar: () => void
  onUsar: (modeloId: string) => void
}) {
  return (
    <Dialog open={aberta} onOpenChange={(open) => !open && onFechar()}>
      <DialogPopup className="max-h-[85dvh] max-w-md overflow-y-auto sm:max-w-2xl">
        <DialogTitle>Modelos de automação</DialogTitle>
        <DialogDescription className="mb-4">
          O modelo abre como automação nova e desligada, com anotações explicando cada parte e o que mudar. Nada é salvo até você clicar em Salvar.
        </DialogDescription>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MODELOS.map((modelo) => (
            <li key={modelo.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{modelo.titulo}</p>
              <p className="flex-1 text-xs text-muted-foreground">{modelo.descricao}</p>
              <Button size="sm" variant="outline" className="self-start" aria-label={`Usar modelo: ${modelo.titulo}`} onClick={() => onUsar(modelo.id)}>
                Usar modelo
              </Button>
            </li>
          ))}
        </ul>
      </DialogPopup>
    </Dialog>
  )
}
