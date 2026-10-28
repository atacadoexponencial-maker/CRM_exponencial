// B36-06: resumo das compras de um cliente para a ficha do Chat — total, quantidade de
// pedidos, ticket médio e há quantos dias foi a última compra. Cálculo puro.

import { diaNoFuso } from "@/lib/datas"

export type ResumoDeCompras = {
  total: number
  quantidade: number
  ticketMedio: number | null
  /** Dias desde a última compra (a data da compra é um dia, sem hora). */
  diasDesdeUltima: number | null
}

export function resumoDeCompras(compras: Array<{ valor: number | string; data: string }>, fuso: string, agora: Date = new Date()): ResumoDeCompras {
  const total = compras.reduce((s, c) => s + Number(c.valor), 0)
  const quantidade = compras.length
  const ultima = compras.map((c) => c.data.slice(0, 10)).sort().at(-1)
  const diasDesdeUltima = ultima
    ? Math.round((Date.parse(diaNoFuso(agora, fuso) + "T00:00:00Z") - Date.parse(ultima + "T00:00:00Z")) / 86400000)
    : null
  return { total, quantidade, ticketMedio: quantidade > 0 ? total / quantidade : null, diasDesdeUltima }
}

/** "hoje", "ontem", "há 10 dias". */
export function textoDaUltimaCompra(dias: number | null): string | null {
  if (dias === null) return null
  if (dias <= 0) return "hoje"
  if (dias === 1) return "ontem"
  return `há ${dias} dias`
}
