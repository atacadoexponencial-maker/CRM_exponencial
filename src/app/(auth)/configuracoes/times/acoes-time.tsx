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
import { editarNomeTime } from "./actions"

export function AcoesTime({
  timeId,
  nomeAtual,
}: {
  timeId: string
  nomeAtual: string
}) {
  const router = useRouter()
  const [dialogEditarAberto, setDialogEditarAberto] = useState(false)
  const [novoNome, setNovoNome] = useState(nomeAtual)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function handleDialogEditarOpenChange(open: boolean) {
    setDialogEditarAberto(open)
    if (open) {
      setNovoNome(nomeAtual)
      setErro(null)
    }
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => handleDialogEditarOpenChange(true)}>
            Editar nome
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
    </>
  )
}
