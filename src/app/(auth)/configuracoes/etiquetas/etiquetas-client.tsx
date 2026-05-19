"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, Tag } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { criarEtiqueta, editarEtiqueta } from "./actions"
import type { EtiquetaListada } from "./actions"

const CORES_DISPONIVEIS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
]

function SeletorCor({
  corSelecionada,
  onChange,
}: {
  corSelecionada: string
  onChange: (cor: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CORES_DISPONIVEIS.map((cor) => (
        <button
          key={cor}
          type="button"
          onClick={() => onChange(cor)}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition-all",
            corSelecionada === cor
              ? "border-foreground scale-110"
              : "border-transparent hover:border-muted-foreground/50"
          )}
          style={{ backgroundColor: cor }}
          title={cor}
        />
      ))}
    </div>
  )
}

export function EtiquetasClient({ etiquetasIniciais }: { etiquetasIniciais: EtiquetaListada[] }) {
  const [etiquetas, setEtiquetas] = useState<EtiquetaListada[]>(etiquetasIniciais)

  const [dialogCriarAberto, setDialogCriarAberto] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novaCor, setNovaCor] = useState("")
  const [isPendingCriar, setIsPendingCriar] = useState(false)
  const [erroCriar, setErroCriar] = useState<string | null>(null)

  const [dialogEditarAberto, setDialogEditarAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState("")
  const [editCor, setEditCor] = useState("")
  const [isPendingEditar, setIsPendingEditar] = useState(false)
  const [erroEditar, setErroEditar] = useState<string | null>(null)

  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const etiquetaExcluindo = etiquetas.find((e) => e.id === excluindoId)

  function abrirCriar() {
    setNovoNome("")
    setNovaCor("")
    setErroCriar(null)
    setDialogCriarAberto(true)
  }

  async function handleCriar() {
    const nome = novoNome.trim()
    if (!nome || !novaCor) return
    setIsPendingCriar(true)
    setErroCriar(null)
    const resultado = await criarEtiqueta(nome, novaCor)
    setIsPendingCriar(false)
    if (resultado.erro) {
      setErroCriar(resultado.erro)
      return
    }
    setEtiquetas((prev) => [...prev, resultado.etiqueta!])
    setDialogCriarAberto(false)
  }

  function abrirEditar(etiqueta: EtiquetaListada) {
    setEditandoId(etiqueta.id)
    setEditNome(etiqueta.nome)
    setEditCor(etiqueta.cor)
    setErroEditar(null)
    setDialogEditarAberto(true)
  }

  async function handleEditar() {
    const nome = editNome.trim()
    if (!nome || !editCor || !editandoId) return
    setIsPendingEditar(true)
    setErroEditar(null)
    const resultado = await editarEtiqueta(editandoId, nome, editCor)
    setIsPendingEditar(false)
    if (resultado.erro) {
      setErroEditar(resultado.erro)
      return
    }
    setEtiquetas((prev) =>
      prev.map((e) => (e.id === editandoId ? { ...e, nome, cor: editCor } : e))
    )
    setDialogEditarAberto(false)
  }

  function abrirExcluir(id: string) {
    setExcluindoId(id)
    setDialogExcluirAberto(true)
  }

  function handleExcluir() {
    setEtiquetas((prev) => prev.filter((e) => e.id !== excluindoId))
    setDialogExcluirAberto(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Etiquetas</h1>
        <Button onClick={abrirCriar} size="sm">
          <Plus className="size-4 mr-1.5" />
          Nova etiqueta
        </Button>
      </div>

      {etiquetas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Tag className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma etiqueta cadastrada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etiqueta</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conversas</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {etiquetas.map((etiqueta) => (
                <tr key={etiqueta.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: etiqueta.cor }}
                      />
                      <span className="font-medium">{etiqueta.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {etiqueta.conversas} {etiqueta.conversas === 1 ? "conversa" : "conversas"}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => abrirEditar(etiqueta)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => abrirExcluir(etiqueta.id)}
                        >
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog — Nova etiqueta */}
      <Dialog
        open={dialogCriarAberto}
        onOpenChange={(open) => {
          if (!open) setErroCriar(null)
          setDialogCriarAberto(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Nova etiqueta</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-nome-etiqueta">Nome</Label>
              <Input
                id="novo-nome-etiqueta"
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Cliente VIP"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cor</Label>
              <SeletorCor corSelecionada={novaCor} onChange={setNovaCor} />
            </div>
            {erroCriar && (
              <p className="text-sm text-destructive">{erroCriar}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleCriar}
                disabled={!novoNome.trim() || !novaCor || isPendingCriar}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Editar etiqueta */}
      <Dialog
        open={dialogEditarAberto}
        onOpenChange={(open) => {
          if (!open) setErroEditar(null)
          setDialogEditarAberto(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Editar etiqueta</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-nome-etiqueta">Nome</Label>
              <Input
                id="edit-nome-etiqueta"
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cor</Label>
              <SeletorCor corSelecionada={editCor} onChange={setEditCor} />
            </div>
            {erroEditar && (
              <p className="text-sm text-destructive">{erroEditar}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleEditar}
                disabled={!editNome.trim() || !editCor || isPendingEditar}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Excluir etiqueta */}
      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir etiqueta</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Tem certeza que deseja excluir{" "}
              <strong>{etiquetaExcluindo?.nome}</strong>? As conversas com essa
              etiqueta perderão a associação.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleExcluir}>
                Excluir
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
