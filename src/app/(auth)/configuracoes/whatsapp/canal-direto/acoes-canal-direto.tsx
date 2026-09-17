"use client"

// Ações de um número do canal direto (B2-05), no padrão de `acoes-whatsapp.tsx`:
// um estado por ação, diálogo de confirmação e o erro vindo do retorno da
// action.
//
// As três ações ficam visualmente distintas e cada uma diz o seu efeito antes
// de confirmar — ninguém deve remover pensando que está pausando.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Power, QrCode, Smartphone, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { EFEITO, type OperacaoDeCicloDeVida } from "@/lib/whatsapp/gateway/ciclo-de-vida"
import { operarNumeroCanalDireto } from "../actions"
import type { EstadoConexao } from "./estado-badge"

const TITULO: Record<OperacaoDeCicloDeVida, string> = {
  desconectar: "Desconectar este número?",
  encerrar_no_aparelho: "Encerrar a sessão no aparelho?",
  remover: "Remover este número definitivamente?",
}

const CONFIRMACAO: Record<OperacaoDeCicloDeVida, string> = {
  desconectar: "Desconectar",
  encerrar_no_aparelho: "Encerrar no aparelho",
  remover: "Remover definitivamente",
}

export function AcoesCanalDireto({
  conexaoId,
  estado,
  onReconectar,
}: {
  conexaoId: string
  estado: EstadoConexao
  /** Reconexão que precisa de QR novo volta para o pareamento (B2-03). */
  onReconectar?: () => void
}) {
  const router = useRouter()
  const [pedindo, setPedindo] = useState<OperacaoDeCicloDeVida | null>(null)
  const [emCurso, setEmCurso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar(operacao: OperacaoDeCicloDeVida) {
    setErro(null)
    setEmCurso(true)
    const resultado = await operarNumeroCanalDireto(conexaoId, operacao)
    setEmCurso(false)

    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }

    setPedindo(null)
    router.refresh()
  }

  const conectado = estado === "connected"
  const desconectado = estado === "disconnected"
  // Banido não volta lendo QR de novo: oferecer reconexão seria mentira.
  const podeReconectar = desconectado

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {conectado && (
          <>
            <Button variant="outline" size="sm" onClick={() => setPedindo("desconectar")}>
              <Power className="size-3.5" aria-hidden />
              Desconectar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPedindo("encerrar_no_aparelho")}
            >
              <Smartphone className="size-3.5" aria-hidden />
              Encerrar no aparelho
            </Button>
          </>
        )}

        {podeReconectar && (
          <Button variant="outline" size="sm" onClick={onReconectar}>
            <QrCode className="size-3.5" aria-hidden />
            Reconectar
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => setPedindo("remover")}>
          <Trash2 className="size-3.5" aria-hidden />
          Remover
        </Button>
      </div>

      {erro && !pedindo && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
          {erro}
        </p>
      )}

      <Dialog
        open={pedindo !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setPedindo(null)
            setErro(null)
          }
        }}
      >
        <DialogPopup className="max-w-md">
          {pedindo && (
            <>
              <DialogTitle>{TITULO[pedindo]}</DialogTitle>
              <p className="mt-3 text-sm text-muted-foreground">{EFEITO[pedindo]}</p>

              {erro && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
                  {erro}
                </p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <DialogClose
                  render={
                    <Button variant="outline" disabled={emCurso}>
                      Cancelar
                    </Button>
                  }
                />
                <Button
                  variant={pedindo === "remover" ? "destructive" : "default"}
                  disabled={emCurso}
                  onClick={() => confirmar(pedindo)}
                >
                  {emCurso ? "Aguarde…" : CONFIRMACAO[pedindo]}
                </Button>
              </div>
            </>
          )}
        </DialogPopup>
      </Dialog>
    </div>
  )
}
