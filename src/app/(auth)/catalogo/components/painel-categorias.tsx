"use client"

import { useState } from "react"
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { CategoriaCatalogo } from "./lista-produtos"

interface PainelCategoriasProps {
  /** Já na ordem do lojista. */
  categorias: CategoriaCatalogo[]
  /** Quantos produtos cada categoria tem. */
  contagem: Record<string, number>
  onCriar: (nome: string) => void
  onRenomear: (id: string, nome: string) => void
  onExcluir: (id: string) => void
  onReordenar: (idArrastado: string, idAlvo: string) => void
}

export function PainelCategorias({ categorias, contagem, onCriar, onRenomear, onExcluir, onReordenar }: PainelCategoriasProps) {
  const [nova, setNova] = useState("")
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [excluindo, setExcluindo] = useState<CategoriaCatalogo | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function nomeValido(nome: string, idAtual?: string): string | null {
    const limpo = nome.trim()
    if (!limpo) return "Dê um nome à categoria."
    if (categorias.some((c) => c.id !== idAtual && c.nome.toLowerCase() === limpo.toLowerCase())) {
      return "Já existe uma categoria com esse nome."
    }
    return null
  }

  function criar() {
    const problema = nomeValido(nova)
    setErro(problema)
    if (problema) return
    onCriar(nova.trim())
    setNova("")
  }

  function salvarRenomear() {
    if (!editando) return
    const problema = nomeValido(editando.nome, editando.id)
    setErro(problema)
    if (problema) return
    onRenomear(editando.id, editando.nome.trim())
    setEditando(null)
  }

  return (
    <aside className="rounded-lg border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Categorias</h2>
      <p className="text-xs text-muted-foreground">Arraste para mudar a ordem em que aparecem na loja.</p>

      <ul className="space-y-1">
        {categorias.map((c) => (
          <li
            key={c.id}
            draggable={editando?.id !== c.id}
            onDragStart={() => setArrastando(c.id)}
            onDragEnd={() => setArrastando(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (arrastando && arrastando !== c.id) onReordenar(arrastando, c.id)
              setArrastando(null)
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40",
              arrastando === c.id && "opacity-40"
            )}
          >
            <GripVertical className="size-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
            {editando?.id === c.id ? (
              <>
                <Input
                  value={editando.nome}
                  onChange={(e) => setEditando({ id: c.id, nome: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") salvarRenomear(); if (e.key === "Escape") setEditando(null) }}
                  className="h-7"
                  aria-label="Novo nome da categoria"
                  autoFocus
                />
                <Button size="icon-xs" variant="ghost" onClick={salvarRenomear} aria-label="Salvar nome"><Check /></Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setEditando(null)} aria-label="Cancelar"><X /></Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm truncate">{c.nome}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{contagem[c.id] ?? 0}</span>
                <Button size="icon-xs" variant="ghost" onClick={() => { setErro(null); setEditando({ id: c.id, nome: c.nome }) }} aria-label={`Renomear ${c.nome}`}>
                  <Pencil />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setExcluindo(c)} aria-label={`Excluir ${c.nome}`}>
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") criar() }}
          placeholder="Nova categoria"
          className="h-8"
          aria-label="Nome da nova categoria"
        />
        <Button size="sm" variant="outline" onClick={criar}>
          <Plus className="size-4" />
          Criar
        </Button>
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}

      <Dialog open={excluindo !== null} onOpenChange={(aberto) => { if (!aberto) setExcluindo(null) }}>
        <DialogPopup className="max-w-sm">
          <DialogTitle>Excluir a categoria {excluindo?.nome}?</DialogTitle>
          <DialogDescription className="mt-2">
            {(contagem[excluindo?.id ?? ""] ?? 0) > 0
              ? `Os ${contagem[excluindo?.id ?? ""]} produtos dela continuam no catálogo, em "Sem categoria".`
              : "A categoria está vazia."}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button
              size="sm"
              variant="destructive" className="text-red-400"
              onClick={() => { if (excluindo) onExcluir(excluindo.id); setExcluindo(null) }}
            >
              Excluir categoria
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </aside>
  )
}
