"use client"

import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

interface ModalConfirmacaoRecompraProps {
  aberto: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function ModalConfirmacaoRecompra({ aberto, onConfirmar, onCancelar }: ModalConfirmacaoRecompraProps) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar() }}>
      <DialogPopup className="max-w-sm">
        <DialogTitle>Confirmar recompra realizada?</DialogTitle>
        <DialogDescription className="mt-2">
          O card será movido automaticamente para <strong>Aguardando Recompra</strong>, reiniciando o ciclo de recompra. Ambas as movimentações serão registradas no histórico.
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose
            onClick={onCancelar}
            className="h-8 px-4 text-sm rounded-lg border border-input hover:bg-muted transition-colors"
          >
            Cancelar
          </DialogClose>
          <button
            onClick={onConfirmar}
            className="h-8 px-4 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
