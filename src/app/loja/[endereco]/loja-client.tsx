"use client"

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "../components/vitrine"
import { textoDoMinimo, type MinimoPedido } from "../components/pedido"
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
}

export function LojaClient({ endereco, tema, minimo, descontos, categorias, produtos }: LojaClientProps) {
  const { pecas, abrir, gaveta, repetir } = useCarrinhoLoja(endereco, tema, minimo, descontos)
  return (
    <>
      <Vitrine
        tema={tema}
        categorias={categorias}
        produtos={produtos}
        quantidadeNoCarrinho={pecas}
        avisoMinimo={textoDoMinimo(minimo)}
        avisoDesconto={resumoDoDesconto(descontos)}
        hrefProduto={(id) => `/loja/${endereco}/p/${id}`}
        onAbrirCarrinho={abrir}
        onRepetirPedido={repetir}
      />
      {gaveta}
    </>
  )
}
