"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { desconectarWhatsApp, reconectarWhatsApp } from "./actions"

export function AcoesWhatsApp({
  conexaoId,
  status,
}: {
  conexaoId: string
  status: string
}) {
  const router = useRouter()

  const [dialogDesconectarAberto, setDialogDesconectarAberto] = useState(false)
  const [erroDesconectar, setErroDesconectar] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState(false)

  const [dialogReconectarAberto, setDialogReconectarAberto] = useState(false)
  const [erroReconectar, setErroReconectar] = useState<string | null>(null)
  const [reconectando, setReconectando] = useState(false)

  async function handleDesconectar() {
    setErroDesconectar(null)
    setDesconectando(true)
    const resultado = await desconectarWhatsApp(conexaoId)
    setDesconectando(false)
    if (resultado.erro) {
      setErroDesconectar(resultado.erro)
      return
    }
    setDialogDesconectarAberto(false)
    router.refresh()
  }

  async function handleReconectar() {
    setErroReconectar(null)
    setReconectando(true)
    const resultado = await reconectarWhatsApp(conexaoId)
    setReconectando(false)
    if (resultado.erro) {
      setErroReconectar(resultado.erro)
      return
    }
    setDialogReconectarAberto(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={status !== "connected"}
          onClick={() => { setErroDesconectar(null); setDialogDesconectarAberto(true) }}
        >
          Desconectar
        </Button>
        <Button
          variant="outline"
          disabled={status !== "disconnected"}
          onClick={() => { setErroReconectar(null); setDialogReconectarAberto(true) }}
        >
          Reconectar
        </Button>
      </div>

      <Dialog open={dialogDesconectarAberto} onOpenChange={setDialogDesconectarAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Desconectar número</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroDesconectar && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroDesconectar}
              </p>
            )}

            <p className="text-sm">
              Tem certeza que deseja desconectar o número? As mensagens via WhatsApp serão interrompidas.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleDesconectar} disabled={desconectando}>
                {desconectando ? "Desconectando..." : "Desconectar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      <Dialog open={dialogReconectarAberto} onOpenChange={setDialogReconectarAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Reconectar número</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroReconectar && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroReconectar}
              </p>
            )}

            <p className="text-sm">
              Tem certeza que deseja reconectar o número?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleReconectar} disabled={reconectando}>
                {reconectando ? "Reconectando..." : "Reconectar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
