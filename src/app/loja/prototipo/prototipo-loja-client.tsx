"use client"

import { useRouter } from "next/navigation"
import { Vitrine } from "../components/vitrine"
import { textoDoMinimo } from "../components/pedido"
import type { LayoutVitrine } from "../components/tema"
import { CATEGORIAS_LOJA, MINIMO_LOJA, PRODUTOS_LOJA, TEMA_LOJA } from "./dados-exemplo"
import { FaixaPrototipoLoja, useCarrinhoPrototipo } from "./usar-carrinho-prototipo"

export function PrototipoLojaClient({ layout }: { layout: LayoutVitrine }) {
  const router = useRouter()
  const { pecas, abrir, gaveta } = useCarrinhoPrototipo(layout)

  return (
    <>
      <FaixaPrototipoLoja layout={layout} base="/loja/prototipo" />
      <Vitrine
        tema={{ ...TEMA_LOJA, layout }}
        categorias={CATEGORIAS_LOJA}
        produtos={PRODUTOS_LOJA}
        quantidadeNoCarrinho={pecas}
        avisoMinimo={textoDoMinimo(MINIMO_LOJA)}
        onAbrirProduto={(id) => router.push(`/loja/prototipo/p/${id}?layout=${layout}`)}
        onAbrirCarrinho={abrir}
      />
      {gaveta}
    </>
  )
}
