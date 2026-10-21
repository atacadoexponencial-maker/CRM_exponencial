import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { carregarLojaPublica, carregarProdutoPublico } from "@/lib/catalogo/loja-publica"
import { ProdutoClient } from "./produto-client"
import { ProdutoNaoEncontrado } from "./produto-nao-encontrado"

type Params = Promise<{ endereco: string; produto: string }>

// A prévia do link no WhatsApp mostra o produto (nome, preço e a primeira foto), não só
// a loja: é assim que a cliente manda "olha esse" para outra pessoa.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { endereco, produto: produtoId } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) return {}
  const produto = await carregarProdutoPublico(loja.workspaceId, produtoId)
  if (!produto) return { title: `Produto indisponível · ${loja.tema.nomeLoja}`, robots: { index: false } }
  const titulo = `${produto.nome} · ${loja.tema.nomeLoja}`
  const resumo = produto.descricao.split("\n").find((l) => l.trim()) ?? ""
  const preco = produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const descricao = [preco, resumo.trim().slice(0, 140)].filter(Boolean).join(" · ")
  const imagem = produto.fotos[0] ?? loja.tema.bannerUrl ?? null
  return {
    title: titulo,
    description: descricao,
    openGraph: { title: titulo, description: descricao, type: "website", ...(imagem ? { images: [imagem] } : {}) },
  }
}

export default async function ProdutoLojaPage({ params }: { params: Params }) {
  const { endereco, produto: produtoId } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) notFound()
  const produto = await carregarProdutoPublico(loja.workspaceId, produtoId)
  if (!produto) return <ProdutoNaoEncontrado endereco={loja.endereco} tema={loja.tema} />
  return <ProdutoClient endereco={loja.endereco} tema={loja.tema} minimo={loja.minimo} produto={produto} />
}
