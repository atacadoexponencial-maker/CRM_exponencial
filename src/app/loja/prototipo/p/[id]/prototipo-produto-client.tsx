"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { PaginaProduto } from "../../../components/pagina-produto"
import type { LayoutVitrine } from "../../../components/tema"
import { DETALHES_LOJA, TEMA_LOJA } from "../../dados-exemplo"
import { FaixaPrototipoLoja, useCarrinhoPrototipo } from "../../usar-carrinho-prototipo"

export function PrototipoProdutoClient({ id, layout }: { id: string; layout: LayoutVitrine }) {
  const router = useRouter()
  const { carrinho, pecas, abrir, gaveta } = useCarrinhoPrototipo(layout)
  const produto = DETALHES_LOJA[id]
  const voltar = () => router.push(`/loja/prototipo?layout=${layout}`)

  if (!produto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: TEMA_LOJA.corFundo }}>
        <p className="text-lg font-semibold" style={{ color: "#111" }}>Produto não encontrado</p>
        <Link href="/loja/prototipo" className="underline" style={{ color: TEMA_LOJA.corPrincipal }}>Voltar para a loja</Link>
      </div>
    )
  }

  return (
    <>
      <FaixaPrototipoLoja layout={layout} base={`/loja/prototipo/p/${id}`} />
      <PaginaProduto
        key={id}
        tema={{ ...TEMA_LOJA, layout }}
        produto={produto}
        quantidadeNoCarrinho={pecas}
        noCarrinho={(combinacao) => carrinho.itens.find((i) => i.produtoId === id && i.combinacao === combinacao)?.quantidade ?? 0}
        onAdicionar={(combinacao, qtd) => carrinho.adicionar(id, combinacao, qtd)}
        onVoltar={voltar}
        onAbrirCarrinho={abrir}
      />
      {gaveta}
    </>
  )
}
