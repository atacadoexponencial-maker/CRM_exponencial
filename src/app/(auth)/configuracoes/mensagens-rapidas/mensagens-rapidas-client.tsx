"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, Zap } from "lucide-react"
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
import { criarMensagemRapida, editarMensagemRapida, type MensagemRapidaListada } from "./actions"

interface MensagensRapidasClientProps {
  mensagensIniciais: MensagemRapidaListada[]
}

export function MensagensRapidasClient({ mensagensIniciais }: MensagensRapidasClientProps) {
  const [mensagens, setMensagens] = useState<MensagemRapidaListada[]>(mensagensIniciais)

  const [dialogCriarAberto, setDialogCriarAberto] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState("")
  const [novoConteudo, setNovoConteudo] = useState("")
  const [isPendingCriar, setIsPendingCriar] = useState(false)
  const [erroCriar, setErroCriar] = useState<string | null>(null)

  const [dialogEditarAberto, setDialogEditarAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState("")
  const [editConteudo, setEditConteudo] = useState("")
  const [isPendingEditar, setIsPendingEditar] = useState(false)
  const [erroEditar, setErroEditar] = useState<string | null>(null)

  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const mensagemExcluindo = mensagens.find((m) => m.id === excluindoId)

  function abrirCriar() {
    setNovoTitulo("")
    setNovoConteudo("")
    setDialogCriarAberto(true)
  }

  async function handleCriar() {
    const titulo = novoTitulo.trim()
    const conteudo = novoConteudo.trim()
    if (!titulo || !conteudo) return
    setIsPendingCriar(true)
    const result = await criarMensagemRapida(titulo, conteudo)
    setIsPendingCriar(false)
    if (result.erro) {
      setErroCriar(result.erro)
      return
    }
    if (result.mensagem) {
      setMensagens((prev) => [...prev, result.mensagem!])
    }
    setDialogCriarAberto(false)
  }

  function abrirEditar(msg: MensagemRapidaListada) {
    setEditandoId(msg.id)
    setEditTitulo(msg.titulo)
    setEditConteudo(msg.conteudo)
    setDialogEditarAberto(true)
  }

  async function handleEditar() {
    const titulo = editTitulo.trim()
    const conteudo = editConteudo.trim()
    if (!titulo || !conteudo || !editandoId) return
    setIsPendingEditar(true)
    const result = await editarMensagemRapida(editandoId, titulo, conteudo)
    setIsPendingEditar(false)
    if (result.erro) {
      setErroEditar(result.erro)
      return
    }
    setMensagens((prev) =>
      prev.map((m) => (m.id === editandoId ? { ...m, titulo, conteudo } : m))
    )
    setDialogEditarAberto(false)
  }

  function abrirExcluir(id: string) {
    setExcluindoId(id)
    setDialogExcluirAberto(true)
  }

  function handleExcluir() {
    setMensagens((prev) => prev.filter((m) => m.id !== excluindoId))
    setDialogExcluirAberto(false)
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Mensagens Rápidas</h1>
        <Button onClick={abrirCriar} size="sm">
          <Plus className="size-4 mr-1.5" />
          Nova mensagem
        </Button>
      </div>

      {mensagens.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Zap className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma mensagem rápida cadastrada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Título</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Conteúdo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mensagens.map((msg) => (
                <tr key={msg.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground">
                    {msg.titulo}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-0">
                    <span className="block truncate">{msg.conteudo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => abrirEditar(msg)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => abrirExcluir(msg.id)}
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

      {/* Dialog — Nova mensagem */}
      <Dialog open={dialogCriarAberto} onOpenChange={(open) => { setDialogCriarAberto(open); if (!open) setErroCriar(null) }}>
        <DialogPopup>
          <DialogTitle className="mb-4">Nova mensagem rápida</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-titulo">Título (atalho)</Label>
              <Input
                id="novo-titulo"
                type="text"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex: /ola"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="novo-conteudo">Conteúdo</Label>
              <textarea
                id="novo-conteudo"
                rows={4}
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                placeholder="Texto que será inserido no campo de mensagem..."
                className="resize-none text-sm rounded-md border border-input px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
              />
            </div>
            {erroCriar && <p className="text-sm text-destructive">{erroCriar}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleCriar}
                disabled={!novoTitulo.trim() || !novoConteudo.trim() || isPendingCriar}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Editar mensagem */}
      <Dialog open={dialogEditarAberto} onOpenChange={(open) => { setDialogEditarAberto(open); if (!open) setErroEditar(null) }}>
        <DialogPopup>
          <DialogTitle className="mb-4">Editar mensagem rápida</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-titulo">Título (atalho)</Label>
              <Input
                id="edit-titulo"
                type="text"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-conteudo">Conteúdo</Label>
              <textarea
                id="edit-conteudo"
                rows={4}
                value={editConteudo}
                onChange={(e) => setEditConteudo(e.target.value)}
                className="resize-none text-sm rounded-md border border-input px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
              />
            </div>
            {erroEditar && <p className="text-sm text-destructive">{erroEditar}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button
                onClick={handleEditar}
                disabled={!editTitulo.trim() || !editConteudo.trim() || isPendingEditar}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Excluir mensagem */}
      <Dialog open={dialogExcluirAberto} onOpenChange={setDialogExcluirAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir mensagem rápida</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Tem certeza que deseja excluir{" "}
              <strong>{mensagemExcluindo?.titulo}</strong>?
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
    </div>
  )
}
