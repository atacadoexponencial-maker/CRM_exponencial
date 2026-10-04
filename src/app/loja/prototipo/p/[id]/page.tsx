import { PrototipoProdutoClient } from "./prototipo-produto-client"
import { layoutDoParametro } from "../../dados-exemplo"

export default async function PrototipoProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ layout?: string }>
}) {
  const { id } = await params
  const { layout } = await searchParams
  return <PrototipoProdutoClient id={id} layout={layoutDoParametro(layout)} />
}
