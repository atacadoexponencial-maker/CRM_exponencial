// B33-01: cálculo puro do RFV (modelo Tailor). Sem banco, para ser testável.
//
// Recência por faixas fixas de dias; Frequência e Valor por quintis da própria base nos
// 12 meses até a data de referência; FV = média de F e V arredondada para cima; o
// perfil sai da matriz FV × R. Datas são "yyyy-mm-dd" no fuso da operação.

import { deslocarMeses, partesDaData, type VendaRow } from "./visao-geral"

export type PerfilRfv =
  | "campeao"
  | "fieis"
  | "potencial_fiel"
  | "recentes"
  | "promissores"
  | "precisa_atencao"
  | "nao_perder"
  | "em_risco"
  | "semi_perdido"
  | "hibernando"
  | "perdido"

export const PERFIS: ReadonlyArray<{ id: PerfilRfv; nome: string; cor: string; icone: string; saudavel: boolean }> = [
  { id: "campeao", nome: "Campeão", cor: "#4caf7d", icone: "🏆", saudavel: true },
  { id: "fieis", nome: "Clientes Fiéis", cor: "#5b8def", icone: "💎", saudavel: true },
  { id: "potencial_fiel", nome: "Potencial Fiel", cor: "#8b5cf6", icone: "⭐", saudavel: true },
  { id: "recentes", nome: "Clientes Recentes", cor: "#4fb3d6", icone: "🆕", saudavel: true },
  { id: "promissores", nome: "Clientes Promissores", cor: "#3fb39a", icone: "🚀", saudavel: true },
  { id: "precisa_atencao", nome: "Precisa de Atenção", cor: "#e2b93b", icone: "👀", saudavel: false },
  { id: "nao_perder", nome: "Não Perder", cor: "#c0392b", icone: "💔", saudavel: false },
  { id: "em_risco", nome: "Em Risco", cor: "#e8a33d", icone: "🔥", saudavel: false },
  { id: "semi_perdido", nome: "Semi Perdido", cor: "#e67e22", icone: "⚠️", saudavel: false },
  { id: "hibernando", nome: "Hibernando", cor: "#7f8c8d", icone: "😴", saudavel: false },
  { id: "perdido", nome: "Perdido", cor: "#e35d5b", icone: "❌", saudavel: false },
]

export const PERFIL_POR_ID: Record<PerfilRfv, (typeof PERFIS)[number]> = Object.fromEntries(PERFIS.map((p) => [p.id, p])) as Record<
  PerfilRfv,
  (typeof PERFIS)[number]
>

/** Linha = FV de 5 a 1; coluna = R de 1 a 5. */
const MATRIZ: Record<number, PerfilRfv[]> = {
  5: ["nao_perder", "em_risco", "fieis", "fieis", "campeao"],
  4: ["em_risco", "em_risco", "fieis", "fieis", "fieis"],
  3: ["em_risco", "em_risco", "precisa_atencao", "potencial_fiel", "potencial_fiel"],
  2: ["perdido", "hibernando", "semi_perdido", "potencial_fiel", "potencial_fiel"],
  1: ["perdido", "perdido", "semi_perdido", "promissores", "recentes"],
}

export function perfilDaMatriz(r: number, fv: number): PerfilRfv {
  return MATRIZ[fv][r - 1]
}

/** Nota de Recência pelas faixas fixas (30/60/90/180 dias). */
export function notaRecencia(dias: number): number {
  if (dias <= 30) return 5
  if (dias <= 60) return 4
  if (dias <= 90) return 3
  if (dias <= 180) return 2
  return 1
}

/**
 * Nota 1–5 por quintil: o quinto com os maiores valores recebe 5. Empatados recebem a
 * mesma nota, a maior entre eles. Valor zero (sem venda nos 12 meses) é sempre 1.
 */
export function notasPorQuintil(valores: Map<string, number>): Map<string, number> {
  const ordenados = [...valores.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const n = ordenados.length
  const notas = new Map<string, number>()
  let i = 0
  while (i < n) {
    const valor = ordenados[i][1]
    const nota = 5 - Math.floor((i * 5) / n)
    let j = i
    while (j < n && ordenados[j][1] === valor) {
      notas.set(ordenados[j][0], nota)
      j++
    }
    i = j
  }
  for (const [id, v] of valores) if (v <= 0) notas.set(id, 1)
  return notas
}

export function diasEntre(de: string, ate: string): number {
  const a = partesDaData(de), b = partesDaData(ate)
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000)
}

