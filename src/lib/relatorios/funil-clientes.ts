// B34-03: funil de clientes (modelo Tailor), cálculo puro. Etapa "N+ compras" = clientes
// com ao menos N vendas em toda a história; parado = sem venda há mais de 90 dias.

import { diasEntre } from "./rfv"
import type { VendaRow } from "./visao-geral"

export const ETAPAS_DO_FUNIL = 7
export const DIAS_PARADO = 90

export const CORES_DAS_ETAPAS = ["#5b6fd6", "#9ccc65", "#f2c14e", "#e05a53", "#7cc3e8", "#4a9a6d", "#f08a4b"]

export type EtapaDoFunil = {
  /** 1..7 */
  n: number
  /** "1+ compras". */
  rotulo: string
  clientes: number
  /** % de clientes da etapa anterior que chegaram a esta; nula na etapa 1. */
  conversao: number | null
  /** Faturamento líquido de toda a história dos clientes da etapa ÷ clientes; nulo sem cliente. */
  ticketMedio: number | null
  /** Clientes da etapa sem venda há mais de 90 dias. */
  parados: number
  cor: string
}

export type ResultadoFunilClientes = {
  referencia: string
  etapas: EtapaDoFunil[]
  /** 1→2 … 6→7. */
  taxas: Array<{ de: number; para: number; percentual: number | null }>
}

const arred1 = (n: number) => Math.round(n * 10) / 10
const arred2 = (n: number) => Math.round(n * 100) / 100

export function calcularFunilClientes(vendas: VendaRow[], hoje: string): ResultadoFunilClientes {
  const porCliente = new Map<string, { vendas: number; total: number; ultima: string }>()
  for (const v of vendas) {
    if (v.data > hoje) continue
    const c = porCliente.get(v.contact_id) ?? { vendas: 0, total: 0, ultima: v.data }
    c.vendas++
    c.total += v.valor
    if (v.data > c.ultima) c.ultima = v.data
    porCliente.set(v.contact_id, c)
  }
  const clientes = [...porCliente.values()]

  const etapas: EtapaDoFunil[] = []
  for (let n = 1; n <= ETAPAS_DO_FUNIL; n++) {
    const dentro = clientes.filter((c) => c.vendas >= n)
    const anterior = etapas[n - 2]
    etapas.push({
      n,
      rotulo: `${n}+ compras`,
      clientes: dentro.length,
      conversao: anterior ? (anterior.clientes > 0 ? arred1((dentro.length / anterior.clientes) * 100) : null) : null,
      ticketMedio: dentro.length ? arred2(dentro.reduce((s, c) => s + c.total, 0) / dentro.length) : null,
      parados: dentro.filter((c) => diasEntre(c.ultima, hoje) > DIAS_PARADO).length,
      cor: CORES_DAS_ETAPAS[n - 1],
    })
  }
  return {
    referencia: hoje,
    etapas,
    taxas: etapas.slice(1).map((e) => ({ de: e.n - 1, para: e.n, percentual: e.conversao })),
  }
}
