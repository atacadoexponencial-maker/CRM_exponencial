"use client"

import { useRouter } from "next/navigation"
import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "../components/vitrine"
import { textoDoMinimo, type MinimoPedido } from "../components/pedido"
import type { TemaLoja } from "../components/tema"

interface LojaClientProps {
  endereco: string
  tema: TemaLoja
  minimo: MinimoPedido
  categorias: CategoriaVitrine[]
  produtos: ProdutoVitrine[]
}

export function LojaClient({ endereco, tema, minimo, categorias, produtos }: LojaClientProps) {
  const router = useRouter()
  return (
    <Vitrine
      tema={tema}
      categorias={categorias}
      produtos={produtos}
      avisoMinimo={textoDoMinimo(minimo)}
      onAbrirProduto={(id) => router.push(`/loja/${endereco}/p/${id}`)}
    />
  )
}
