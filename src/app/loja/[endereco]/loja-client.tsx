"use client"

import { useRouter } from "next/navigation"
import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "../components/vitrine"
import { textoDoMinimo, type MinimoPedido } from "../components/pedido"
import type { TemaLoja } from "../components/tema"
import { useCarrinhoLoja } from "./usar-carrinho-loja"

interface LojaClientProps {
  endereco: string
  tema: TemaLoja
  minimo: MinimoPedido
  categorias: CategoriaVitrine[]
  produtos: ProdutoVitrine[]
}

export function LojaClient({ endereco, tema, minimo, categorias, produtos }: LojaClientProps) {
  const router = useRouter()
  const { pecas, abrir, gaveta } = useCarrinhoLoja(endereco, tema, minimo)
  return (
    <>
      <Vitrine
        tema={tema}
        categorias={categorias}
        produtos={produtos}
        quantidadeNoCarrinho={pecas}
        avisoMinimo={textoDoMinimo(minimo)}
        onAbrirProduto={(id) => router.push(`/loja/${endereco}/p/${id}`)}
        onAbrirCarrinho={abrir}
      />
      {gaveta}
    </>
  )
}
