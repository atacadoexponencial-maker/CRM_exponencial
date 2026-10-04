"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ImagePlus, Star, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { CategoriaCatalogo } from "./lista-produtos"
import { VariacoesEstoque, combinacoes, chaveCombinacao, type EstoquePorCombinacao, type TipoVariacao } from "./variacoes-estoque"

export interface FotoProduto {
  id: string
  url: string
}

export interface ProdutoEditavel {
  id: string | null
  nome: string
  descricao: string
  preco: number | null
  precoDe: number | null
  codigo: string
  categoriaId: string | null
  visivel: boolean
  destaque: boolean
  fotos: FotoProduto[]
  tipos: TipoVariacao[]
  estoque: EstoquePorCombinacao
}

import { FORMATOS_FOTO as EXTENSOES_FOTO, MAX_FOTOS, TAMANHO_MAX_FOTO } from "@/lib/catalogo/regras"

export { MAX_FOTOS, TAMANHO_MAX_FOTO }
const FORMATOS_FOTO = Object.keys(EXTENSOES_FOTO)

interface EditorProdutoProps {
  inicial: ProdutoEditavel
  categorias: CategoriaCatalogo[]
  hrefVoltar: string
  /** Recebe arquivos já conferidos (formato e tamanho); devolve as fotos enviadas e o erro de cada uma que falhou. */
  onAdicionarFotos: (arquivos: File[]) => Promise<{ fotos: FotoProduto[]; erros: string[] }>
  /** Devolve `erro` para mostrar ou `aviso` de sucesso. */
  onSalvar: (produto: ProdutoEditavel) => Promise<{ erro?: string; aviso?: string }>
  onExcluir?: () => void
  novoId: () => string
  /** Mostra variações e estoque (desligado até a B16-06). */
  comVariacoes?: boolean
}

type ErrosCampo = Partial<Record<"nome" | "preco" | "precoDe" | "fotos", string>>

