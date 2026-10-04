"use client"

// Protótipo da B16-01 (e base dos outros protótipos do catálogo): a lista de produtos e as categorias com dados fixos e em memória.
// Nada é gravado; a B16-05 troca por actions do servidor e apaga esta pasta.

import { useState } from "react"
import { AbasCatalogo } from "../components/abas-catalogo"
import { ListaProdutos, type CategoriaCatalogo, type ProdutoResumo } from "../components/lista-produtos"
import { PainelCategorias } from "../components/painel-categorias"
import { estoqueTotal as somaEstoque } from "@/lib/catalogo/combinacoes"
import type { ProdutoEditavel } from "../components/editor-produto"
import { CATEGORIAS_EXEMPLO, PRODUTOS_EXEMPLO } from "./dados-exemplo"

export const HREFS_PROTOTIPO = {
  produtos: "/catalogo/prototipo",
  aparencia: "/catalogo/prototipo/aparencia",
  configuracoes: "/catalogo/prototipo/configuracoes",
  pedidos: null,
}

export function FaixaPrototipo({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-200">
      <strong>Protótipo do catálogo:</strong> dados de exemplo, nada é gravado. Recarregar a página volta ao início.{" "}
      {children}
    </div>
  )
}

export function estoqueTotal(p: ProdutoEditavel): number {
  return somaEstoque(p.tipos, p.estoque)
}

function paraResumo(p: ProdutoEditavel): ProdutoResumo {
  return {
    id: p.id ?? "",
    nome: p.nome,
    categoriaId: p.categoriaId,
    preco: p.preco ?? 0,
    estoqueTotal: estoqueTotal(p),
    visivel: p.visivel,
    fotoUrl: p.fotos[0]?.url ?? null,
  }
}

function mover<T extends { id: string | null }>(lista: T[], idArrastado: string, idAlvo: string): T[] {
  const copia = [...lista]
  const de = copia.findIndex((x) => x.id === idArrastado)
  const para = copia.findIndex((x) => x.id === idAlvo)
  if (de < 0 || para < 0) return lista
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}

export function PrototipoProdutosClient() {
  const [produtos, setProdutos] = useState<ProdutoEditavel[]>(PRODUTOS_EXEMPLO)
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>(CATEGORIAS_EXEMPLO)
  const [vazio, setVazio] = useState(false)
  const [contador, setContador] = useState(1)

  const contagem = Object.fromEntries(categorias.map((c) => [c.id, produtos.filter((p) => p.categoriaId === c.id).length]))

  function reordenarProduto(idArrastado: string, idAlvo: string) {
    const a = produtos.find((p) => p.id === idArrastado)
    const b = produtos.find((p) => p.id === idAlvo)
    if (!a || !b || a.categoriaId !== b.categoriaId) return // só dentro da mesma categoria
    setProdutos(mover(produtos, idArrastado, idAlvo))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FaixaPrototipo>
        <button type="button" onClick={() => setVazio((v) => !v)} className="underline">
          {vazio ? "Voltar com os produtos" : "Ver sem produtos"}
        </button>
      </FaixaPrototipo>
      <div className="max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
        <AbasCatalogo ativa="produtos" hrefs={HREFS_PROTOTIPO} />
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <ListaProdutos
            produtos={vazio ? [] : produtos.map(paraResumo)}
            categorias={categorias}
            hrefNovo="/catalogo/prototipo/produto?novo=1"
            hrefEditar={(id) => `/catalogo/prototipo/produto?id=${id}`}
            hrefLoja={null}
            onAlternarVisivel={(id) => setProdutos((ps) => ps.map((p) => (p.id === id ? { ...p, visivel: !p.visivel } : p)))}
            onReordenar={reordenarProduto}
          />
          <PainelCategorias
            categorias={categorias}
            contagem={contagem}
            onCriar={(nome) => { setCategorias((cs) => [...cs, { id: `cat-nova-${contador}`, nome }]); setContador((n) => n + 1) }}
            onRenomear={(id, nome) => setCategorias((cs) => cs.map((c) => (c.id === id ? { ...c, nome } : c)))}
            onExcluir={(id) => {
              setCategorias((cs) => cs.filter((c) => c.id !== id))
              setProdutos((ps) => ps.map((p) => (p.categoriaId === id ? { ...p, categoriaId: null } : p)))
            }}
            onReordenar={(a, b) => setCategorias((cs) => mover(cs, a, b))}
          />
        </div>
      </div>
    </div>
  )
}
