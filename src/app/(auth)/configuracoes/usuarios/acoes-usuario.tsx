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
import { editarPapel } from "./actions"

type Usuario = {
  id: string
  name: string
  role: string
  status: string
}

export function AcoesUsuario({
  usuario,
  ehEuMesmo,
}: {
  usuario: Usuario
  ehEuMesmo: boolean
}) {
  const router = useRouter()
  const [dialogAberto, setDialogAberto] = useState(false)
  const [novoPapel, setNovoPapel] = useState<"gerente" | "atendente">(
    usuario.role === "gerente" ? "gerente" : "atendente"
  )
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

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
          <DropdownMenuItem>Gerenciar times</DropdownMenuItem>
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
    </>
  )
}
