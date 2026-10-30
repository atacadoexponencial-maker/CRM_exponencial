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

// ---- Desconto por total de peças do pedido (B31-02), regra da loja ----------------------

export interface DescontoPedido {
  /** A partir de quantas peças no pedido inteiro. */
  min: number
  /** Porcentagem a menos sobre o subtotal, de 1 a 90. */
  percent: number
}

export const MAX_DESCONTOS = 3

/** Linhas limpas (ordenadas por quantidade) ou o aviso do que está errado. */
export function validarDescontos(descontos: DescontoPedido[]): { erro: string } | { descontos: DescontoPedido[] } {
  if (descontos.length > MAX_DESCONTOS) return { erro: `A loja aceita até ${MAX_DESCONTOS} linhas de desconto por pedido.` }
  const limpos = [...descontos].sort((a, b) => a.min - b.min)
  let anterior: DescontoPedido | null = null
  for (const [i, d] of limpos.entries()) {
    const n = i + 1
    if (!Number.isInteger(d.min) || d.min < 2) return { erro: `Desconto ${n}: a quantidade precisa ser um número inteiro a partir de 2.` }
    if (!Number.isFinite(d.percent) || d.percent < 1 || d.percent > 90) return { erro: `Desconto ${n}: a porcentagem vai de 1 a 90.` }
    if (anterior && d.min === anterior.min) return { erro: `Desconto ${n}: já existe uma linha a partir de ${d.min} peças.` }
    if (anterior && d.percent <= anterior.percent) return { erro: `Desconto ${n}: a porcentagem precisa ser maior que a da linha anterior (${anterior.percent}%).` }
    anterior = d
  }
  return { descontos: limpos.map((d) => ({ min: d.min, percent: Math.round(d.percent * 100) / 100 })) }
}

export function descontosDoBanco(bruto: unknown): DescontoPedido[] {
  if (!Array.isArray(bruto)) return []
  return bruto
    .filter((d): d is { min: number; percent: number } => !!d && typeof d === "object" && typeof (d as { min?: unknown }).min === "number" && typeof (d as { percent?: unknown }).percent === "number")
    .map((d) => ({ min: d.min, percent: Number(d.percent) }))
    .sort((a, b) => a.min - b.min)
}

/** A linha que o total de peças alcança, ou `null`. */
export function descontoAlcancado(descontos: DescontoPedido[], pecas: number): DescontoPedido | null {
  let alcancado: DescontoPedido | null = null
  for (const d of descontos) if (pecas >= d.min) alcancado = d
  return alcancado
}

/** Desconto em reais (centavos arredondados) e total com o desconto. */
export function aplicarDesconto(subtotal: number, percent: number): { desconto: number; total: number } {
  const desconto = Math.round(subtotal * percent) / 100
  return { desconto, total: Math.round((subtotal - desconto) * 100) / 100 }
}

export function avisoProximoDesconto(descontos: DescontoPedido[], pecas: number): string | null {
  const proximo = descontos.find((d) => pecas < d.min)
  if (!proximo) return null
  const faltam = proximo.min - pecas
  return `${faltam === 1 ? "Falta 1 peça" : `Faltam ${faltam} peças`} para ${proximo.percent}% de desconto`
}

/** Aviso no topo da vitrine: "10% a menos a partir de 50 peças". */
export function resumoDoDesconto(descontos: DescontoPedido[]): string | null {
  const primeiro = descontos[0]
  return primeiro ? `${primeiro.percent}% a menos a partir de ${primeiro.min} peças` : null
}

// ---- Grade fechada (B31-03) ----------------------------------------------------------

export interface GradeFechada {
  /** Quantidade por opção do primeiro tipo de variação (ex.: { P: 1, M: 2, G: 2, GG: 1 }). */
  quantidades: Record<string, number>
  /** Preço próprio da grade; `null` = soma das peças pelo unitário. */
  preco: number | null
}

/** Grade limpa (só as opções do primeiro tipo, inteiros ≥ 0) ou o aviso do que está errado. */
export function validarGrade(grade: GradeFechada | null, tipos: { nome: string; opcoes: string[] }[]): { erro: string } | { grade: GradeFechada | null } {
  if (!grade) return { grade: null }
  const primeiro = tipos.find((t) => t.opcoes.length > 0)
  if (!primeiro) return { erro: "Grade fechada: o produto precisa ter variação (ex.: Tamanho)." }
  const quantidades: Record<string, number> = {}
  for (const opcao of primeiro.opcoes) {
    const q = grade.quantidades[opcao] ?? 0
    if (!Number.isInteger(q) || q < 0 || q > 1000) return { erro: `Grade fechada: ${primeiro.nome} ${opcao}: use um número inteiro de 0 a 1.000.` }
    quantidades[opcao] = q
  }
  if (Object.values(quantidades).every((q) => q === 0)) return { erro: "Grade fechada: informe ao menos uma quantidade." }
  if (grade.preco !== null && (!Number.isFinite(grade.preco) || grade.preco <= 0)) return { erro: "Preço da grade: informe um valor maior que zero." }
  return { grade: { quantidades, preco: grade.preco === null ? null : Math.round(grade.preco * 100) / 100 } }
}