export type ClienteRfv = {
  contatoId: string
  nome: string
  telefone: string | null
  cidade: string | null
  uf: string | null
  /** Atendente do contato (não da venda). */
  atendente: string | null
  r: number
  f: number
  v: number
  fv: number
  perfil: PerfilRfv
  diasSemCompra: number
  ultimaVenda: string
  vendas12m: number
  valor12m: number
  ativo: boolean
  semLembrete15d: boolean
}

export type CelulaRfv = { r: number; fv: number; perfil: PerfilRfv; clientes: number; percentualAtivos: number | null }

export type IndicadorPerfil = {
  perfil: PerfilRfv
  clientes: number
  semLembrete: number
  percentualSemLembrete: number | null
  diasSemCompraMedio: number | null
  vendasMedias: number | null
  valorMedioPorCliente: number | null
}

export type ResultadoRfv = {
  referencia: string
  base: number
  clientes: ClienteRfv[]
  /** 25 células, linhas FV 5→1, colunas R 1→5. */
  matriz: CelulaRfv[]
  indicadores: IndicadorPerfil[]
  /** B33-03: perfis semana a semana e mês a mês. */
  evolucao: EvolucaoRfv
}

export type ExtrasRfv = {
  /** Contatos com card da Recompra em etapa ativa. */
  ativos: Set<string>
  /** Contatos com lembrete criado nos últimos 15 dias. */
  comLembreteRecente: Set<string>
  /** Nome do atendente do contato, por contato. */
  atendenteDoContato?: Map<string, string | null>
}

const arred2 = (n: number) => Math.round(n * 100) / 100

/** Notas, perfil e dados de cada cliente da base na data de referência. */
export function calcularClientesRfv(vendas: VendaRow[], referencia: string, extras: ExtrasRfv): ClienteRfv[] {
  const inicio12m = deslocarMeses(referencia, -12)
  const porContato = new Map<string, VendaRow[]>()
  for (const v of vendas) {
    if (v.data > referencia) continue
    porContato.set(v.contact_id, [...(porContato.get(v.contact_id) ?? []), v])
  }

  const freq = new Map<string, number>()
  const valor = new Map<string, number>()
  const ultima = new Map<string, string>()
  for (const [id, lista] of porContato) {
    const em12m = lista.filter((v) => v.data > inicio12m)
    freq.set(id, em12m.length)
    valor.set(id, arred2(em12m.reduce((s, v) => s + v.valor, 0)))
    ultima.set(id, lista.reduce((m, v) => (v.data > m ? v.data : m), lista[0].data))
  }
  const notasF = notasPorQuintil(freq)
  const notasV = notasPorQuintil(valor)

  return [...porContato.entries()].map(([id, lista]) => {
    const amostra = lista[0]
    const f = notasF.get(id) ?? 1
    const v = notasV.get(id) ?? 1
    const fv = Math.ceil((f + v) / 2)
    const dias = diasEntre(ultima.get(id)!, referencia)
    const r = notaRecencia(dias)
    return {
      contatoId: id,
      nome: amostra.contato_nome ?? amostra.contato_telefone ?? "—",
      telefone: amostra.contato_telefone ?? null,
      cidade: amostra.contato_cidade ?? null,
      uf: amostra.contato_uf ?? null,
      atendente: extras.atendenteDoContato?.get(id) ?? null,
      r, f, v, fv,
      perfil: perfilDaMatriz(r, fv),
      diasSemCompra: dias,
      ultimaVenda: ultima.get(id)!,
      vendas12m: freq.get(id) ?? 0,
      valor12m: valor.get(id) ?? 0,
      ativo: extras.ativos.has(id),
      semLembrete15d: !extras.comLembreteRecente.has(id),
    }
  })
}

export function montarMatriz(clientes: ClienteRfv[]): CelulaRfv[] {
  const celulas: CelulaRfv[] = []
  for (let fv = 5; fv >= 1; fv--) {
    for (let r = 1; r <= 5; r++) {
      const dentro = clientes.filter((c) => c.r === r && c.fv === fv)
      const ativos = dentro.filter((c) => c.ativo).length
      celulas.push({
        r, fv,
        perfil: perfilDaMatriz(r, fv),
        clientes: dentro.length,
        percentualAtivos: dentro.length ? Math.round((ativos / dentro.length) * 100) : null,
      })
    }
  }
  return celulas
}

