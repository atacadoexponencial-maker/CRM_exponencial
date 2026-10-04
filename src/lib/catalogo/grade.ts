// Compra por grade na vitrine (B17). Funções puras: montam a grade a partir dos tipos de
// variação e limitam as quantidades. O servidor confere o estoque de novo ao fazer o pedido.

import { chaveCombinacao, type TipoVariacao } from "./combinacoes"

export interface LinhaGrade {
  /** Chave da combinação (igual à do estoque e do carrinho). */
  combinacao: string
  /** Opção que identifica a linha dentro do bloco (ex.: "M"). */
  rotulo: string
}

export interface BlocoGrade {
  /** Título do bloco (ex.: "Cor: Areia" ou "Tamanho"). */
  titulo: string
  /** Nome curto para os rótulos acessíveis (ex.: "Areia"); vazio quando há um tipo só. */
  nome: string
  linhas: LinhaGrade[]
}

/** Dois tipos: um bloco por opção do 2º, uma linha por opção do 1º. Um tipo: um bloco. Nenhum: nada. */
export function blocosDaGrade(tipos: TipoVariacao[]): BlocoGrade[] {
  const comOpcoes = tipos.filter((t) => t.opcoes.length > 0)
  if (comOpcoes.length === 0) return []
  const [primeiro, segundo] = comOpcoes
  if (!segundo) {
    return [{ titulo: primeiro.nome, nome: "", linhas: primeiro.opcoes.map((o) => ({ combinacao: chaveCombinacao([o]), rotulo: o })) }]
  }
  return segundo.opcoes.map((b) => ({
    titulo: `${segundo.nome}: ${b}`,
    nome: b,
    linhas: primeiro.opcoes.map((o) => ({ combinacao: chaveCombinacao([o, b]), rotulo: o })),
  }))
}

/** Quantidade digitada ou somada, presa entre 0 e o disponível. Texto inválido vira 0. */
export function limitarQuantidade(valor: string | number, disponivel: number): number {
  const n = typeof valor === "number" ? valor : Number.parseInt(valor.trim(), 10)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(Math.floor(n), Math.max(0, disponivel))
}

export function totaisDaGrade(quantidades: Record<string, number>, preco: number): { pecas: number; valor: number } {
  const pecas = Object.values(quantidades).reduce((s, q) => s + (q > 0 ? q : 0), 0)
  return { pecas, valor: Math.round(pecas * preco * 100) / 100 }
}
