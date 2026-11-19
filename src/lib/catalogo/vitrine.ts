// Apresentação da vitrine pública, sem tela nem banco: resumo das variações no cartão,
// ordem dos produtos e carga em blocos. Funções puras, iguais no servidor e no navegador.

import { chaveCombinacao, combinacoes, type EstoquePorCombinacao, type TipoVariacao } from "./combinacoes"

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

/** Uma opção do primeiro tipo de variação no cartão (B61-04). */
export interface OpcaoDoCartao {
  nome: string
  /** Sem estoque em nenhuma combinação que a contém. */
  esgotada: boolean
}

/**
 * B61-04: o que o cartão em retrato mostra das variações. `opcoes` são as do primeiro tipo
 * (o que o lojista cadastrou primeiro), em quadradinhos; `outras` resume o segundo tipo,
 * ex.: "2 opções de cor". Produto sem variação devolve lista vazia e `null`.
 */
export function opcoesDoCartao(tipos: TipoVariacao[], estoque: EstoquePorCombinacao): { opcoes: OpcaoDoCartao[]; outras: string | null } {
  const [primeiro, ...demais] = tipos.filter((t) => t.opcoes.length > 0)
  if (!primeiro) return { opcoes: [], outras: null }
  const todas = combinacoes(tipos)
  const opcoes = primeiro.opcoes.map((nome) => ({
    nome,
    esgotada: todas.filter((c) => c[0] === nome).every((c) => (estoque[chaveCombinacao(c)] ?? 0) === 0),
  }))
  const outras = demais
    .map((t) => `${t.opcoes.length} ${t.opcoes.length === 1 ? "opção" : "opções"} de ${t.nome.trim().toLowerCase() || "variação"}`)
    .join(" · ")
  return { opcoes, outras: outras || null }
}

/**
 * B61-04: o selo "Últimas unidades!" vale para o produto que ainda tem estoque e cujo
 * total, somando todas as combinações, está no limite do lojista ou abaixo. Sem limite, nunca.
 */
export function mostraUltimasUnidades(estoqueDoProduto: number, limite: number | null): boolean {
  return limite !== null && estoqueDoProduto > 0 && estoqueDoProduto <= limite
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
