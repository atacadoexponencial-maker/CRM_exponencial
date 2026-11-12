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
import { Ajuda } from "@/components/shared/ajuda"

export function AcoesWhatsApp({
  conexaoId,
  status,
  emUsoNoCelular = false,
}: {
  conexaoId: string
  status: string
  /** B23-06: a Meta não deixa o CRM desligar número em uso no celular; reconectar é pela janela dela. */
  emUsoNoCelular?: boolean
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
          <p className="text-xs text-erro">{erroCorrigir}</p>
        )}
        {corrigidoOk && (
          <p className="text-xs text-sucesso">Recebimento de mensagens corrigido com sucesso.</p>
        )}
        <span className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={corrigindo || status !== "connected"}
            onClick={handleCorrigirRecebimento}
          >
            {corrigindo ? "Corrigindo..." : "Corrigir recebimento de mensagens"}
          </Button>
          <Ajuda termo="Corrigir recebimento de mensagens">
            Use quando as mensagens dos clientes pararem de chegar no Chat: o CRM pede de novo à Meta para mandar as mensagens deste número. Não apaga nada.
          </Ajuda>
        </span>
      </div>

      {/* B23-06: número em uso no celular só desliga pelo aplicativo, e volta pela janela da Meta */}
      {!emUsoNoCelular && (
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
        </div>
      )}

      {/* B48-16: remover é diferente de desconectar; fica em vermelho, numa linha só dele */}
      <div className="mt-4 border-t border-border pt-3">
        <Button
          variant="destructive"
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
              <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
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
              <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
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
              <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
                {erroRemover}
              </p>
            )}

            {/* B23-06 (SUP-B23-18): remover libera o número; o aviso diz o que isso significa */}
            <div className="flex flex-col gap-3 text-sm">
              <p className="font-medium">
                Remover tira este número do CRM de vez. Veja o que muda antes de confirmar:
              </p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                <li>Ninguém da sua empresa envia nem recebe mais mensagens por ele no CRM.</li>
                <li>As conversas e os contatos ficam no CRM, só para consulta.</li>
                <li>
                  <strong>O número fica livre:</strong> qualquer empresa pode conectá-lo, não só a sua.
                </li>
                <li>Se a sua empresa conectar este número de novo, as conversas voltam a funcionar nele.</li>
              </ul>
              {emUsoNoCelular ? (
                <p>
                  Este número continua em uso no WhatsApp Business do celular. Remover aqui só o tira do CRM: para
                  desligar de verdade, desconecte também no aplicativo, em Configurações &gt; Conta &gt; Plataforma
                  Comercial.
                </p>
              ) : (
                <p>
                  Quer só parar de usar por um tempo? Cancele e use <strong>Desconectar</strong>: o número fica
                  guardado para a sua empresa.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleRemover} disabled={removendo}>
                {removendo ? "Removendo..." : "Remover e liberar o número"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
