"use client"

// B60: agendar tarefa direto do painel do card. O contato já vem do lead, então o
// formulário pede só data, hora e nota. Grava pela mesma ação do "Novo follow-up"
// da Agenda (`criarFollowUp`), que confere o contato e vai para a Agenda de quem criou.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { criarFollowUp } from "../../agenda/actions"

interface DialogoAgendarTarefaProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  contactId: string
  nome: string
  onAgendada?: () => void
}

export function DialogoAgendarTarefa({ aberto, onAbertoChange, contactId, nome, onAgendada }: DialogoAgendarTarefaProps) {
  const [data, setData] = useState("")
  const [hora, setHora] = useState("")
  const [nota, setNota] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function agendar() {
    setSalvando(true)
    setErro(null)
    const resultado = await criarFollowUp({ contactId, data, hora: hora || undefined, nota }).catch(() => ({
      erro: "Não foi possível agendar a tarefa. Tente de novo.",
    }))
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setData("")
    setHora("")
    setNota("")
    onAbertoChange(false)
    onAgendada?.()
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        if (!open) setErro(null)
        onAbertoChange(open)
      }}
    >
      <DialogPopup>
        <DialogTitle className="mb-1">Agendar tarefa</DialogTitle>
        <DialogDescription className="mb-4 break-words">
          Para <strong className="font-medium text-foreground">{nome}</strong>. A tarefa vai para a sua Agenda.
        </DialogDescription>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tarefa-data">Data</Label>
              <Input id="tarefa-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tarefa-hora">Hora (opcional)</Label>
              <Input id="tarefa-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tarefa-nota">Nota</Label>
            <Input
              id="tarefa-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ex: Retomar negociação do pedido mínimo"
            />
          </div>

          {erro && <p className="text-sm text-erro">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            {/* Como na Agenda (B48-06): o botão não fica cinza sem dizer o que falta; o servidor diz */}
            <Button onClick={agendar} disabled={salvando}>
              {salvando ? "Agendando..." : "Agendar"}
            </Button>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
