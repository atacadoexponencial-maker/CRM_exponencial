"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, GripVertical, ImageOff, Package, Plus, Search, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface CategoriaCatalogo {
  id: string
  nome: string
}

export interface ProdutoResumo {
  id: string
  nome: string
  categoriaId: string | null
  preco: number
  estoqueTotal: number
  visivel: boolean
  fotoUrl: string | null
}

type FiltroVisibilidade = "todos" | "visiveis" | "ocultos"

interface ListaProdutosProps {
  /** Já na ordem do lojista. */
  produtos: ProdutoResumo[]
  /** Já na ordem do lojista. */
  categorias: CategoriaCatalogo[]
  hrefNovo: string
  hrefEditar: (id: string) => string
  /** `null` mostra o link desabilitado (catálogo ainda não publicado). */
  hrefLoja: string | null
  onAlternarVisivel: (id: string) => void
  /** Solta `idArrastado` no lugar de `idAlvo`, dentro da mesma categoria. */
  onReordenar: (idArrastado: string, idAlvo: string) => void
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ListaProdutos({
  produtos,
  categorias,
  hrefNovo,
  hrefEditar,
  hrefLoja,
  onAlternarVisivel,
  onReordenar,
}: ListaProdutosProps) {
  const [busca, setBusca] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas")
  const [visibilidade, setVisibilidade] = useState<FiltroVisibilidade>("todos")
  const [arrastando, setArrastando] = useState<string | null>(null)

  const termo = busca.trim().toLowerCase()
  const filtrados = produtos.filter((p) => {
    if (termo && !p.nome.toLowerCase().includes(termo)) return false
    if (categoriaFiltro === "sem" && p.categoriaId !== null) return false
    if (categoriaFiltro !== "todas" && categoriaFiltro !== "sem" && p.categoriaId !== categoriaFiltro) return false
    if (visibilidade === "visiveis" && !p.visivel) return false
    if (visibilidade === "ocultos" && p.visivel) return false
    return true
  })

  const grupos = [
    ...categorias.map((c) => ({ id: c.id, nome: c.nome })),
    { id: null as string | null, nome: "Sem categoria" },
  ]
    .map((g) => ({ ...g, itens: filtrados.filter((p) => p.categoriaId === g.id) }))
    .filter((g) => g.itens.length > 0)

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        <Package className="size-8 opacity-40" />
        <div>
          <p className="text-sm font-medium text-foreground">Seu catálogo ainda está vazio</p>
          <p className="text-sm mt-1 max-w-sm">
            Cadastre os produtos com fotos, preço e variações. Depois é só mandar o link da loja para as clientes.
          </p>
        </div>
        <Link href={hrefNovo}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" />
            Cadastrar o primeiro produto
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="pl-8"
            aria-label="Buscar produto por nome"
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="h-8 rounded-lg border border-input bg-input/30 px-2 text-sm"
          aria-label="Filtrar por categoria"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
          <option value="sem">Sem categoria</option>
        </select>
        <select
          value={visibilidade}
          onChange={(e) => setVisibilidade(e.target.value as FiltroVisibilidade)}
          className="h-8 rounded-lg border border-input bg-input/30 px-2 text-sm"
          aria-label="Filtrar por visibilidade"
        >
          <option value="todos">Visíveis e ocultos</option>
          <option value="visiveis">Só visíveis</option>
          <option value="ocultos">Só ocultos</option>
        </select>
        {hrefLoja ? (
          <a href={hrefLoja} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">
              <Store className="size-4 mr-1.5" />
              Ver minha loja
            </Button>
          </a>
        ) : (
          <Button size="sm" variant="outline" disabled title="Publique o catálogo para ter o link da loja">
            <Store className="size-4 mr-1.5" />
            Ver minha loja
          </Button>
        )}
        <Link href={hrefNovo}>
          <Button size="sm">
            <Plus className="size-4 mr-1.5" />
            Novo produto
          </Button>
        </Link>
      </div>

      {grupos.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado com esses filtros.</p>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.id ?? "sem"} className="rounded-lg border overflow-hidden">
          <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 border-b">
            {grupo.nome} <span className="font-normal">· {grupo.itens.length}</span>
          </h2>
          <ul>
            {grupo.itens.map((p) => {
              const esgotado = p.estoqueTotal === 0
              return (
                <li
                  key={p.id}
                  draggable
                  onDragStart={() => setArrastando(p.id)}
                  onDragEnd={() => setArrastando(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (arrastando && arrastando !== p.id) onReordenar(arrastando, p.id)
                    setArrastando(null)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors",
                    arrastando === p.id && "opacity-40"
                  )}
                >
                  <GripVertical className="size-4 text-muted-foreground/50 cursor-grab shrink-0" aria-label="Arrastar para reordenar" />
                  <div className="size-11 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {p.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.fotoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-4 text-muted-foreground/60" />
                    )}
                  </div>
                  <Link href={hrefEditar(p.id)} className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", !p.visivel && "text-muted-foreground")}>{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarPreco(p.preco)} · {p.estoqueTotal} em estoque
                    </p>
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {esgotado && <Badge variant="destructive">Esgotado</Badge>}
                    {!p.visivel && <Badge variant="secondary">Oculto</Badge>}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => onAlternarVisivel(p.id)}
                      aria-label={p.visivel ? `Ocultar ${p.nome} da loja` : `Mostrar ${p.nome} na loja`}
                      title={p.visivel ? "Ocultar da loja" : "Mostrar na loja"}
                    >
                      {p.visivel ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