/**
 * Grade vinda do banco, sem confiar no formato. O jsonb reordena as chaves; `tipos`
 * devolve as opções na ordem do lojista (P, M, G, GG), que é a ordem de mostrar.
 */
export function gradeDoBanco(quantidades: unknown, preco: unknown, tipos?: unknown): GradeFechada | null {
  if (!quantidades || typeof quantidades !== "object" || Array.isArray(quantidades)) return null
  const bruto = quantidades as Record<string, unknown>
  const primeiro = Array.isArray(tipos) ? (tipos as { opcoes?: unknown }[]).find((t) => Array.isArray(t?.opcoes) && t.opcoes.length > 0) : undefined
  const ordem = primeiro ? [...(primeiro.opcoes as string[]), ...Object.keys(bruto).filter((k) => !(primeiro.opcoes as string[]).includes(k))] : Object.keys(bruto)
  const limpas: Record<string, number> = {}
  for (const k of ordem) { const v = bruto[k]; if (typeof v === "number" && Number.isInteger(v) && v >= 0) limpas[k] = v }
  if (Object.values(limpas).every((q) => q === 0)) return null
  return { quantidades: limpas, preco: preco === null || preco === undefined ? null : Number(preco) }
}

/** Peças de um pacote. */
export function pecasDaGrade(grade: GradeFechada): number {
  return Object.values(grade.quantidades).reduce((s, q) => s + q, 0)
}

/** Preço de um pacote: o próprio, ou a soma das peças pelo unitário. */
export function precoDaGrade(grade: GradeFechada, unitario: number): number {
  return grade.preco ?? Math.round(pecasDaGrade(grade) * unitario * 100) / 100
}

/**
 * Unitário que vale com a grade: o próprio ÷ peças, ou o unitário normal. B53-12: sem
 * arredondar, para o pacote somar o preço dele (R$ 140 em 6 peças = R$ 140, não 6 × 23,33);
 * a tela arredonda ao mostrar e o total do pedido arredonda em centavos.
 */
export function unitarioDaGrade(grade: GradeFechada, unitario: number): number {
  const pecas = pecasDaGrade(grade)
  return grade.preco === null || pecas === 0 ? unitario : grade.preco / pecas
}

/** "P 1 · M 2 · G 2 · GG 1" (só as opções com quantidade). */
export function detalheDaGrade(grade: GradeFechada): string {
  return Object.entries(grade.quantidades).filter(([, q]) => q > 0).map(([o, q]) => `${o} ${q}`).join(" · ")
}

/** Para o cartão e a página: "Grade fechada de 6 peças" ou "Grade fechada de 6 peças por R$ 150,00". */
export function resumoDaGrade(grade: GradeFechada): string {
  const pecas = pecasDaGrade(grade)
  const base = `Grade fechada de ${pecas} ${pecas === 1 ? "peça" : "peças"}`
  return grade.preco === null ? base : `${base} por ${reais(grade.preco)}`
}

/** Bloco (opção do segundo tipo) de uma combinação "P / Azul" → "Azul"; "" quando há um tipo só. */
export function blocoDaCombinacao(combinacao: string): string {
  const partes = combinacao.split(" / ")
  return partes.length > 1 ? partes.slice(1).join(" / ") : ""
}

/** Opção do primeiro tipo de uma combinação "P / Azul" → "P". */
export function opcaoDaCombinacao(combinacao: string): string {
  return combinacao.split(" / ")[0] ?? ""
}

/**
 * Quantos pacotes inteiros as quantidades de um bloco formam: cada opção com quantidade na
 * grade tem o mesmo múltiplo, e as sem quantidade estão zeradas. `null` = grade quebrada.
 * `quantidades` é por opção do primeiro tipo (ex.: { P: 2, M: 4, G: 4, GG: 2 }).
 */
export function pacotesDoBloco(grade: GradeFechada, quantidades: Record<string, number>): number | null {
  let pacotes: number | null = null
  for (const [opcao, porPacote] of Object.entries(grade.quantidades)) {
    const q = quantidades[opcao] ?? 0
    if (porPacote === 0) {
      if (q !== 0) return null
      continue
    }
    if (q % porPacote !== 0) return null
    const n = q / porPacote
    if (pacotes === null) pacotes = n
    else if (n !== pacotes) return null
  }
  // Opção fora da grade (não existe mais no produto) com quantidade: quebrada.
  for (const [opcao, q] of Object.entries(quantidades)) if (!(opcao in grade.quantidades) && q > 0) return null
  return pacotes ?? 0
}

/** Quantos pacotes inteiros cabem no estoque de um bloco; 0 quando alguma opção da grade não tem estoque para um pacote. */
export function pacotesQueCabem(grade: GradeFechada, disponivelDaOpcao: (opcao: string) => number): number {
  let cabem = Number.POSITIVE_INFINITY
  for (const [opcao, porPacote] of Object.entries(grade.quantidades)) {
    if (porPacote === 0) continue
    cabem = Math.min(cabem, Math.floor(disponivelDaOpcao(opcao) / porPacote))
  }
  return Number.isFinite(cabem) ? cabem : 0
}