function paraNumero(texto: string): number | null {
  const limpo = texto.replace(/\./g, "").replace(",", ".").trim()
  if (!limpo) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

function paraTexto(n: number | null): string {
  return n === null ? "" : n.toFixed(2).replace(".", ",")
}

export function EditorProduto({ inicial, categorias, hrefVoltar, onAdicionarFotos, onSalvar, onExcluir, novoId, comVariacoes = true }: EditorProdutoProps) {
  const [produto, setProduto] = useState<ProdutoEditavel>(inicial)
  const [precoTexto, setPrecoTexto] = useState(paraTexto(inicial.preco))
  const [precoDeTexto, setPrecoDeTexto] = useState(paraTexto(inicial.precoDe))
  const [erros, setErros] = useState<ErrosCampo>({})
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "aviso"; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [arrastandoFoto, setArrastandoFoto] = useState<string | null>(null)
  const [enviandoFotos, setEnviandoFotos] = useState(0)
  const entradaFotos = useRef<HTMLInputElement>(null)

  function mudar<K extends keyof ProdutoEditavel>(campo: K, valor: ProdutoEditavel[K]) {
    setProduto((atual) => ({ ...atual, [campo]: valor }))
  }

  async function escolherFotos(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    const arquivos = Array.from(lista)
    const vagas = MAX_FOTOS - produto.fotos.length
    const recusados: string[] = []
    const aceitos = arquivos.filter((a) => {
      if (!FORMATOS_FOTO.includes(a.type)) { recusados.push(`${a.name}: use JPG, PNG ou WebP`); return false }
      if (a.size > TAMANHO_MAX_FOTO) { recusados.push(`${a.name}: maior que 5 MB`); return false }
      return true
    })
    if (aceitos.length > vagas) recusados.push(`O produto aceita até ${MAX_FOTOS} fotos; ${aceitos.length - vagas} ficaram de fora.`)
    if (entradaFotos.current) entradaFotos.current.value = ""
    const paraEnviar = aceitos.slice(0, Math.max(0, vagas))
    setErros((e) => ({ ...e, fotos: recusados.length ? recusados.join(" · ") : undefined }))
    if (paraEnviar.length === 0) return
    setEnviandoFotos(paraEnviar.length)
    const { fotos: novas, erros: falhas } = await onAdicionarFotos(paraEnviar)
    setEnviandoFotos(0)
    setProduto((atual) => ({ ...atual, fotos: [...atual.fotos, ...novas] }))
    const todos = [...recusados, ...falhas]
    setErros((e) => ({ ...e, fotos: todos.length ? todos.join(" · ") : undefined }))
  }

  function moverFoto(idArrastado: string, idAlvo: string) {
    setProduto((atual) => {
      const fotos = [...atual.fotos]
      const de = fotos.findIndex((f) => f.id === idArrastado)
      const para = fotos.findIndex((f) => f.id === idAlvo)
      if (de < 0 || para < 0) return atual
      const [foto] = fotos.splice(de, 1)
      fotos.splice(para, 0, foto)
      return { ...atual, fotos }
    })
  }

  async function salvar() {
    const preco = paraNumero(precoTexto)
    const precoDe = paraNumero(precoDeTexto)
    const novosErros: ErrosCampo = {}
    if (!produto.nome.trim()) novosErros.nome = "Dê um nome ao produto."
    if (preco === null || preco <= 0) novosErros.preco = "Informe um preço maior que zero."
    if (precoDe !== null && preco !== null && precoDe <= preco) novosErros.precoDe = "O preço \"de\" precisa ser maior que o preço."
    setErros(novosErros)
    setMensagem(null)
    if (Object.keys(novosErros).length > 0) return

    // A grade guarda só as combinações que existem hoje.
    const chaves = new Set(combinacoes(produto.tipos).map(chaveCombinacao))
    const estoque = Object.fromEntries(Object.entries(produto.estoque).filter(([k]) => chaves.has(k)))

    setSalvando(true)
    const resultado = await onSalvar({ ...produto, nome: produto.nome.trim(), preco, precoDe, estoque })
    setSalvando(false)
    if (resultado.erro) setMensagem({ tipo: "erro", texto: resultado.erro })
    else if (resultado.aviso) setMensagem({ tipo: "aviso", texto: resultado.aviso })
  }

  const campoTexto = "w-full min-h-24 rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link href={hrefVoltar} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Produtos
        </Link>
        <div className="flex gap-2">
          {onExcluir && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmarExclusao(true)}>
              <Trash2 className="size-4" />
              Excluir produto
            </Button>
          )}
          <Link href={hrefVoltar}><Button size="sm" variant="outline">Cancelar</Button></Link>
          <Button size="sm" onClick={salvar} disabled={salvando || enviandoFotos > 0}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>

      {mensagem && (
        <p
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            mensagem.tipo === "erro" ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-300"
          )}
        >
          {mensagem.texto}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={produto.nome} onChange={(e) => mudar("nome", e.target.value)} aria-invalid={!!erros.nome} />
              {erros.nome && <p className="text-xs text-destructive">{erros.nome}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea id="descricao" value={produto.descricao} onChange={(e) => mudar("descricao", e.target.value)} className={campoTexto} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="preco">Preço (R$)</Label>
                <Input id="preco" inputMode="decimal" value={precoTexto} onChange={(e) => setPrecoTexto(e.target.value)} placeholder="0,00" aria-invalid={!!erros.preco} />
                {erros.preco && <p className="text-xs text-destructive">{erros.preco}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="precoDe">Preço &quot;de&quot; (opcional)</Label>
                <Input id="precoDe" inputMode="decimal" value={precoDeTexto} onChange={(e) => setPrecoDeTexto(e.target.value)} placeholder="Aparece riscado" aria-invalid={!!erros.precoDe} />
                {erros.precoDe && <p className="text-xs text-destructive">{erros.precoDe}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código (opcional)</Label>
                <Input id="codigo" value={produto.codigo} onChange={(e) => mudar("codigo", e.target.value)} placeholder="SKU" />
              </div>
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fotos <span className="font-normal text-muted-foreground">· {produto.fotos.length}/{MAX_FOTOS}</span></h2>
              <Button size="sm" variant="outline" onClick={() => entradaFotos.current?.click()} disabled={produto.fotos.length >= MAX_FOTOS || enviandoFotos > 0}>
                <ImagePlus className="size-4" />
                {enviandoFotos > 0 ? `Enviando ${enviandoFotos} ${enviandoFotos === 1 ? "foto" : "fotos"}...` : "Adicionar fotos"}
              </Button>
              <input
                ref={entradaFotos}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => escolherFotos(e.target.files)}
              />
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB cada. Arraste para mudar a ordem; a primeira é a principal.</p>
            {erros.fotos && <p className="text-xs text-destructive">{erros.fotos}</p>}
            {produto.fotos.length > 0 && (
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {produto.fotos.map((f, i) => (
                  <li
                    key={f.id}
                    draggable
                    onDragStart={() => setArrastandoFoto(f.id)}
                    onDragEnd={() => setArrastandoFoto(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); if (arrastandoFoto && arrastandoFoto !== f.id) moverFoto(arrastandoFoto, f.id); setArrastandoFoto(null) }}
                    className={cn("relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-grab", arrastandoFoto === f.id && "opacity-40")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">Principal</span>}
                    <button
                      type="button"
                      onClick={() => mudar("fotos", produto.fotos.filter((x) => x.id !== f.id))}
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                      aria-label={`Remover foto ${i + 1}`}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {comVariacoes && <section className="rounded-lg border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Variações e estoque</h2>
            <p className="text-xs text-muted-foreground">Até 2 tipos (ex.: Tamanho e Cor). Cada combinação tem o próprio estoque; com zero, aparece indisponível na loja.</p>
            <VariacoesEstoque
              tipos={produto.tipos}
              estoque={produto.estoque}
              onMudarTipos={(tipos) => mudar("tipos", tipos)}
              onMudarEstoque={(chave, qtd) => mudar("estoque", { ...produto.estoque, [chave]: qtd })}
              novoId={novoId}
            />
          </section>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                value={produto.categoriaId ?? ""}
                onChange={(e) => mudar("categoriaId", e.target.value || null)}
                className="h-8 w-full rounded-lg border border-input bg-input/30 px-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={produto.visivel} onChange={(e) => mudar("visivel", e.target.checked)} className="mt-0.5 accent-primary" />
              <span>
                Visível na loja
                <span className="block text-xs text-muted-foreground">Desmarcado, o produto fica só no CRM.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={produto.destaque} onChange={(e) => mudar("destaque", e.target.checked)} className="mt-0.5 accent-primary" />
              <span>
                <Star className="inline size-3.5 mr-1 -mt-0.5" />Destaque
                <span className="block text-xs text-muted-foreground">Aparece no topo da loja no layout Destaque.</span>
              </span>
            </label>
          </section>
        </aside>
      </div>

      <Dialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <DialogPopup className="max-w-sm">
          <DialogTitle>Excluir {produto.nome || "este produto"}?</DialogTitle>
          <DialogDescription className="mt-2">
            Ele sai do catálogo e da loja. Pedidos já feitos continuam mostrando o item com o nome e o preço da época.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button size="sm" variant="destructive" onClick={() => { setConfirmarExclusao(false); onExcluir?.() }}>Excluir produto</Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}
