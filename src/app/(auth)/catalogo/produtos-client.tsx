"use client"

import { useState, useTransition } from "react"
import { AbasCatalogo, type AbaCatalogo } from "./components/abas-catalogo"
import { ListaProdutos } from "./components/lista-produtos"
import { PainelCategorias } from "./components/painel-categorias"
import { ALVOS_TOQUE_CELULAR } from "./components/alvos-toque"
import {
  alternarVisivel,
  criarCategoria,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  prepararEnvioFotoCategoria,
  renomearCategoria,
  renomearSubcategoria,
  reordenarCategoria,
  reordenarProduto,
  reordenarSubcategoria,
  salvarFotoCategoria,
  type Catalogo,
} from "./actions"
import { createClient } from "@/integrations/supabase/client"
import { BUCKET_CATALOGO } from "@/lib/catalogo/regras"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { cn } from "@/lib/utils"

/** Abas do catálogo para Admin e Gerente. */
export const HREFS_CATALOGO: Record<AbaCatalogo, string | null> = {
  produtos: "/catalogo",
  aparencia: "/catalogo/aparencia",
  configuracoes: "/catalogo/configuracoes",
  pedidos: "/catalogo/pedidos",
}

/** Atendente só enxerga Pedidos. */
export function hrefsDoCatalogo(papel: string): Record<AbaCatalogo, string | null> {
  return papel === "atendente" ? { produtos: null, aparencia: null, configuracoes: null, pedidos: "/catalogo/pedidos" } : HREFS_CATALOGO
}

export function ProdutosClient({ inicial, hrefLoja }: { inicial: Catalogo; hrefLoja: string | null }) {
  const [catalogo, setCatalogo] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [, iniciar] = useTransition()

  const contagem = Object.fromEntries(catalogo.categorias.map((c) => [c.id, catalogo.produtos.filter((p) => p.categoriaId === c.id).length]))

  const contagemSubcategorias = Object.fromEntries(
    catalogo.categorias.flatMap((c) => c.subcategorias).map((sub) => [sub.id, catalogo.produtos.filter((p) => p.subcategoriaId === sub.id).length])
  )

  /** Como `executar`, e conta a quem chamou se o servidor aceitou. */
  function executarComResposta(acao: () => Promise<{ erro?: string; catalogo?: Catalogo }>): Promise<boolean> {
    return new Promise((resolver) => {
      setErro(null)
      iniciar(async () => {
        const r = await acao()
        if (r.erro) setErro(r.erro)
        else if (r.catalogo) setCatalogo(r.catalogo)
        resolver(!r.erro)
      })
    })
  }

  /** Chama a action e troca a lista pela que o servidor devolveu. */
  function executar(acao: () => Promise<{ erro?: string; catalogo?: Catalogo }>) {
    setErro(null)
    iniciar(async () => {
      const r = await acao()
      if (r.erro) setErro(r.erro)
      else if (r.catalogo) setCatalogo(r.catalogo)
    })
  }

  /** B61-02: a foto vai direto do navegador ao armazenamento, com a URL assinada do servidor. */
  async function enviarFotoCategoria(id: string, arquivo: File): Promise<{ erro?: string; catalogo?: Catalogo }> {
    const preparo = await prepararEnvioFotoCategoria(id, { tipo: arquivo.type, tamanho: arquivo.size })
    if (preparo.erro !== undefined) return { erro: preparo.erro }
    const { error } = await createClient().storage.from(BUCKET_CATALOGO).uploadToSignedUrl(preparo.caminho, preparo.token, arquivo, { contentType: arquivo.type })
    if (error) return { erro: "O envio falhou. Tente de novo." }
    return salvarFotoCategoria(id, preparo.caminho)
  }

  return (
    <div className={cn(CLASSE_DA_PAGINA, ALVOS_TOQUE_CELULAR)}>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-4">Catálogo</h1>
      <AbasCatalogo ativa="produtos" hrefs={HREFS_CATALOGO} />
      {erro && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive">{erro}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <ListaProdutos
          produtos={catalogo.produtos}
          categorias={catalogo.categorias}
          hrefNovo="/catalogo/produtos/nova"
          hrefImportar="/catalogo/importar"
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
          onEnviarFoto={(id, arquivo) => executar(() => enviarFotoCategoria(id, arquivo))}
          onRemoverFoto={(id) => executar(() => salvarFotoCategoria(id, null))}
          contagemSubcategorias={contagemSubcategorias}
          subcategorias={{
            onCriar: (categoriaId, nome) => executarComResposta(() => criarSubcategoria(categoriaId, nome)),
            onRenomear: (id, nome) => executarComResposta(() => renomearSubcategoria(id, nome)),
            onExcluir: (id) => executar(() => excluirSubcategoria(id)),
            onReordenar: (a, b) => executar(() => reordenarSubcategoria(a, b)),
          }}
        />
      </div>
    </div>
  )
}
