// B34-01: análise de coortes (modelo Tailor), cálculo puro. Coorte = mês da primeira
// venda do cliente; Mês k = o mês calendário k meses depois; a aba mostra as 12 coortes
// mais recentes. Datas "yyyy-mm-dd" no fuso da operação.

import { partesDaData, type VendaRow } from "./visao-geral"

export const MESES_DA_COORTE = 12

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

export type Coorte = {
  /** yyyy-mm do mês da primeira venda. */
  mes: string
  /** Ex.: "Nov/2025". */
  rotulo: string
  clientes: number
  /** Meses passados do mês da coorte até o mês de hoje (0 = este mês). */
  idade: number
  /** Mês 0..11: clientes com venda naquele mês; nulo quando o mês ainda não chegou. */
  clientesPorMes: Array<number | null>
  /** Mês 0..11: % de retenção (uma casa); nulo quando o mês ainda não chegou. */
  retencao: Array<number | null>
  /** Mês 0..11: valor médio por venda; nulo sem venda ou mês futuro. */
  valorMedio: Array<number | null>
  /** Mês 0..11: quantidade de vendas; nulo quando o mês ainda não chegou. */
  vendasPorMes: Array<number | null>
}

export type ResultadoCoorte = {
  referencia: string
  coortes: Coorte[]
}

const indiceDoMes = (yyyymm: string) => {
  const [a, m] = yyyymm.split("-").map(Number)
  return a * 12 + (m - 1)
}

const mesDoIndice = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`

export function rotuloDoMes(yyyymm: string): string {
  const [a, m] = yyyymm.split("-").map(Number)
  return `${MESES_CURTOS[m - 1]}/${a}`
}

const arred2 = (n: number) => Math.round(n * 100) / 100
const arred1 = (n: number) => Math.round(n * 10) / 10

/** As 12 coortes mais recentes (da mais antiga para a mais nova), com retenção e valor médio por mês. */
export function calcularCoortes(vendas: VendaRow[], hoje: string, quantidade = MESES_DA_COORTE): ResultadoCoorte {
  const { ano, mes } = partesDaData(hoje)
  const indiceHoje = ano * 12 + (mes - 1)
  const primeiroIndice = indiceHoje - (quantidade - 1)

  // Primeira venda de cada cliente (toda a história), para saber a coorte.
  const primeira = new Map<string, string>()
  for (const v of vendas) {
    if (v.data > hoje) continue
    const atual = primeira.get(v.contact_id)
    if (!atual || v.data < atual) primeira.set(v.contact_id, v.data)
  }
  const coorteDoCliente = new Map<string, number>()
  for (const [id, data] of primeira) {
    const i = indiceDoMes(data.slice(0, 7))
    if (i >= primeiroIndice && i <= indiceHoje) coorteDoCliente.set(id, i)
  }

  // Por coorte e mês k: clientes distintos, vendas e faturamento.
  type Acum = { clientes: Set<string>; vendas: number; valor: number }
  const acum = new Map<string, Acum>()
  const chave = (c: number, k: number) => `${c}:${k}`
  for (const v of vendas) {
    if (v.data > hoje) continue
    const c = coorteDoCliente.get(v.contact_id)
    if (c === undefined) continue
    const k = indiceDoMes(v.data.slice(0, 7)) - c
    if (k < 0 || k >= MESES_DA_COORTE) continue
    const a = acum.get(chave(c, k)) ?? { clientes: new Set<string>(), vendas: 0, valor: 0 }
    a.clientes.add(v.contact_id)
    a.vendas++
    a.valor += v.valor
    acum.set(chave(c, k), a)
  }

  const coortes: Coorte[] = []
  for (let c = primeiroIndice; c <= indiceHoje; c++) {
    const clientes = [...coorteDoCliente.values()].filter((x) => x === c).length
    const idade = indiceHoje - c
    const clientesPorMes: Array<number | null> = []
    const retencao: Array<number | null> = []
    const valorMedio: Array<number | null> = []
    const vendasPorMes: Array<number | null> = []
    for (let k = 0; k < MESES_DA_COORTE; k++) {
      if (k > idade || clientes === 0) {
        clientesPorMes.push(null); retencao.push(null); valorMedio.push(null); vendasPorMes.push(null)
        continue
      }
      const a = acum.get(chave(c, k))
      const n = a?.clientes.size ?? 0
      clientesPorMes.push(n)
      retencao.push(k === 0 ? 100 : arred1((n / clientes) * 100))
      vendasPorMes.push(a?.vendas ?? 0)
      valorMedio.push(a && a.vendas > 0 ? arred2(a.valor / a.vendas) : null)
    }
    const mesYm = mesDoIndice(c)
    coortes.push({ mes: mesYm, rotulo: rotuloDoMes(mesYm), clientes, idade, clientesPorMes, retencao, valorMedio, vendasPorMes })
  }
  return { referencia: hoje, coortes }
}

/** Mês calendário do Mês k de uma coorte, "Fev/2026". */
export function rotuloDoMesK(coorte: Coorte, k: number): string {
  return rotuloDoMes(mesDoIndice(indiceDoMes(coorte.mes) + k))
}
