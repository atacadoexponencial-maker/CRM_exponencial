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
  /** B38-07: filtro por um campo personalizado. */
  campo?: import("@/lib/filtro-por-campo").FiltroPorCampo | null
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
  forma_pagamento?: string | null
  /** B32-05: dados da tabela de vendas; opcionais nos cálculos. */
  id?: string
  created_at?: string | null
  origem?: string | null
  pedido_numero?: number | string | null
  atendente_nome?: string | null
  contato_nome?: string | null
  contato_telefone?: string | null
  contato_cidade?: string | null
  contato_uf?: string | null
  /** B33-01: atendente do contato (não da venda). */
  contato_atendente_nome?: string | null
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

// ---------- gráficos (B32-04) ----------

export type DiaDeVendas = {
  /** yyyy-mm-dd */
  data: string
  /** Rótulo do eixo: o dia do mês (ou dd/mm quando o período passa de um mês). */
  rotulo: string
  valor: number
  pecas: number
  /** Ticket médio por venda do dia; nulo sem venda. */
  ticket: number | null
}

export type DiaDaProjecao = {
  data: string
  rotulo: string
  /** Vendido no dia, até ontem; nulo nos dias que faltam. */
  realizado: number | null
  /** Média diária nos dias que faltam (hoje inclusive); nulo nos dias passados. */
  projetado: number | null
}

export type ProjecaoDoMes = {
  dias: DiaDaProjecao[]
  realizadoAteOntem: number
  mediaDiaria: number
  diasRestantes: number
  totalProjetado: number
}

export type FaturamentoPorForma = {
  forma: string | null
  rotulo: string
  valor: number
  /** % do total do período, com uma casa. */
  percentual: number
}

export type GraficosVisaoGeral = {
  vendasDiarias: DiaDeVendas[]
  /** Nula fora do mês atual (CA-B32-14). */
  projecao: ProjecaoDoMes | null
  porForma: FaturamentoPorForma[]
}

