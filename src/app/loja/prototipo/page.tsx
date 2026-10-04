import { PrototipoLojaClient } from "./prototipo-loja-client"
import { layoutDoParametro } from "./dados-exemplo"

export default async function PrototipoLojaPage({ searchParams }: { searchParams: Promise<{ layout?: string }> }) {
  const { layout } = await searchParams
  return <PrototipoLojaClient layout={layoutDoParametro(layout)} />
}
