"use client"

// Vitrine da loja com a marca do lojista. Só desenha: dados e ações chegam por props.
// É a mesma na prévia da tela de Aparência e na loja pública. Reage à largura do próprio
// quadro (container queries), não à da janela.

import { useState } from "react"
import { ImageOff, Search, ShoppingBag } from "lucide-react"
import { formatarPreco } from "@/app/(auth)/catalogo/components/lista-produtos"
import { coresDaVitrine, type TemaLoja } from "./tema"
import { familiaDaFonte } from "./fontes"

export interface CategoriaVitrine {
  id: string
  nome: string
}

export interface ProdutoVitrine {
  id: string
  nome: string
  descricao: string
  preco: number
  precoDe: number | null
  fotoUrl: string | null
  categoriaId: string | null
  destaque: boolean
  esgotado: boolean
}

interface VitrineProps {
  tema: TemaLoja
  /** Na ordem do lojista. */
  categorias: CategoriaVitrine[]
  /** Só os visíveis, na ordem do lojista. */
  produtos: ProdutoVitrine[]
  quantidadeNoCarrinho?: number
  /** Ex.: "Pedido mínimo: 12 peças". */
  avisoMinimo?: string | null
  onAbrirProduto?: (id: string) => void
  onAbrirCarrinho?: () => void
}

type Cores = ReturnType<typeof coresDaVitrine>

function Preco({ produto, cores }: { produto: ProdutoVitrine; cores: Cores }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-semibold" style={{ color: cores.principal }}>{formatarPreco(produto.preco)}</span>
      {produto.precoDe && <span className="text-xs line-through" style={{ color: cores.suave }}>{formatarPreco(produto.precoDe)}</span>}
    </p>
  )
}

function Foto({ produto, cores, className }: { produto: ProdutoVitrine; cores: Cores; className: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: cores.superficie }}>
      {produto.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={produto.fotoUrl} alt={produto.nome} className={`size-full object-cover ${produto.esgotado ? "opacity-50" : ""}`} />
      ) : (
        <div className="size-full flex items-center justify-center" style={{ color: cores.suave }}><ImageOff className="size-6" /></div>
      )}
      {produto.esgotado && (
        <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: cores.texto, color: cores.fundo }}>
          Esgotado
        </span>
      )}
    </div>
  )
}

function CartaoGrade({ produto, cores, onAbrir }: { produto: ProdutoVitrine; cores: Cores; onAbrir?: () => void }) {
  return (
    <button type="button" onClick={onAbrir} className="text-left rounded-xl overflow-hidden border transition-transform active:scale-[0.98]" style={{ borderColor: cores.borda }}>
      <Foto produto={produto} cores={cores} className="aspect-square" />
      <div className="p-2.5 space-y-1">
        <p className="text-sm leading-snug line-clamp-2">{produto.nome}</p>
        <Preco produto={produto} cores={cores} />
      </div>
    </button>
  )
}

function LinhaLista({ produto, cores, onAbrir }: { produto: ProdutoVitrine; cores: Cores; onAbrir?: () => void }) {
  return (
    <button type="button" onClick={onAbrir} className="w-full flex gap-3 text-left py-3 border-b" style={{ borderColor: cores.borda }}>
      <Foto produto={produto} cores={cores} className="size-24 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium leading-snug">{produto.nome}</p>
        {produto.descricao && <p className="text-xs line-clamp-2" style={{ color: cores.suave }}>{produto.descricao}</p>}
        <Preco produto={produto} cores={cores} />
      </div>
    </button>
  )
}

function CartaoDestaque({ produto, cores, onAbrir }: { produto: ProdutoVitrine; cores: Cores; onAbrir?: () => void }) {
  return (
    <button type="button" onClick={onAbrir} className="w-56 @3xl:w-64 shrink-0 text-left rounded-2xl overflow-hidden border" style={{ borderColor: cores.borda }}>
      <Foto produto={produto} cores={cores} className="aspect-[4/5]" />
      <div className="p-3 space-y-1">
        <p className="font-medium leading-snug line-clamp-2">{produto.nome}</p>
        <Preco produto={produto} cores={cores} />
      </div>
    </button>
  )
}

