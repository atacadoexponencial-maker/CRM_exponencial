"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { editarPapel, gerenciarTimes } from "./actions"

type Team = { id: string; name: string }

type Usuario = {
  id: string
  name: string
  role: string
  status: string
  timesIds: string[]
}

export function AcoesUsuario({
  usuario,
  ehEuMesmo,
  times,
}: {
  usuario: Usuario
  ehEuMesmo: boolean
  times: Team[]
}) {
  const router = useRouter()
  const [dialogAberto, setDialogAberto] = useState(false)
  const [novoPapel, setNovoPapel] = useState<"gerente" | "atendente">(
    usuario.role === "gerente" ? "gerente" : "atendente"
  )
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [dialogTimesAberto, setDialogTimesAberto] = useState(false)
  const [timesSelecionados, setTimesSelecionados] = useState<string[]>([])
  const [erroTimes, setErroTimes] = useState<string | null>(null)
  const [salvandoTimes, setSalvandoTimes] = useState(false)

  async function handleSalvar() {
    setErro(null)
    setSalvando(true)
    const resultado = await editarPapel(usuario.id, novoPapel)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setDialogAberto(false)
    router.refresh()
  }

  function handleOpenChange(open: boolean) {
    setDialogAberto(open)
    if (!open) {
      setErro(null)
      setNovoPapel(usuario.role === "gerente" ? "gerente" : "atendente")
    }
  }

  function handleDialogTimesOpenChange(open: boolean) {
    setDialogTimesAberto(open)
    if (open) {
      setTimesSelecionados(usuario.timesIds)
      setErroTimes(null)
    }
  }

  function toggleTime(id: string) {
    setTimesSelecionados((atual) =>
      atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id]
    )
  }

  async function handleSalvarTimes() {
    setErroTimes(null)
    setSalvandoTimes(true)
    const resultado = await gerenciarTimes(usuario.id, timesSelecionados)
    setSalvandoTimes(false)
    if (resultado.erro) {
      setErroTimes(resultado.erro)
      return
    }
    setDialogTimesAberto(false)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={ehEuMesmo}
            onSelect={() => setDialogAberto(true)}
          >
            Editar papel
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleDialogTimesOpenChange(true)}>
            Gerenciar times
          </DropdownMenuItem>
          {usuario.status === "active" ? (
            <DropdownMenuItem variant="destructive">Desativar</DropdownMenuItem>
          ) : (
            <DropdownMenuItem>Reativar</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogAberto} onOpenChange={handleOpenChange}>
        <DialogPopup>
          <DialogTitle className="mb-4">Editar papel — {usuario.name}</DialogTitle>

          <div className="flex flex-col gap-4">
            {erro && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-papel">Papel</Label>
              <select
                id="novo-papel"
                value={novoPapel}
                onChange={(e) => setNovoPapel(e.target.value as "gerente" | "atendente")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="gerente">Gerente</option>
                <option value="atendente">Atendente</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      <Dialog open={dialogTimesAberto} onOpenChange={setDialogTimesAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Gerenciar times — {usuario.name}</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroTimes && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroTimes}
              </p>
            )}

            {times.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum time disponível.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {times.map((time) => (
                  <label key={time.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={timesSelecionados.includes(time.id)}
                      onChange={() => toggleTime(time.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {time.name}
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvarTimes} disabled={salvandoTimes}>
                {salvandoTimes ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
