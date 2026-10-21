// B32-03: cálculo puro da Visão Geral dos relatórios (modelo Tailor). Sem banco, para
// ser testável. O carregamento fica em src/app/(auth)/relatorios/actions.ts.
//
// Datas são strings "yyyy-mm-dd" no fuso da operação, comparadas como texto: a compra
// guarda só a data, e assim não há hora nem fuso para errar.

export type PeriodoRelatorio =
  /** Um ou vários meses (1 a 12) do mesmo ano. */
  | { tipo: "meses"; ano: number; meses: number[] }
  /** Só o dia de ontem. */
  | { tipo: "ontem" }

export type FiltroRelatorio = {
  periodo: PeriodoRelatorio
  atendenteId?: string | null
}

export type VendaRow = {
  contact_id: string
  /** yyyy-mm-dd */
  data: string
  /** Valor pago (líquido). */
  valor: number
  desconto: number | null
  pecas: number | null
  atendente_id?: string | null
}

/** Intervalo fechado de datas, yyyy-mm-dd. */
export type Intervalo = { de: string; ate: string }

export type Comparativo = {
  /** Variação em %, com uma casa; nulo sem base (período comparado zerado ou vazio). */
  percentual: number | null
  /** Valor do período comparado, para o balão. */
  valorComparado: number | null
  /** Ex.: "Set/2026" ou "19/09/2026". */
  rotulo: string
}

export type FormatoCartao = "inteiro" | "moeda" | "decimal"

export type Cartao = {
  id: keyof Resumo
  titulo: string
  formato: FormatoCartao
  /** Nulo = divisão por zero ("—"). */
  valor: number | null
  /** Nulos quando o período tem mais de um mês. */
  vsMesPassado: Comparativo | null
  vsAnoPassado: Comparativo | null
}

export type Resumo = {
  clientesPositivados: number
  quantidadeVendas: number
  faturamentoBruto: number
  descontos: number
  faturamentoLiquido: number
  ticketMedioPorCliente: number | null
  ticketMedioPorVenda: number | null
  ticketMedioPorPeca: number | null
  pecasPorCliente: number | null
  quantidadePecas: number
}

