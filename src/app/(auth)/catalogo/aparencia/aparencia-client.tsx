"use client"

import { createClient } from "@/integrations/supabase/client"
import { BUCKET_CATALOGO } from "@/lib/catalogo/regras"
import type { TemaLoja } from "@/app/loja/components/tema"
import type { CategoriaVitrine, ProdutoVitrine } from "@/app/loja/components/vitrine"
import { AbasCatalogo } from "../components/abas-catalogo"
import { EditorAparencia, type TipoImagemLoja } from "../components/editor-aparencia"
import { HREFS_CATALOGO } from "../produtos-client"
import { prepararEnvioImagemLoja, salvarAparencia } from "./actions"

interface AparenciaClientProps {
  inicial: TemaLoja
  categorias: CategoriaVitrine[]
  produtos: ProdutoVitrine[]
  avisoMinimo: string | null
}

export function AparenciaClient({ inicial, categorias, produtos, avisoMinimo }: AparenciaClientProps) {
  /** Logo e banner vão direto do navegador ao armazenamento, com a URL assinada do servidor. */
  async function enviarImagem(tipo: TipoImagemLoja, arquivo: File): Promise<{ url: string } | { erro: string }> {
    const preparo = await prepararEnvioImagemLoja(tipo, { tipo: arquivo.type, tamanho: arquivo.size })
    if ("erro" in preparo) return { erro: preparo.erro }
    const { error } = await createClient().storage.from(BUCKET_CATALOGO).uploadToSignedUrl(preparo.caminho, preparo.token, arquivo, { contentType: arquivo.type })
    if (error) return { erro: "O envio falhou. Tente de novo." }
    return { url: preparo.url }
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
      <AbasCatalogo ativa="aparencia" hrefs={HREFS_CATALOGO} />
      {produtos.length === 0 && (
        <p className="mb-4 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          A prévia fica mais fiel com produtos visíveis cadastrados na aba Produtos.
        </p>
      )}
      <EditorAparencia
        inicial={inicial}
        categorias={categorias}
        produtos={produtos}
        avisoMinimo={avisoMinimo}
        onEnviarImagem={enviarImagem}
        onSalvar={salvarAparencia}
      />
    </div>
  )
}