export function CabecalhoLoja({
  tema,
  quantidadeNoCarrinho = 0,
  onAbrirCarrinho,
  onAbrirLoja,
}: {
  tema: TemaLoja
  quantidadeNoCarrinho?: number
  onAbrirCarrinho?: () => void
  /** Tocar na logo volta para a vitrine. */
  onAbrirLoja?: () => void
}) {
  const cores = coresDaVitrine(tema)
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ background: cores.fundo, borderColor: cores.borda }}>
      <button type="button" onClick={onAbrirLoja} className="min-w-0 text-left" aria-label={`Voltar para ${tema.nomeLoja}`} disabled={!onAbrirLoja}>
        {tema.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tema.logoUrl} alt={tema.nomeLoja} className="h-9 max-w-40 object-contain" />
        ) : (
          <span className="block text-lg font-semibold truncate">{tema.nomeLoja}</span>
        )}
      </button>
      {onAbrirCarrinho && <button
        type="button"
        onClick={onAbrirCarrinho}
        className="relative flex items-center justify-center size-10 rounded-full shrink-0"
        style={{ background: cores.superficie }}
        aria-label={`Carrinho com ${quantidadeNoCarrinho} peças`}
      >
        <ShoppingBag className="size-5" />
        {quantidadeNoCarrinho > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full text-[11px] font-semibold flex items-center justify-center" style={{ background: cores.principal, color: cores.sobrePrincipal }}>
            {quantidadeNoCarrinho}
          </span>
        )}
      </button>}
    </header>
  )
}

export function Vitrine({ tema, categorias, produtos, quantidadeNoCarrinho = 0, avisoMinimo, onAbrirProduto, onAbrirCarrinho }: VitrineProps) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const cores = coresDaVitrine(tema)

  const termo = busca.trim().toLowerCase()
  const filtrados = produtos.filter(
    (p) => (!termo || p.nome.toLowerCase().includes(termo)) && (categoriaAtiva === null || p.categoriaId === categoriaAtiva)
  )
  const grupos = [...categorias, { id: null as string | null, nome: "Mais produtos" }]
    .map((c) => ({ ...c, itens: filtrados.filter((p) => p.categoriaId === c.id) }))
    .filter((g) => g.itens.length > 0)
  const destaques = produtos.filter((p) => p.destaque)
  const filtrando = termo !== "" || categoriaAtiva !== null

  function abrir(id: string) {
    onAbrirProduto?.(id)
  }

  return (
    // O CSS global do CRM fixa a fonte dos títulos; na vitrine eles herdam a fonte da loja.
    <div className="@container min-h-full [&_:is(h1,h2,h3)]:[font-family:inherit]" style={{ background: cores.fundo, color: cores.texto, fontFamily: familiaDaFonte(tema.fonteId) }}>
      <CabecalhoLoja tema={tema} quantidadeNoCarrinho={quantidadeNoCarrinho} onAbrirCarrinho={onAbrirCarrinho} />

      {tema.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.bannerUrl} alt="" className="w-full aspect-[3/1] @3xl:aspect-[4/1] object-cover" />
      )}

      <div className="px-4 pt-5 pb-10 space-y-5 max-w-6xl mx-auto">
        <div className="space-y-1">
          {tema.logoUrl ? <h1 className="text-2xl @3xl:text-3xl font-semibold">{tema.nomeLoja}</h1> : <h1 className="sr-only">{tema.nomeLoja}</h1>}
          {tema.boasVindas && <p className="text-sm" style={{ color: cores.suave }}>{tema.boasVindas}</p>}
          {avisoMinimo && <p className="text-xs font-medium" style={{ color: cores.principal }}>{avisoMinimo}</p>}
        </div>

        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: cores.suave }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className="w-full h-10 rounded-full pl-9 pr-4 text-sm outline-none border focus-visible:ring-2"
            style={{ background: cores.superficie, borderColor: cores.borda, color: cores.texto, ["--tw-ring-color" as string]: cores.principal }}
            aria-label="Buscar produto"
          />
        </div>

        {categorias.length > 0 && (
          <nav className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" aria-label="Categorias">
            {[{ id: null as string | null, nome: "Tudo" }, ...categorias].map((c) => {
              const ativa = categoriaAtiva === c.id
              return (
                <button
                  key={c.id ?? "tudo"}
                  type="button"
                  onClick={() => setCategoriaAtiva(c.id)}
                  className="shrink-0 rounded-full px-3.5 h-8 text-sm border"
                  style={ativa ? { background: cores.principal, color: cores.sobrePrincipal, borderColor: cores.principal } : { borderColor: cores.borda }}
                >
                  {c.nome}
                </button>
              )
            })}
          </nav>
        )}

        {tema.layout === "destaque" && !filtrando && destaques.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Destaques</h2>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
              {destaques.map((p) => <CartaoDestaque key={p.id} produto={p} cores={cores} onAbrir={() => abrir(p.id)} />)}
            </div>
          </section>
        )}

        {grupos.length === 0 && <p className="py-10 text-center text-sm" style={{ color: cores.suave }}>Nenhum produto encontrado.</p>}

        {grupos.map((g) => (
          <section key={g.id ?? "outros"} className="space-y-3">
            <h2 className="text-lg font-semibold">{g.nome}</h2>
            {tema.layout === "lista" ? (
              <div>{g.itens.map((p) => <LinhaLista key={p.id} produto={p} cores={cores} onAbrir={() => abrir(p.id)} />)}</div>
            ) : (
              <div className="grid grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 gap-3">
                {g.itens.map((p) => <CartaoGrade key={p.id} produto={p} cores={cores} onAbrir={() => abrir(p.id)} />)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