export function montarIndicadores(clientes: ClienteRfv[]): IndicadorPerfil[] {
  return PERFIS.map((p) => {
    const dentro = clientes.filter((c) => c.perfil === p.id)
    const n = dentro.length
    const media = (f: (c: ClienteRfv) => number) => (n ? arred2(dentro.reduce((s, c) => s + f(c), 0) / n) : null)
    const semLembrete = dentro.filter((c) => c.semLembrete15d).length
    return {
      perfil: p.id,
      clientes: n,
      semLembrete,
      percentualSemLembrete: n ? Math.round((semLembrete / n) * 100) : null,
      diasSemCompraMedio: n ? Math.round(dentro.reduce((s, c) => s + c.diasSemCompra, 0) / n) : null,
      vendasMedias: media((c) => c.vendas12m),
      valorMedioPorCliente: media((c) => c.valor12m),
    }
  })
}

export function calcularRfv(vendas: VendaRow[], referencia: string, extras: ExtrasRfv): ResultadoRfv {
  const clientes = calcularClientesRfv(vendas, referencia, extras)
  return {
    referencia,
    base: clientes.length,
    clientes,
    matriz: montarMatriz(clientes),
    indicadores: montarIndicadores(clientes),
    evolucao: evolucaoDosPerfis(vendas, referencia),
  }
}

// ---------- evolução dos perfis (B33-03) ----------

export type ColunaEvolucao = {
  /** Data de referência, yyyy-mm-dd. */
  referencia: string
  /** "S43" ou "Out/26". */
  rotulo: string
  /** Data curta da referência, "21/10". */
  sub: string
  porPerfil: Record<PerfilRfv, number>
  /** Soma dos perfis saudáveis. */
  saudavel: number
}

export type EvolucaoRfv = { semanal: ColunaEvolucao[]; mensal: ColunaEvolucao[] }

const SEMANAS = 14
const MESES_EVOLUCAO = 13
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function utc(iso: string): Date {
  const { ano, mes, dia } = partesDaData(iso)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function isoDe(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Número da semana ISO (segunda a domingo). */
export function semanaIso(iso: string): number {
  const d = utc(iso)
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dia)
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - inicioAno.getTime()) / 86_400_000 + 1) / 7)
}

/** Domingo que fecha a semana ISO de `iso`. */
function domingoDaSemana(iso: string): string {
  const d = utc(iso)
  const dia = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + (7 - dia))
  return isoDe(d)
}

/** Referências semanais: hoje e os domingos que fecham as 13 semanas anteriores. */
export function referenciasSemanais(hoje: string, quantidade = SEMANAS): string[] {
  const refs = [hoje]
  const domingoAtual = utc(domingoDaSemana(hoje))
  for (let k = 1; k < quantidade; k++) {
    const d = new Date(domingoAtual)
    d.setUTCDate(d.getUTCDate() - 7 * k)
    refs.push(isoDe(d))
  }
  return refs
}

/** Referências mensais: hoje e o último dia dos 12 meses anteriores. */
export function referenciasMensais(hoje: string, quantidade = MESES_EVOLUCAO): string[] {
  const refs = [hoje]
  const { ano, mes } = partesDaData(hoje)
  for (let k = 1; k < quantidade; k++) {
    const d = new Date(Date.UTC(ano, mes - k, 0)) // dia 0 do mês seguinte = último dia do mês (mes − k)
    refs.push(isoDe(d))
  }
  return refs
}

const dois = (n: number) => String(n).padStart(2, "0")

function coluna(vendas: VendaRow[], referencia: string, rotulo: string): ColunaEvolucao {
  const clientes = calcularClientesRfv(vendas, referencia, { ativos: new Set(), comLembreteRecente: new Set() })
  const porPerfil = Object.fromEntries(PERFIS.map((p) => [p.id, 0])) as Record<PerfilRfv, number>
  for (const c of clientes) porPerfil[c.perfil]++
  const { dia, mes } = partesDaData(referencia)
  return {
    referencia,
    rotulo,
    sub: `${dois(dia)}/${dois(mes)}`,
    porPerfil,
    saudavel: PERFIS.filter((p) => p.saudavel).reduce((s, p) => s + porPerfil[p.id], 0),
  }
}

/** Perfis em cada semana (14) e em cada mês (13), mais recente primeiro (SUP-B33-04). */
export function evolucaoDosPerfis(vendas: VendaRow[], hoje: string): EvolucaoRfv {
  return {
    semanal: referenciasSemanais(hoje).map((ref) => coluna(vendas, ref, `S${dois(semanaIso(ref))}`)),
    mensal: referenciasMensais(hoje).map((ref) => {
      const { ano, mes } = partesDaData(ref)
      return coluna(vendas, ref, `${MESES_CURTOS[mes - 1]}/${String(ano).slice(2)}`)
    }),
  }
}
