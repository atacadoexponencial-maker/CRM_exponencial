"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { editarNomeTime, excluirTime, gerenciarMembrosTime } from "./actions"

type Usuario = { id: string; name: string }

export function AcoesTime({
  timeId,
  nomeAtual,
  isDefault,
  membrosAtuaisIds,
  todosUsuarios,
}: {
  timeId: string
  nomeAtual: string
  isDefault: boolean
  membrosAtuaisIds: string[]
  todosUsuarios: Usuario[]
}) {
  const router = useRouter()

  const [dialogEditarAberto, setDialogEditarAberto] = useState(false)
  const [novoNome, setNovoNome] = useState(nomeAtual)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const [dialogMembrosAberto, setDialogMembrosAberto] = useState(false)
  const [membrosSelecionados, setMembrosSelecionados] = useState<string[]>([])
  const [erroMembros, setErroMembros] = useState<string | null>(null)
  const [salvandoMembros, setSalvandoMembros] = useState(false)

  function handleDialogEditarOpenChange(open: boolean) {
    setDialogEditarAberto(open)
    if (open) {
      setNovoNome(nomeAtual)
      setErro(null)
    }
  }

  function handleDialogMembrosOpenChange(open: boolean) {
    setDialogMembrosAberto(open)
    if (open) {
      setMembrosSelecionados(membrosAtuaisIds)
      setErroMembros(null)
    }
  }

  function toggleMembro(id: string) {
    setMembrosSelecionados((atual) =>
      atual.includes(id) ? atual.filter((m) => m !== id) : [...atual, id]
    )
  }

  async function handleSalvar() {
    setErro(null)
    setSalvando(true)
    const resultado = await editarNomeTime(timeId, novoNome)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setDialogEditarAberto(false)
    router.refresh()
  }

  async function handleExcluir() {
    setErroExcluir(null)
    setExcluindo(true)
    const resultado = await excluirTime(timeId)
    setExcluindo(false)
    if (resultado.erro) {
      setErroExcluir(resultado.erro)
      return
    }
    setDialogExcluirAberto(false)
    router.refresh()
  }

  async function handleSalvarMembros() {
    setErroMembros(null)
    setSalvandoMembros(true)
    const resultado = await gerenciarMembrosTime(timeId, membrosSelecionados)
    setSalvandoMembros(false)
    if (resultado.erro) {
      setErroMembros(resultado.erro)
      return
    }
    setDialogMembrosAberto(false)
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
          <DropdownMenuItem onSelect={() => handleDialogMembrosOpenChange(true)}>
            Gerenciar membros
          </DropdownMenuItem>
          {!isDefault && (
            <DropdownMenuItem onSelect={() => handleDialogEditarOpenChange(true)}>
              Editar nome
            </DropdownMenuItem>
          )}
          {!isDefault && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => { setErroExcluir(null); setDialogExcluirAberto(true) }}
            >
              Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogMembrosAberto} onOpenChange={handleDialogMembrosOpenChange}>
        <DialogPopup>
          <DialogTitle className="mb-4">Gerenciar membros — {nomeAtual}</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroMembros && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroMembros}
              </p>
            )}

            {todosUsuarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário disponível.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {todosUsuarios.map((usuario) => (
                  <label key={usuario.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={membrosSelecionados.includes(usuario.id)}
                      onChange={() => toggleMembro(usuario.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {usuario.name}
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvarMembros} disabled={salvandoMembros}>
                {salvandoMembros ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      <Dialog open={dialogEditarAberto} onOpenChange={handleDialogEditarOpenChange}>
        <DialogPopup>
          <DialogTitle className="mb-4">Editar nome</DialogTitle>

          <div className="flex flex-col gap-4">
            {erro && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-nome">Nome</Label>
              <Input
                id="novo-nome"
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
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

      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir time</DialogTitle>

          <div className="flex flex-col gap-4">
            {erroExcluir && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erroExcluir}
              </p>
            )}

            <p className="text-sm">
              Tem certeza que deseja excluir <strong>{nomeAtual}</strong>? Os membros do time não serão excluídos.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleExcluir} disabled={excluindo}>
                {excluindo ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
