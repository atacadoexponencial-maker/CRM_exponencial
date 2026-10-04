"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/integrations/supabase/client"
import { BUCKET_CATALOGO } from "@/lib/catalogo/regras"
import { AbasCatalogo } from "../../components/abas-catalogo"
import { EditorProduto, type FotoProduto, type ProdutoEditavel } from "../../components/editor-produto"
import type { CategoriaCatalogo } from "../../components/lista-produtos"
import { excluirProduto, prepararEnvioFoto, salvarProduto } from "../../actions"
import { HREFS_CATALOGO } from "../../produtos-client"

export function EditorClient({ inicial, categorias }: { inicial: ProdutoEditavel; categorias: CategoriaCatalogo[] }) {
  const router = useRouter()
  const contador = useRef(0)

  /** Cada foto vai direto do navegador ao armazenamento, com a URL assinada que o servidor criou. */
  async function enviarFotos(arquivos: File[]): Promise<{ fotos: FotoProduto[]; erros: string[] }> {
    const supabase = createClient()
    const resultados = await Promise.all(
      arquivos.map(async (arquivo) => {
        const preparo = await prepararEnvioFoto({ tipo: arquivo.type, tamanho: arquivo.size })
        if (!("caminho" in preparo)) return { erro: `${arquivo.name}: ${preparo.erro}` }
        const { error } = await supabase.storage.from(BUCKET_CATALOGO).uploadToSignedUrl(preparo.caminho, preparo.token, arquivo, { contentType: arquivo.type })
        if (error) return { erro: `${arquivo.name}: o envio falhou. Tente de novo.` }
        return { foto: { id: preparo.caminho, url: preparo.url } }
      })
    )
    return {
      fotos: resultados.flatMap((r) => ("foto" in r && r.foto ? [r.foto] : [])),
      erros: resultados.flatMap((r) => ("erro" in r && r.erro ? [r.erro] : [])),
    }
  }

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">{inicial.id ? inicial.nome : "Novo produto"}</h1>
      <AbasCatalogo ativa="produtos" hrefs={HREFS_CATALOGO} />
      <EditorProduto
        inicial={inicial}
        categorias={categorias}
        hrefVoltar="/catalogo"
        comVariacoes={false}
        onAdicionarFotos={enviarFotos}
        onSalvar={async (produto) => {
          const r = await salvarProduto(produto)
          if (r.erro) return { erro: r.erro }
          // /catalogo é dinâmica: abrir já traz a lista nova (um refresh aqui cancelaria a navegação).
          router.push("/catalogo")
          return {}
        }}
        onExcluir={
          inicial.id
            ? async () => {
                const r = await excluirProduto(inicial.id!)
                if (!r.erro) router.push("/catalogo")
              }
            : undefined
        }
        novoId={() => `tipo-${++contador.current}`}
      />
    </div>
  )
}
