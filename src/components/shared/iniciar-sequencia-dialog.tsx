"use client"

import { useEffect, useState } from "react"
import { Loader2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  buscarSequenciasContato,
  cancelarSequenciaRun,
  iniciarSequenciaManual,
} from "@/app/(auth)/sequencias/actions"
import type { StatusSequenciasContato } from "@/app/(auth)/sequencias/actions"

interface IniciarSequenciaDialogProps {
  contactId: string
  contatoNome: string
  aberto: boolean
  onFechar: () => void
}

export function IniciarSequenciaDialog({
  contactId,
  contatoNome,
  aberto,
  onFechar,
}: IniciarSequenciaDialogProps) {
  const [status, setStatus] = useState<StatusSequenciasContato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [agindo, setAgindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sequenciaSel, setSequenciaSel] = useState("")

  // O dialog é montado já aberto pelos chamadores (renderização condicional),
  // então o estado inicial carregando=true cobre o ciclo de vida completo.
  useEffect(() => {
    let ativo = true
    buscarSequenciasContato(contactId)
      .then((s) => {
        if (ativo) setStatus(s)
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar as sequências")
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [contactId])

  async function recarregar() {
    const s = await buscarSequenciasContato(contactId)
    setStatus(s)
  }

  async function handleIniciar() {
    if (!sequenciaSel) return
    setAgindo(true)
    setErro(null)
    const resultado = await iniciarSequenciaManual(contactId, sequenciaSel)
    setAgindo(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setSequenciaSel("")
    await recarregar()
  }

  async function handleCancelar(runId: string) {
    setAgindo(true)
    setErro(null)
    const resultado = await cancelarSequenciaRun(runId)
    setAgindo(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    await recarregar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogPopup>
        <DialogTitle className="mb-4">Sequências — {contatoNome}</DialogTitle>
        <div className="flex flex-col gap-4">
          {carregando ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              {/* Sequências em andamento */}
              {status && status.emAndamento.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Em andamento
                  </span>
                  {status.emAndamento.map((run) => (
                    <div
                      key={run.runId}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>
                        <Zap className="size-3.5 inline mr-1.5 text-amber-500" />
                        {run.nome}{" "}
                        <span className="text-muted-foreground">
                          (etapa {run.etapaAtual} de {run.totalEtapas})
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={agindo}
                        onClick={() => handleCancelar(run.runId)}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Iniciar nova */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Iniciar sequência
                </span>
                <div className="flex gap-2">
                  <select
                    aria-label="Sequência"
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={sequenciaSel}
                    onChange={(e) => setSequenciaSel(e.target.value)}
                  >
                    <option value="">Escolha uma sequência…</option>
                    {(status?.disponiveis ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleIniciar} disabled={!sequenciaSel || agindo}>
                    Iniciar
                  </Button>
                </div>
              </div>

              {/* Histórico */}
              {status && status.historico.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Histórico
                  </span>
                  {status.historico.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{h.nome}</span>
                      <span>
                        {h.status} · {h.data}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end pt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Fechar
            </DialogClose>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
