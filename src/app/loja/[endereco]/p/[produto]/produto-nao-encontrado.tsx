import Link from "next/link"
import { coresDaVitrine, type TemaLoja } from "../../../components/tema"
import { familiaDaFonte } from "../../../components/fontes"

/** Produto oculto, excluído ou de outra loja: aviso com a marca da loja e volta para a vitrine. */
export function ProdutoNaoEncontrado({ endereco, tema }: { endereco: string; tema: TemaLoja }) {
  const cores = coresDaVitrine(tema)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ background: cores.fundo, color: cores.texto, fontFamily: familiaDaFonte(tema.fonteId) }}>
      <p className="text-lg font-semibold">Produto não encontrado</p>
      <p className="text-sm" style={{ color: cores.suave }}>Ele pode ter saído do catálogo.</p>
      <Link href={`/loja/${endereco}`} className="underline" style={{ color: cores.principal }}>Ver os produtos de {tema.nomeLoja}</Link>
    </main>
  )
}
