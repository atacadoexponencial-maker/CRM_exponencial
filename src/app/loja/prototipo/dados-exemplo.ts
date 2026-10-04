// Protótipo da B16-03: a loja de exemplo vista pela cliente, montada com os dados dos
// protótipos da B16-01/02. Nada vem do banco. Sai na B16-07.

import { CATEGORIAS_EXEMPLO, CONFIG_EXEMPLO, PRODUTOS_EXEMPLO, TEMA_EXEMPLO } from "@/app/(auth)/catalogo/prototipo/dados-exemplo"
import { estoqueTotal } from "@/lib/catalogo/combinacoes"
import type { ProdutoVitrine } from "../components/vitrine"
import type { ProdutoDetalhe } from "../components/pagina-produto"
import type { LayoutVitrine } from "../components/tema"

export const ENDERECO_PROTOTIPO = "prototipo"
export const TEMA_LOJA = TEMA_EXEMPLO
export const CATEGORIAS_LOJA = CATEGORIAS_EXEMPLO
export const MINIMO_LOJA = CONFIG_EXEMPLO.minimo
export const FECHAMENTO_LOJA = CONFIG_EXEMPLO.mensagemFechamento
/** Número fictício: o protótipo nunca abre conversa com um número de verdade. */
export const WHATSAPP_LOJA = "5511900000000"

const visiveis = PRODUTOS_EXEMPLO.filter((p) => p.visivel)

export const PRODUTOS_LOJA: ProdutoVitrine[] = visiveis.map((p) => ({
  id: p.id ?? "",
  nome: p.nome,
  descricao: p.descricao,
  preco: p.preco ?? 0,
  precoDe: p.precoDe,
  fotoUrl: p.fotos[0]?.url ?? null,
  categoriaId: p.categoriaId,
  destaque: p.destaque,
  esgotado: estoqueTotal(p.tipos, p.estoque) === 0,
}))

export const DETALHES_LOJA: Record<string, ProdutoDetalhe> = Object.fromEntries(
  visiveis.map((p) => [
    p.id ?? "",
    {
      id: p.id ?? "",
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco ?? 0,
      precoDe: p.precoDe,
      fotos: p.fotos.map((f) => f.url),
      tipos: p.tipos,
      estoque: p.estoque,
    },
  ])
)

export function layoutDoParametro(valor: string | undefined): LayoutVitrine {
  return valor === "lista" || valor === "destaque" ? valor : TEMA_LOJA.layout
}
