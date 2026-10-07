import { notFound } from "next/navigation"
import { carregarLojaPublica, carregarProdutoPublico } from "@/lib/catalogo/loja-publica"
import { ProdutoClient } from "./produto-client"
import { ProdutoNaoEncontrado } from "./produto-nao-encontrado"

export default async function ProdutoLojaPage({ params }: { params: Promise<{ endereco: string; produto: string }> }) {
  const { endereco, produto: produtoId } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) notFound()
  const produto = await carregarProdutoPublico(loja.workspaceId, produtoId)
  if (!produto) return <ProdutoNaoEncontrado endereco={loja.endereco} tema={loja.tema} />
  return <ProdutoClient endereco={loja.endereco} tema={loja.tema} minimo={loja.minimo} produto={produto} />
}
