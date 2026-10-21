// Apresentação da vitrine pública, sem tela nem banco: resumo das variações no cartão,
// ordem dos produtos e carga em blocos. Funções puras, iguais no servidor e no navegador.

import type { TipoVariacao } from "./combinacoes"

/** Até quantos caracteres as opções aparecem listadas ("P, M, G, GG"); acima, viram contagem. */
const LISTA_CURTA = 16

/**
 * Resumo das variações para o cartão da vitrine, ex.: "P, M, G, GG · 2 opções de cor".
 * `null` quando o produto não tem variação.
 */
export function resumoDasVariacoes(tipos: TipoVariacao[]): string | null {
  const partes = tipos
    .filter((t) => t.opcoes.length > 0)
    .map((t) => {
      if (t.opcoes.length === 1) return t.opcoes[0]
      const lista = t.opcoes.join(", ")
      if (lista.length <= LISTA_CURTA) return lista
      return `${t.opcoes.length} opções de ${t.nome.trim().toLowerCase() || "variação"}`
    })
  return partes.length > 0 ? partes.join(" · ") : null
}

export const ORDENS_VITRINE = [
  { id: "loja", nome: "Ordem da loja" },
  { id: "menor-preco", nome: "Menor preço" },
  { id: "maior-preco", nome: "Maior preço" },
  { id: "nome", nome: "Nome (A–Z)" },
] as const

export type OrdemVitrine = (typeof ORDENS_VITRINE)[number]["id"]

export function ordemVitrineValida(valor: unknown): valor is OrdemVitrine {
  return ORDENS_VITRINE.some((o) => o.id === valor)
}

/** Devolve uma lista nova na ordem pedida; "loja" mantém a ordem do lojista. Estável. */
export function ordenarProdutos<T extends { nome: string; preco: number }>(produtos: T[], ordem: OrdemVitrine): T[] {
  if (ordem === "loja") return produtos
  const lista = [...produtos]
  if (ordem === "menor-preco") return lista.sort((a, b) => a.preco - b.preco)
  if (ordem === "maior-preco") return lista.sort((a, b) => b.preco - a.preco)
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
}

/** Quantos produtos cada seção mostra antes do "Ver mais" (6 linhas de 4, ou 12 de 2). */
export const LIMITE_POR_SECAO = 24
