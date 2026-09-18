"use client"

// Termo de responsabilidade do canal direto (B3-01).
//
// Aparece antes da primeira conexão pelo canal direto no workspace. A marcação
// é obrigatória, e o botão de confirmar só habilita depois dela.
//
// Esta tela **não é o bloqueio** — é a parte visível dele. Quem bloqueia é a
// action de criar conexão, que recusa sem aceite da versão vigente.

import { useState } from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { TERMO_DO_CANAL_DIRETO } from "@/lib/whatsapp/gateway/termo"
import { aceitarTermoDoCanalDireto } from "../actions"

export function TermoResponsabilidade({
  aberto,
  onAbertoChange,
  onAceito,
}: {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  onAceito: () => void
}) {
  const [marcado, setMarcado] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    setErro(null)
    setRegistrando(true)
    const resultado = await aceitarTermoDoCanalDireto()
    setRegistrando(false)

    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }

    onAbertoChange(false)
    onAceito()
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogPopup className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 shrink-0 text-amber-300" aria-hidden />
          {TERMO_DO_CANAL_DIRETO.titulo}
        </DialogTitle>

        <div className="mt-4 max-h-[50vh] space-y-5 overflow-y-auto pr-1">
          {TERMO_DO_CANAL_DIRETO.secoes.map((secao) => (
            <section key={secao.titulo}>
              <h3 className="text-sm font-semibold mb-1.5">{secao.titulo}</h3>
              {secao.paragrafos.map((paragrafo) => (
                <p key={paragrafo} className="text-sm text-muted-foreground mb-2 last:mb-0">
                  {paragrafo}
                </p>
              ))}
            </section>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer gap-3 rounded-lg border p-4 text-sm">
          <input
            type="checkbox"
            checked={marcado}
            onChange={(e) => setMarcado(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-foreground"
          />
          <span>
            Eu li e entendi. Assumo a responsabilidade pelo número conectado por este canal e
            aceito o risco de bloqueio pelo WhatsApp.
          </span>
        </label>

        {erro && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm ">
            {erro}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Versão {TERMO_DO_CANAL_DIRETO.versao}
          </p>
          <div className="flex gap-2">
            <DialogClose
              render={
                <Button variant="outline" disabled={registrando}>
                  Cancelar
                </Button>
              }
            />
            <Button disabled={!marcado || registrando} onClick={confirmar}>
              {registrando ? "Registrando…" : "Aceitar e continuar"}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
