"use client"

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "../components/vitrine"
import { minimoDaFaixa, type MinimoPedido } from "../components/pedido"
import type { TemaLoja } from "../components/tema"
import { resumoDoDesconto, type DescontoPedido } from "@/lib/catalogo/regras-de-venda"
import { useCarrinhoLoja } from "./usar-carrinho-loja"

interface LojaClientProps {
  endereco: string
  tema: TemaLoja
  minimo: MinimoPedido
  descontos: DescontoPedido[]
  categorias: CategoriaVitrine[]
  produtos: ProdutoVitrine[]
  formasEntrega: string[]
  formasPagamento: string[]
}

export function LojaClient({ endereco, tema, minimo, descontos, categorias, produtos, formasEntrega, formasPagamento }: LojaClientProps) {
  const { pecas, aberto, abrir, gaveta, repetir } = useCarrinhoLoja(endereco, tema, minimo, descontos)
  return (
    <>
      <Vitrine
        tema={tema}
        categorias={categorias}
        produtos={produtos}
        quantidadeNoCarrinho={pecas}
        avisoMinimo={minimoDaFaixa(minimo)}
        avisoDesconto={resumoDoDesconto(descontos)}
        formasEntrega={formasEntrega}
        formasPagamento={formasPagamento}
        carrinhoAberto={aberto}
        hrefLoja={`/loja/${endereco}`}
        hrefProduto={(id) => `/loja/${endereco}/p/${id}`}
        onAbrirCarrinho={abrir}
        onRepetirPedido={repetir}
      />
      {gaveta}
    </>
  )
}
