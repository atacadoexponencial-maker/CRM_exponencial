"use client"

// Subcategorias de uma categoria no painel do catálogo (B61-03): lista recolhida com
// criar, renomear, reordenar e apagar. Só desenha: o servidor confere nome e dono.

import { useState } from "react"
import { Check, ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { CategoriaCatalogo, SubcategoriaCatalogo } from "./lista-produtos"

export interface AcoesSubcategoria {
  /** Devolvem `true` quando o servidor aceitou (o campo só é limpo nesse caso). */
  onCriar: (categoriaId: string, nome: string) => Promise<boolean>
  onRenomear: (id: string, nome: string) => Promise<boolean>
  onExcluir: (id: string) => void
  onReordenar: (idArrastado: string, idAlvo: string) => void
}

interface SubcategoriasDaCategoriaProps extends AcoesSubcategoria {
  categoria: CategoriaCatalogo
  /** Quantos produtos cada subcategoria tem. */
  contagem: Record<string, number>
}

export function SubcategoriasDaCategoria({ categoria, contagem, onCriar, onRenomear, onExcluir, onReordenar }: SubcategoriasDaCategoriaProps) {
  const [aberta, setAberta] = useState(false)
  const [nova, setNova] = useState("")
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const [excluindo, setExcluindo] = useState<SubcategoriaCatalogo | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const subcategorias = categoria.subcategorias
  const produtosDaExcluida = contagem[excluindo?.id ?? ""] ?? 0

  async function criar() {
    if (await onCriar(categoria.id, nova)) setNova("")
  }

  async function salvarRenomear() {
    if (!editando) return
    if (await onRenomear(editando.id, editando.nome)) setEditando(null)
  }

  return (
    <div className="pl-6">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        className="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {aberta ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Subcategorias de {categoria.nome} ({subcategorias.length})
      </button>

      {aberta && (
        <div className="mt-1 space-y-1.5">
          <ul className="space-y-0.5" aria-label={`Subcategorias de ${categoria.nome}`}>
            {subcategorias.map((sub) => (
              <li
                key={sub.id}
                draggable={editando?.id !== sub.id}
                onDragStart={(e) => { e.stopPropagation(); setArrastando(sub.id) }}
                onDragEnd={() => setArrastando(null)}
                onDragOver={(e) => { if (arrastando) { e.preventDefault(); e.stopPropagation() } }}
                onDrop={(e) => {
                  if (!arrastando) return
                  e.preventDefault()
                  e.stopPropagation()
                  if (arrastando !== sub.id) onReordenar(arrastando, sub.id)
                  setArrastando(null)
                }}
                className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted/40", arrastando === sub.id && "opacity-40")}
              >
                <GripVertical className="size-3 text-muted-foreground/50 cursor-grab shrink-0" />
                {editando?.id === sub.id ? (
                  <>
                    <Input
                      value={editando.nome}
                      onChange={(e) => setEditando({ id: sub.id, nome: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarRenomear(); if (e.key === "Escape") setEditando(null) }}
                      className="h-7"
                      aria-label="Novo nome da subcategoria"
                      autoFocus
                    />
                    <Button size="icon-xs" variant="ghost" onClick={salvarRenomear} aria-label="Salvar nome da subcategoria"><Check /></Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditando(null)} aria-label="Cancelar"><X /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{sub.nome}</span>
                    <span className="text-xs text-muted-foreground numero">{contagem[sub.id] ?? 0}</span>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditando({ id: sub.id, nome: sub.nome })} aria-label={`Renomear ${sub.nome}`}>
                      <Pencil />
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setExcluindo(sub)} aria-label={`Excluir ${sub.nome}`}>
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
              placeholder="Nova subcategoria"
              className="h-7"
              aria-label={`Nome da nova subcategoria de ${categoria.nome}`}
            />
            <Button size="sm" variant="outline" onClick={criar} aria-label={`Criar subcategoria em ${categoria.nome}`}>
              <Plus className="size-4" />
              Criar
            </Button>
          </div>
        </div>
      )}

      <Dialog open={excluindo !== null} onOpenChange={(abrir) => { if (!abrir) setExcluindo(null) }}>
        <DialogPopup className="max-w-sm">
          <DialogTitle>Excluir a subcategoria {excluindo?.nome}?</DialogTitle>
          <DialogDescription className="mt-2">
            {produtosDaExcluida > 0
              ? produtosDaExcluida === 1
                ? `Ela tem 1 produto. Ele continua em ${categoria.nome}, sem subcategoria.`
                : `Ela tem ${produtosDaExcluida} produtos. Eles continuam em ${categoria.nome}, sem subcategoria.`
              : "A subcategoria está vazia."}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button size="sm" variant="destructive" className="text-erro" onClick={() => { if (excluindo) onExcluir(excluindo.id); setExcluindo(null) }}>
              Excluir subcategoria
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}
