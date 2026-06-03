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
import { desconectarWhatsApp, reconectarWhatsApp, reinscreverWebhookWhatsApp, removerConexaoWhatsApp } from "./actions"

export function AcoesWhatsApp({
  conexaoId,
  status,
}: {
  conexaoId: string
  status: string
}) {
  const router = useRouter()

  const [corrigindo, setCorrigindo] = useState(false)
  const [erroCorrigir, setErroCorrigir] = useState<string | null>(null)
  const [corrigidoOk, setCorrigidoOk] = useState(false)

  const [dialogDesconectarAberto, setDialogDesconectarAberto] = useState(false)
  const [erroDesconectar, setErroDesconectar] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState(false)

  const [dialogReconectarAberto, setDialogReconectarAberto] = useState(false)
  const [erroReconectar, setErroReconectar] = useState<string | null>(null)
  const [reconectando, setReconectando] = useState(false)

  const [dialogRemoverAberto, setDialogRemoverAberto] = useState(false)
  const [erroRemover, setErroRemover] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState(false)

  async function handleCorrigirRecebimento() {
    setErroCorrigir(null)
    setCorrigidoOk(false)
    setCorrigindo(true)
    const resultado = await reinscreverWebhookWhatsApp()
    setCorrigindo(false)
    if (resultado.erro) {
      setErroCorrigir(resultado.erro)
      return
    }
    setCorrigidoOk(true)
  }

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

  async function handleRemover() {
    setErroRemover(null)
    setRemovendo(true)
    const resultado = await removerConexaoWhatsApp(conexaoId)
    setRemovendo(false)
    if (resultado.erro) {
      setErroRemover(resultado.erro)
      return
    }
    setDialogRemoverAberto(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {erroCorrigir && (
          <p className="text-xs text-destructive">{erroCorrigir}</p>
        )}
        {corrigidoOk && (
          <p className="text-xs text-green-600">Recebimento de mensagens corrigido com sucesso.</p>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={corrigindo || status !== "connected"}
          onClick={handleCorrigirRecebimento}
        >
          {corrigindo ? "Corrigindo..." : "Corrigir recebimento de mensagens"}
        </Button>
      </div>

      <div className="flex gap-2 mt-3">
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
        <Button
          variant="outline"
          onClick={() => { setErroRemover(null); setDialogRemoverAberto(true) }}
        >
          Remover número
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
      <Dialog open={dialogRemoverAberto} onOpenChange={setDialogRemoverAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Remover número</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroRemover && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroRemover}
              </p>
            )}

            <p className="text-sm">
              Tem certeza que deseja remover este número? O registro será excluído e você poderá conectar um novo número.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleRemover} disabled={removendo}>
                {removendo ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
