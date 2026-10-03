"use client"

// Protótipo da B16-01: o editor de produto com dados fixos. As fotos ficam só no aparelho
// (nada é enviado) e salvar só confere os campos. A B16-05 troca por actions do servidor.

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { AbasCatalogo } from "../../components/abas-catalogo"
import { EditorProduto, type FotoProduto } from "../../components/editor-produto"
import { CATEGORIAS_EXEMPLO, PRODUTO_NOVO, PRODUTOS_EXEMPLO } from "../dados-exemplo"
import { FaixaPrototipo, HREFS_PROTOTIPO } from "../prototipo-produtos-client"

export function PrototipoEditorClient({ produtoId }: { produtoId: string | null }) {
  const router = useRouter()
  const contador = useRef(1)
  const inicial = PRODUTOS_EXEMPLO.find((p) => p.id === produtoId) ?? PRODUTO_NOVO

  function novoId() {
    contador.current += 1
    return `novo-${contador.current}`
  }

  async function adicionarFotos(arquivos: File[]): Promise<FotoProduto[]> {
    return arquivos.map((a) => ({ id: novoId(), url: URL.createObjectURL(a) }))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FaixaPrototipo />
      <div className="max-w-6xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">{inicial.id ? inicial.nome : "Novo produto"}</h1>
        <AbasCatalogo ativa="produtos" hrefs={HREFS_PROTOTIPO} />
        <EditorProduto
          key={inicial.id ?? "novo"}
          inicial={inicial}
          categorias={CATEGORIAS_EXEMPLO}
          hrefVoltar="/catalogo/prototipo"
          onAdicionarFotos={adicionarFotos}
          onSalvar={async () => ({ aviso: "Salvo no protótipo: os campos estão certos, mas nada foi gravado." })}
          onExcluir={inicial.id ? () => router.push("/catalogo/prototipo") : undefined}
          novoId={novoId}
        />
      </div>
    </div>
  )
}
