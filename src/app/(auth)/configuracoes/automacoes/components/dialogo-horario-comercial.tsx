"use client"

// Horário comercial da empresa (B11-08): os dias e a faixa que a condição
// "dentro / fora do horário comercial" usa. Aberto pelo botão da lista de
// automações. Quem confere e grava é o servidor (`salvarHorarioComercial`).

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { NOMES_DOS_DIAS, type HorarioComercial } from "@/lib/horario-comercial"

/** A semana como o Brasil lê: de segunda a domingo. */
const ORDEM_DOS_DIAS = [1, 2, 3, 4, 5, 6, 0]

export function DialogoHorarioComercial({
  aberto,
  horario,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  horario: HorarioComercial
  onFechar: () => void
  onSalvar: (horario: HorarioComercial) => Promise<{ erro?: string }>
}) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogPopup>
        <DialogTitle className="mb-1">Horário comercial</DialogTitle>
        {/* Remonta a cada abertura, para começar do horário gravado */}
        {aberto && <Formulario horario={horario} onSalvar={onSalvar} onFechar={onFechar} />}
      </DialogPopup>
    </Dialog>
  )
}

function Formulario({
  horario,
  onSalvar,
  onFechar,
}: {
  horario: HorarioComercial
  onSalvar: (horario: HorarioComercial) => Promise<{ erro?: string }>
  onFechar: () => void
}) {
  const [dias, setDias] = useState(horario.dias)
  const [inicio, setInicio] = useState(horario.inicio)
  const [fim, setFim] = useState(horario.fim)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function alternarDia(dia: number) {
    setDias((atuais) => (atuais.includes(dia) ? atuais.filter((d) => d !== dia) : [...atuais, dia]))
  }

  async function salvar() {
    setErro(null)
    setSalvando(true)
    const resultado = await onSalvar({ dias, inicio, fim })
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    onFechar()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        A condição &quot;dentro do horário comercial&quot; das automações vale nos dias marcados, entre o início e o
        fim, no horário de Brasília.
      </p>

      <div className="flex flex-col gap-2">
        <Label>Dias</Label>
        <div className="flex flex-wrap gap-1.5">
          {ORDEM_DOS_DIAS.map((dia) => {
            const marcado = dias.includes(dia)
            return (
              <button
                key={dia}
                type="button"
                aria-pressed={marcado}
                onClick={() => alternarDia(dia)}
                className={cn(
                  "h-8 min-w-11 rounded-md border px-2 text-sm transition-colors",
                  marcado
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-muted"
                )}
              >
                {NOMES_DOS_DIAS[dia]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="horario-inicio">Início</Label>
          <Input id="horario-inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="horario-fim">Fim</Label>
          <Input id="horario-fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex justify-end gap-2">
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button onClick={salvar} disabled={salvando}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