export type VisaoGeralCartoes = {
  cabecalho: {
    /** Ex.: "Mês: Outubro | Ano: 2026". */
    titulo: string
    /** Aviso da comparação justa; nulo quando o período não inclui hoje. */
    aviso: string | null
  }
  intervalo: Intervalo
  resumo: Resumo
  cartoes: Cartao[]
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// ---------- datas como texto ----------

const dois = (n: number) => String(n).padStart(2, "0")

export function partesDaData(iso: string): { ano: number; mes: number; dia: number } {
  const [a, m, d] = iso.split("-").map(Number)
  return { ano: a, mes: m, dia: d }
}

export function montarData(ano: number, mes: number, dia: number): string {
  return `${ano}-${dois(mes)}-${dois(dia)}`
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** Dia anterior, como texto. */
export function diaAnterior(iso: string): string {
  const { ano, mes, dia } = partesDaData(iso)
  const d = new Date(Date.UTC(ano, mes - 1, dia - 1))
  return montarData(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** Mesma data N meses antes ou depois, com o dia preso ao último do mês de destino. */
export function deslocarMeses(iso: string, meses: number): string {
  const { ano, mes, dia } = partesDaData(iso)
  const total = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return montarData(novoAno, novoMes, Math.min(dia, ultimoDiaDoMes(novoAno, novoMes)))
}

/** Hoje no fuso da operação, yyyy-mm-dd. */
export function hojeNoFuso(agora = new Date()): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

export function formatarDataBr(iso: string): string {
  const { ano, mes, dia } = partesDaData(iso)
  return `${dois(dia)}/${dois(mes)}/${ano}`
}

// ---------- período ----------

export function periodoPadrao(hoje: string): PeriodoRelatorio {
  const { ano, mes } = partesDaData(hoje)
  return { tipo: "meses", ano, meses: [mes] }
}

export function periodoMesAnterior(hoje: string): PeriodoRelatorio {
  const { ano, mes } = deslocarPartes(hoje, -1)
  return { tipo: "meses", ano, meses: [mes] }
}

function deslocarPartes(hoje: string, meses: number) {
  return partesDaData(deslocarMeses(montarData(partesDaData(hoje).ano, partesDaData(hoje).mes, 1), meses))
}

/** Intervalo do período, nunca passando de hoje. */
export function intervaloDoPeriodo(periodo: PeriodoRelatorio, hoje: string): Intervalo {
  if (periodo.tipo === "ontem") {
    const ontem = diaAnterior(hoje)
    return { de: ontem, ate: ontem }
  }
  const meses = [...periodo.meses].sort((a, b) => a - b)
  const de = montarData(periodo.ano, meses[0], 1)
  const ultimo = meses[meses.length - 1]
  const ate = montarData(periodo.ano, ultimo, ultimoDiaDoMes(periodo.ano, ultimo))
  return { de, ate: ate > hoje ? hoje : ate }
}

export function tituloDoPeriodo(periodo: PeriodoRelatorio, hoje: string): string {
  if (periodo.tipo === "ontem") return `Dia: ${formatarDataBr(diaAnterior(hoje))}`
  const nomes = [...periodo.meses].sort((a, b) => a - b).map((m) => MESES[m - 1])
  const lista = nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`
  return `Mês: ${lista} | Ano: ${periodo.ano}`
}

/** O período tem comparativos só com um mês (ou só ontem). */
export function temComparativos(periodo: PeriodoRelatorio): boolean {
  return periodo.tipo === "ontem" || periodo.meses.length === 1
}

/**
 * Comparação justa: se o período inclui hoje, os comparativos vão até ontem (D-1) nos
 * três lados. No dia 1º não há dia anterior dentro do mês: sem comparativos.
 */
export function comparacaoJusta(intervalo: Intervalo, hoje: string): { ate: string | null; aviso: string | null } {
  if (intervalo.ate < hoje) return { ate: intervalo.ate, aviso: null }
  const ontem = diaAnterior(hoje)
  if (ontem < intervalo.de) {
    return { ate: null, aviso: "Sem comparativos no dia 1º: ainda não há dia anterior no mês" }
  }
  return { ate: ontem, aviso: `Comparativos até o dia ${partesDaData(ontem).dia}, para comparar períodos iguais` }
}

// ---------- cálculo ----------

const dentro = (v: VendaRow, i: Intervalo) => v.data >= i.de && v.data <= i.ate

const divisao = (a: number, b: number): number | null => (b > 0 ? a / b : null)

export function resumoDasVendas(vendas: VendaRow[]): Resumo {
  const clientes = new Set(vendas.map((v) => v.contact_id)).size
  const liquido = vendas.reduce((s, v) => s + v.valor, 0)
  const descontos = vendas.reduce((s, v) => s + (v.desconto ?? 0), 0)
  const pecas = vendas.reduce((s, v) => s + (v.pecas ?? 0), 0)
  return {
    clientesPositivados: clientes,
    quantidadeVendas: vendas.length,
    faturamentoBruto: liquido + descontos,
    descontos,
    faturamentoLiquido: liquido,
    ticketMedioPorCliente: divisao(liquido, clientes),
    ticketMedioPorVenda: divisao(liquido, vendas.length),
    ticketMedioPorPeca: divisao(liquido, pecas),
    pecasPorCliente: divisao(pecas, clientes),
    quantidadePecas: pecas,
  }
}

const CARTOES: Array<{ id: keyof Resumo; titulo: string; formato: FormatoCartao }> = [
  { id: "clientesPositivados", titulo: "Clientes positivados", formato: "inteiro" },
  { id: "quantidadeVendas", titulo: "Qtd de vendas", formato: "inteiro" },
  { id: "faturamentoBruto", titulo: "Faturamento bruto", formato: "moeda" },
  { id: "descontos", titulo: "Descontos", formato: "moeda" },
  { id: "faturamentoLiquido", titulo: "Faturamento líquido", formato: "moeda" },
  { id: "ticketMedioPorCliente", titulo: "Ticket médio por cliente", formato: "moeda" },
  { id: "ticketMedioPorVenda", titulo: "Ticket médio por venda", formato: "moeda" },
  { id: "ticketMedioPorPeca", titulo: "Ticket médio por peça", formato: "moeda" },
  { id: "pecasPorCliente", titulo: "Peças por cliente", formato: "decimal" },
  { id: "quantidadePecas", titulo: "Qtd de peças", formato: "inteiro" },
]

export function variacaoPercentual(atual: number | null, base: number | null): number | null {
  if (atual === null || base === null || base === 0) return null
  return Math.round(((atual - base) / base) * 1000) / 10
}

/** Fim do recorte deslocado: mês cheio continua mês cheio (Set 1–30 → Ago 1–31). */
function deslocarFim(ate: string, meses: number): string {
  const { ano, mes, dia } = partesDaData(ate)
  if (dia !== ultimoDiaDoMes(ano, mes)) return deslocarMeses(ate, meses)
  const alvo = partesDaData(deslocarMeses(montarData(ano, mes, 1), meses))
  return montarData(alvo.ano, alvo.mes, ultimoDiaDoMes(alvo.ano, alvo.mes))
}

function rotuloDoIntervalo(i: Intervalo): string {
  if (i.de === i.ate) return formatarDataBr(i.de)
  const { ano, mes } = partesDaData(i.de)
  return `${MESES_CURTOS[mes - 1]}/${ano}`
}

/**
 * Os dez cartões do período, com os comparativos contra o mesmo recorte do mês
 * anterior e do mesmo mês do ano anterior (SUP-B32-01..03, PER-B32-01).
 */
export function calcularCartoes(vendas: VendaRow[], periodo: PeriodoRelatorio, hoje: string): VisaoGeralCartoes {
  const intervalo = intervaloDoPeriodo(periodo, hoje)
  const resumo = resumoDasVendas(vendas.filter((v) => dentro(v, intervalo)))

  const justa = comparacaoJusta(intervalo, hoje)
  const compara = temComparativos(periodo) && justa.ate !== null

  let atual: Resumo | null = null
  let mesPassado: { resumo: Resumo; rotulo: string } | null = null
  let anoPassado: { resumo: Resumo; rotulo: string } | null = null
  if (compara) {
    const recorte: Intervalo = { de: intervalo.de, ate: justa.ate! }
    atual = resumoDasVendas(vendas.filter((v) => dentro(v, recorte)))
    const mes: Intervalo = { de: deslocarMeses(recorte.de, -1), ate: deslocarFim(recorte.ate, -1) }
    const ano: Intervalo = { de: deslocarMeses(recorte.de, -12), ate: deslocarFim(recorte.ate, -12) }
    mesPassado = { resumo: resumoDasVendas(vendas.filter((v) => dentro(v, mes))), rotulo: rotuloDoIntervalo(mes) }
    anoPassado = { resumo: resumoDasVendas(vendas.filter((v) => dentro(v, ano))), rotulo: rotuloDoIntervalo(ano) }
  }

  const comparativo = (id: keyof Resumo, base: { resumo: Resumo; rotulo: string } | null): Comparativo | null => {
    if (!atual || !base) return null
    const valorBase = base.resumo[id]
    return { percentual: variacaoPercentual(atual[id], valorBase), valorComparado: valorBase, rotulo: base.rotulo }
  }

  return {
    cabecalho: { titulo: tituloDoPeriodo(periodo, hoje), aviso: temComparativos(periodo) ? justa.aviso : null },
    intervalo,
    resumo,
    cartoes: CARTOES.map((c) => ({
      ...c,
      valor: resumo[c.id],
      vsMesPassado: comparativo(c.id, mesPassado),
      vsAnoPassado: comparativo(c.id, anoPassado),
    })),
  }
}
