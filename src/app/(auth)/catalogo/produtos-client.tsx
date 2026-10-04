"use client"

import { useState, useTransition } from "react"
import { AbasCatalogo, type AbaCatalogo } from "./components/abas-catalogo"
import { ListaProdutos } from "./components/lista-produtos"
import { PainelCategorias } from "./components/painel-categorias"
import {
  alternarVisivel,
  criarCategoria,
  excluirCategoria,
  renomearCategoria,
  reordenarCategoria,
  reordenarProduto,
  type Catalogo,
} from "./actions"

/** Abas do catálogo; as que ainda não existem de verdade aparecem como "Em breve". */
export const HREFS_CATALOGO: Record<AbaCatalogo, string | null> = {
  produtos: "/catalogo",
  aparencia: "/catalogo/aparencia",
  configuracoes: "/catalogo/configuracoes",
  pedidos: null,
}

export function ProdutosClient({ inicial, hrefLoja }: { inicial: Catalogo; hrefLoja: string | null }) {
  const [catalogo, setCatalogo] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [, iniciar] = useTransition()

  const contagem = Object.fromEntries(catalogo.categorias.map((c) => [c.id, catalogo.produtos.filter((p) => p.categoriaId === c.id).length]))

  /** Chama a action e troca a lista pela que o servidor devolveu. */
  function executar(acao: () => Promise<{ erro?: string; catalogo?: Catalogo }>) {
    setErro(null)
    iniciar(async () => {
      const r = await acao()
      if (r.erro) setErro(r.erro)
      else if (r.catalogo) setCatalogo(r.catalogo)
    })
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
      <AbasCatalogo ativa="produtos" hrefs={HREFS_CATALOGO} />
      {erro && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">{erro}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <ListaProdutos
          produtos={catalogo.produtos}
          categorias={catalogo.categorias}
          hrefNovo="/catalogo/produtos/nova"
          hrefEditar={(id) => `/catalogo/produtos/${id}`}
          hrefLoja={hrefLoja}
          onAlternarVisivel={(id) => {
            // Mostra na hora; a resposta do servidor confirma.
            setCatalogo((c) => ({ ...c, produtos: c.produtos.map((p) => (p.id === id ? { ...p, visivel: !p.visivel } : p)) }))
            executar(() => alternarVisivel(id))
          }}
          onReordenar={(a, b) => executar(() => reordenarProduto(a, b))}
        />
        <PainelCategorias
          categorias={catalogo.categorias}
          contagem={contagem}
          onCriar={(nome) => executar(() => criarCategoria(nome))}
          onRenomear={(id, nome) => executar(() => renomearCategoria(id, nome))}
          onExcluir={(id) => executar(() => excluirCategoria(id))}
          onReordenar={(a, b) => executar(() => reordenarCategoria(a, b))}
        />
      </div>
    </div>
  )
}
