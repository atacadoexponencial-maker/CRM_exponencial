"use client"

import { useRouter } from "next/navigation"
import { PaginaProduto, type ProdutoDetalhe } from "../../../components/pagina-produto"
import type { TemaLoja } from "../../../components/tema"

export function ProdutoClient({ endereco, tema, produto }: { endereco: string; tema: TemaLoja; produto: ProdutoDetalhe }) {
  const router = useRouter()
  return <PaginaProduto tema={tema} produto={produto} onVoltar={() => router.push(`/loja/${endereco}`)} />
}
