// Regras de venda do produto (B31-01): faixas de preço por quantidade e mínimo de peças
// por pedido. Funções puras, iguais no editor, na vitrine e no servidor. O servidor é
// quem decide: a vitrine só mostra.

export interface FaixaPreco {
  /** A partir de quantas peças do produto (somando cores e tamanhos) o preço vale. */
  min: number
  preco: number
}

export const MAX_FAIXAS = 3

function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Faixas limpas (ordenadas por quantidade) ou o aviso do que está errado. */
export function validarFaixas(faixas: FaixaPreco[], precoBase: number): { erro: string } | { faixas: FaixaPreco[] } {
  if (faixas.length > MAX_FAIXAS) return { erro: `O produto aceita até ${MAX_FAIXAS} faixas de preço.` }
  const limpas = [...faixas].sort((a, b) => a.min - b.min)
  let anterior: FaixaPreco | null = null
  for (const [i, f] of limpas.entries()) {
    const n = i + 1
    if (!Number.isInteger(f.min) || f.min < 2) return { erro: `Faixa ${n}: a quantidade precisa ser um número inteiro a partir de 2.` }
    if (!Number.isFinite(f.preco) || f.preco <= 0) return { erro: `Faixa ${n}: informe um preço maior que zero.` }
    if (f.preco >= precoBase) return { erro: `Faixa ${n}: o preço precisa ser menor que o preço do produto (${reais(precoBase)}).` }
    if (anterior && f.min === anterior.min) return { erro: `Faixa ${n}: já existe uma faixa a partir de ${f.min} peças.` }
    if (anterior && f.preco >= anterior.preco) return { erro: `Faixa ${n}: o preço precisa ser menor que o da faixa anterior (${reais(anterior.preco)}).` }
    anterior = f
  }
  return { faixas: limpas.map((f) => ({ min: f.min, preco: Math.round(f.preco * 100) / 100 })) }
}

/** `null` é "sem mínimo"; senão, inteiro a partir de 1. */
export function validarMinimo(minimo: unknown): { erro: string } | { minimo: number | null } {
  if (minimo === null || minimo === undefined || minimo === "") return { minimo: null }
  if (typeof minimo !== "number" || !Number.isInteger(minimo) || minimo < 1) return { erro: "Mínimo por produto: use um número inteiro a partir de 1." }
  return { minimo }
}

/** Faixas vindas do banco, sem confiar no formato. */
export function faixasDoBanco(bruto: unknown): FaixaPreco[] {
  if (!Array.isArray(bruto)) return []
  return bruto
    .filter((f): f is { min: number; price: number } => !!f && typeof f === "object" && typeof (f as { min?: unknown }).min === "number" && typeof (f as { price?: unknown }).price === "number")
    .map((f) => ({ min: f.min, preco: Number(f.price) }))
    .sort((a, b) => a.min - b.min)
}

export function faixasParaBanco(faixas: FaixaPreco[]): { min: number; price: number }[] {
  return faixas.map((f) => ({ min: f.min, price: f.preco }))
}

/** A faixa que `pecas` alcança (a de maior quantidade que não passa de `pecas`), ou `null`. */
export function faixaAlcancada(faixas: FaixaPreco[], pecas: number): FaixaPreco | null {
  let alcancada: FaixaPreco | null = null
  for (const f of faixas) if (pecas >= f.min) alcancada = f
  return alcancada
}

/** Unitário que vale com `pecas` do produto no pedido. */
export function precoPorQuantidade(precoBase: number, faixas: FaixaPreco[], pecas: number): number {
  return faixaAlcancada(faixas, pecas)?.preco ?? precoBase
}

/** A próxima faixa ainda não alcançada, com quantas peças faltam; `null` quando não há. */
export function proximaFaixa(faixas: FaixaPreco[], pecas: number): { faltam: number; preco: number } | null {
  const proxima = faixas.find((f) => pecas < f.min)
  return proxima ? { faltam: proxima.min - pecas, preco: proxima.preco } : null
}

export function avisoProximaFaixa(faixas: FaixaPreco[], pecas: number): string | null {
  const p = proximaFaixa(faixas, pecas)
  if (!p) return null
  return `${p.faltam === 1 ? "Falta 1 peça" : `Faltam ${p.faltam} peças`} para ${reais(p.preco)}`
}

/** Texto curto das regras para o cartão e a página: "A partir de 12: R$ 24,90 · mínimo 6 peças". */
export function resumoDasRegras(faixas: FaixaPreco[], minimo: number | null): string | null {
  const partes: string[] = []
  const primeira = faixas[0]
  if (primeira) partes.push(`A partir de ${primeira.min}: ${reais(primeira.preco)}`)
  if (minimo) partes.push(`mínimo ${minimo} ${minimo === 1 ? "peça" : "peças"}`)
  return partes.length ? partes.join(" · ") : null
}

/** Aviso do mínimo do produto quando `pecas` fica abaixo; `null` quando está ok. */
export function avisoMinimoProduto(minimo: number | null, pecas: number): string | null {
  if (!minimo || pecas >= minimo) return null
  return `Mínimo ${minimo} ${minimo === 1 ? "peça" : "peças"}`
}