/** Todos os dias do intervalo, em ordem. */
export function diasDoIntervalo(i: Intervalo): string[] {
  const dias: string[] = []
  let atual = i.de
  while (atual <= i.ate) {
    dias.push(atual)
    const { ano, mes, dia } = partesDaData(atual)
    const d = new Date(Date.UTC(ano, mes - 1, dia + 1))
    atual = montarData(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  return dias
}

const arredondar = (n: number) => Math.round(n * 100) / 100

/** Um ponto por dia do intervalo, mesmo sem venda (CA-B32-11). */
export function vendasDiarias(vendas: VendaRow[], intervalo: Intervalo): DiaDeVendas[] {
  const umMes = intervalo.de.slice(0, 7) === intervalo.ate.slice(0, 7)
  const porDia = new Map<string, VendaRow[]>()
  for (const v of vendas) if (dentro(v, intervalo)) porDia.set(v.data, [...(porDia.get(v.data) ?? []), v])
  return diasDoIntervalo(intervalo).map((data) => {
    const doDia = porDia.get(data) ?? []
    const valor = doDia.reduce((s, v) => s + v.valor, 0)
    const { dia, mes } = partesDaData(data)
    return {
      data,
      rotulo: umMes ? String(dia) : `${dois(dia)}/${dois(mes)}`,
      valor: arredondar(valor),
      pecas: doDia.reduce((s, v) => s + (v.pecas ?? 0), 0),
      ticket: doDia.length ? arredondar(valor / doDia.length) : null,
    }
  })
}

/**
 * Projeção do mês atual (SUP-B32-04): realizado até ontem + média diária simples
 * (realizado ÷ dias passados) × dias que faltam, contando hoje. Nula quando o período
 * não é o mês atual; no dia 1º a média é zero.
 */
export function projecaoDoMes(vendas: VendaRow[], periodo: PeriodoRelatorio, hoje: string): ProjecaoDoMes | null {
  const { ano, mes, dia } = partesDaData(hoje)
  if (periodo.tipo !== "meses" || periodo.ano !== ano || periodo.meses.length !== 1 || periodo.meses[0] !== mes) return null

  const ultimo = ultimoDiaDoMes(ano, mes)
  const diasPassados = dia - 1
  const ateOntem: Intervalo = { de: montarData(ano, mes, 1), ate: diaAnterior(hoje) }
  const realizadoPorDia = new Map<string, number>()
  if (diasPassados > 0) {
    for (const v of vendas) if (dentro(v, ateOntem)) realizadoPorDia.set(v.data, (realizadoPorDia.get(v.data) ?? 0) + v.valor)
  }
  const realizadoAteOntem = arredondar([...realizadoPorDia.values()].reduce((s, v) => s + v, 0))
  const mediaDiaria = diasPassados > 0 ? arredondar(realizadoAteOntem / diasPassados) : 0
  const diasRestantes = ultimo - diasPassados

  const dias: DiaDaProjecao[] = []
  for (let d = 1; d <= ultimo; d++) {
    const data = montarData(ano, mes, d)
    const passado = d < dia
    dias.push({
      data,
      rotulo: String(d),
      realizado: passado ? arredondar(realizadoPorDia.get(data) ?? 0) : null,
      projetado: passado ? null : mediaDiaria,
    })
  }
  return {
    dias,
    realizadoAteOntem,
    mediaDiaria,
    diasRestantes,
    totalProjetado: arredondar(realizadoAteOntem + mediaDiaria * diasRestantes),
  }
}

export const ROTULO_SEM_FORMA = "Não informada"

/** Faturamento líquido por forma de pagamento, da maior para a menor (CA-B32-18). */
export function faturamentoPorForma(
  vendas: VendaRow[],
  intervalo: Intervalo,
  rotulos: Record<string, string>
): FaturamentoPorForma[] {
  const soma = new Map<string | null, number>()
  let total = 0
  for (const v of vendas) {
    if (!dentro(v, intervalo)) continue
    const forma = v.forma_pagamento ?? null
    soma.set(forma, (soma.get(forma) ?? 0) + v.valor)
    total += v.valor
  }
  return [...soma.entries()]
    .map(([forma, valor]) => ({
      forma,
      rotulo: forma === null ? ROTULO_SEM_FORMA : (rotulos[forma] ?? forma),
      valor: arredondar(valor),
      percentual: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
}

export function calcularGraficos(
  vendas: VendaRow[],
  periodo: PeriodoRelatorio,
  hoje: string,
  rotulosDeForma: Record<string, string>
): GraficosVisaoGeral {
  const intervalo = intervaloDoPeriodo(periodo, hoje)
  return {
    vendasDiarias: vendasDiarias(vendas, intervalo),
    projecao: projecaoDoMes(vendas, periodo, hoje),
    porForma: faturamentoPorForma(vendas, intervalo, rotulosDeForma),
  }
}

// ---------- tabela de vendas (B32-05) ----------

export type VendaDaTabela = {
  id: string
  contatoId: string
  contato: string
  telefone: string | null
  data: string
  /** "Manual", "Catálogo #123" ou "Externa". */
  origem: string
  atendente: string | null
  cidade: string | null
  uf: string | null
  pecas: number | null
  formaPagamento: string | null
  valor: number
}

/** Vendas do período, da mais recente para a mais antiga (CA-B32-15). */
export function vendasDoPeriodo(
  vendas: VendaRow[],
  intervalo: Intervalo,
  rotulos: { origem: Record<string, string>; forma: Record<string, string> }
): VendaDaTabela[] {
  return vendas
    .filter((v) => dentro(v, intervalo))
    .sort((a, b) => (a.data === b.data ? (b.created_at ?? "").localeCompare(a.created_at ?? "") : b.data.localeCompare(a.data)))
    .map((v) => ({
      id: v.id ?? `${v.contact_id}-${v.data}-${v.valor}`,
      contatoId: v.contact_id,
      contato: v.contato_nome ?? v.contato_telefone ?? "—",
      telefone: v.contato_telefone ?? null,
      data: v.data,
      origem: `${rotulos.origem[v.origem ?? "manual"] ?? v.origem ?? "Manual"}${v.pedido_numero ? ` #${v.pedido_numero}` : ""}`,
      atendente: v.atendente_nome ?? null,
      cidade: v.contato_cidade ?? null,
      uf: v.contato_uf ?? null,
      pecas: v.pecas,
      formaPagamento: v.forma_pagamento ? (rotulos.forma[v.forma_pagamento] ?? v.forma_pagamento) : null,
      valor: v.valor,
    }))
}

// ---------- variação por UF e 25 meses (B32-06) ----------

export const ROTULO_SEM_UF = "Sem UF"

export type LinhaPorUf = {
  uf: string
  clientes: number
  /** % contra o mesmo recorte do ano anterior; nulo sem base. */
  crescimentoClientes: number | null
  vendas: number
  crescimentoVendas: number | null
  /** Vendas ÷ clientes; nulo sem cliente. */
  ticketMedio: number | null
}

export type VariacaoPorUf = {
  linhas: LinhaPorUf[]
  total: LinhaPorUf
  /** Aviso da comparação justa, quando o período inclui hoje. */
  aviso: string | null
  /** Rótulo do período comparado (ex.: "Out/2025"). */
  rotuloBase: string | null
}

/** B38-08: o grupo (ou os grupos, na múltipla escolha) de cada venda. */
export type ChavesDaVenda = (v: VendaRow) => string[]

function resumoPorChave(vendas: VendaRow[], chavesDe: ChavesDaVenda): Map<string, { clientes: Set<string>; vendas: number }> {
  const m = new Map<string, { clientes: Set<string>; vendas: number }>()
  for (const v of vendas) {
    for (const chave of chavesDe(v)) {
      const r = m.get(chave) ?? { clientes: new Set<string>(), vendas: 0 }
      r.clientes.add(v.contact_id)
      r.vendas += v.valor
      m.set(chave, r)
    }
  }
  return m
}

/**
 * Variação em relação ao ano anterior, por UF do contato (SUP-B32-05 invalidada: UF).
 * Comparação justa como nos cartões: com o mês atual incluído, os dois lados vão até ontem.
 */
export function variacaoPorUf(vendas: VendaRow[], periodo: PeriodoRelatorio, hoje: string): VariacaoPorUf {
  return variacaoPorChave(vendas, periodo, hoje, (v) => [v.contato_uf ?? ROTULO_SEM_UF])
}

/**
 * B38-08: a conta da Variação por UF para qualquer agrupamento (a UF, o valor de um
 * campo personalizado). A linha guarda o grupo em `uf`; o total é o de todas as vendas.
 */
export function variacaoPorChave(vendas: VendaRow[], periodo: PeriodoRelatorio, hoje: string, chavesDe: ChavesDaVenda): VariacaoPorUf {
  const intervalo = intervaloDoPeriodo(periodo, hoje)
  const justa = comparacaoJusta(intervalo, hoje)
  const recorte: Intervalo | null = justa.ate ? { de: intervalo.de, ate: justa.ate } : null
  const base: Intervalo | null = recorte ? { de: deslocarMeses(recorte.de, -12), ate: deslocarFim(recorte.ate, -12) } : null

  type R = { clientes: Set<string>; vendas: number }
  // Valores exibidos: o período inteiro. Crescimento: o recorte justo contra a base (D-1 nos dois lados).
  const atual = resumoPorChave(vendas.filter((v) => dentro(v, intervalo)), chavesDe)
  const justo = recorte ? resumoPorChave(vendas.filter((v) => dentro(v, recorte)), chavesDe) : new Map<string, R>()
  const anterior = base ? resumoPorChave(vendas.filter((v) => dentro(v, base)), chavesDe) : new Map<string, R>()

  const linha = (uf: string, a: R | undefined, j: R | undefined, b: R | undefined): LinhaPorUf => {
    const clientes = a?.clientes.size ?? 0
    const total = arredondar(a?.vendas ?? 0)
    return {
      uf,
      clientes,
      crescimentoClientes: base ? variacaoPercentual2(j?.clientes.size ?? 0, b?.clientes.size ?? 0) : null,
      vendas: total,
      crescimentoVendas: base ? variacaoPercentual2(arredondar(j?.vendas ?? 0), arredondar(b?.vendas ?? 0)) : null,
      ticketMedio: clientes > 0 ? arredondar(total / clientes) : null,
    }
  }

  const linhas = [...atual.keys()]
    .map((uf) => linha(uf, atual.get(uf), justo.get(uf), anterior.get(uf)))
    .sort((x, y) => y.vendas - x.vendas || x.uf.localeCompare(y.uf))

  const resumoTotal = (i: Intervalo | null): R | undefined => {
    if (!i) return undefined
    const dentroDele = vendas.filter((v) => dentro(v, i))
    return { clientes: new Set(dentroDele.map((v) => v.contact_id)), vendas: dentroDele.reduce((s, v) => s + v.valor, 0) }
  }

  return {
    linhas,
    total: linha("TOTAL", resumoTotal(intervalo), resumoTotal(recorte), resumoTotal(base)),
    aviso: justa.aviso,
    rotuloBase: base ? rotuloDoIntervalo(base) : null,
  }
}

/** Variação com duas casas (a tabela do Tailor mostra 55,25%). */
export function variacaoPercentual2(atual: number, base: number): number | null {
  if (base === 0) return null
  return Math.round(((atual - base) / base) * 10000) / 100
}

export type MesDoHistorico = {
  /** yyyy-mm */
  mes: string
  /** Ex.: "Out/26". */
  rotulo: string
  valor: number
  /** % contra o mesmo mês do ano anterior; nulo sem base. */
  variacao: number | null
}

/**
 * Valor vendido nos últimos 25 meses, do mês de dois anos atrás ao atual, com a variação
 * contra o mesmo mês do ano anterior. O mês atual conta só até ontem (D-1). Ignora o
 * período (SUP-B32-08); as vendas já vêm filtradas por atendente.
 */
export function historicoDe25Meses(vendas: VendaRow[], hoje: string): MesDoHistorico[] {
  const ontem = diaAnterior(hoje)
  const { ano, mes } = partesDaData(hoje)
  const porMes = new Map<string, number>()
  for (const v of vendas) {
    if (v.data > ontem) continue
    const chave = v.data.slice(0, 7)
    porMes.set(chave, (porMes.get(chave) ?? 0) + v.valor)
  }
  const meses: MesDoHistorico[] = []
  for (let k = 24; k >= 0; k--) {
    const { ano: a, mes: m } = partesDaData(deslocarMeses(montarData(ano, mes, 1), -k))
    const chave = `${a}-${dois(m)}`
    const valor = arredondar(porMes.get(chave) ?? 0)
    const chaveAnterior = `${a - 1}-${dois(m)}`
    const base = porMes.get(chaveAnterior)
    meses.push({
      mes: chave,
      rotulo: `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`,
      valor,
      variacao: base ? variacaoPercentual(valor, arredondar(base)) : null,
    })
  }
  return meses
}
