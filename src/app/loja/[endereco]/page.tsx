import { notFound } from "next/navigation"
import { carregarLojaPublica, carregarVitrine } from "@/lib/catalogo/loja-publica"
import { LojaClient } from "./loja-client"

export default async function LojaPage({ params }: { params: Promise<{ endereco: string }> }) {
  const { endereco } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) notFound()
  const { categorias, produtos } = await carregarVitrine(loja.workspaceId)
  return <LojaClient endereco={loja.endereco} tema={loja.tema} minimo={loja.minimo} categorias={categorias} produtos={produtos} />
}
