// Variações e combinações de produto do catálogo (B16). Funções puras: usadas pelo CRM,
// pela vitrine e pelo servidor.

export interface TipoVariacao {
  id: string
  nome: string
  opcoes: string[]
}

/** Estoque por combinação; a chave é `chaveCombinacao([...opções])` ("" quando não há variação). */
export type EstoquePorCombinacao = Record<string, number>

export const MAX_TIPOS_VARIACAO = 2

export function chaveCombinacao(opcoes: string[]): string {
  return opcoes.join(" / ")
}

/** Todas as combinações das opções, na ordem dos tipos. Sem tipo com opção, uma combinação vazia. */
export function combinacoes(tipos: TipoVariacao[]): string[][] {
  const comOpcoes = tipos.filter((t) => t.opcoes.length > 0)
  return comOpcoes.reduce<string[][]>(
    (acc, tipo) => acc.flatMap((parcial) => tipo.opcoes.map((o) => [...parcial, o])),
    [[]]
  )
}

/** Soma do estoque das combinações que existem hoje. */
export function estoqueTotal(tipos: TipoVariacao[], estoque: EstoquePorCombinacao): number {
  return combinacoes(tipos).reduce((soma, c) => soma + (estoque[chaveCombinacao(c)] ?? 0), 0)
}
