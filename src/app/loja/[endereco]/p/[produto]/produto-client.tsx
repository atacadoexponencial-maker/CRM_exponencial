"use client"

import { useRouter } from "next/navigation"
import { PaginaProduto, type ProdutoDetalhe } from "../../../components/pagina-produto"
import { textoDoMinimo, type MinimoPedido } from "../../../components/pedido"
import type { TemaLoja } from "../../../components/tema"
import { useCarrinhoLoja } from "../../usar-carrinho-loja"

interface ProdutoClientProps {
  endereco: string
  tema: TemaLoja
  minimo: MinimoPedido
  produto: ProdutoDetalhe
}

export function ProdutoClient({ endereco, tema, minimo, produto }: ProdutoClientProps) {
  const router = useRouter()
  const { carrinho, pecas, abrir, gaveta } = useCarrinhoLoja(endereco, tema, minimo)
  return (
    <>
      <PaginaProduto
        tema={tema}
        produto={produto}
        quantidadeNoCarrinho={pecas}
        noCarrinho={(combinacao) => carrinho.itens.find((i) => i.produtoId === produto.id && i.combinacao === combinacao)?.quantidade ?? 0}
        avisoMinimo={textoDoMinimo(minimo)}
        onAdicionar={(itens) =>
          carrinho.adicionarVarios(
            itens.map(({ combinacao, quantidade }) => ({
              item: {
                produtoId: produto.id,
                combinacao,
                nome: produto.nome,
                preco: produto.preco,
                fotoUrl: produto.fotos[0] ?? null,
                maximo: produto.estoque[combinacao] ?? 0,
              },
              quantidade,
            }))
          )
        }
        onVoltar={() => router.push(`/loja/${endereco}`)}
        onAbrirCarrinho={abrir}
      />
      {gaveta}
    </>
  )
}
