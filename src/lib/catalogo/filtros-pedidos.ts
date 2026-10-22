// B39-01: filtros da tela Pedidos. Quem filtra é o banco (`filtrar_pedidos`); este
// arquivo descreve os filtros, o padrão da tela e o que o servidor aceita.

import { z } from "zod"

export type PeriodoPedidos = "hoje" | "7" | "30" | "tudo" | "personalizado"

export interface FiltrosPedidos {
  busca: string
  /** Vazio = todas as situações. */
  situacao: "" | "novo" | "em_atendimento" | "fechado" | "cancelado"
  periodo: PeriodoPedidos
  /** Dias do período personalizado, "aaaa-mm-dd". */
  de: string
  ate: string
  /** Reais, com ponto decimal; vazio = sem limite. */
  valorMin: string
  valorMax: string
  /** Produto do catálogo, ou nome de produto apagado (SUP-B39-03); só um dos dois. */
  produtoId: string
  produtoNome: string
  /** Vazio = todas; "nova" = primeira compra; "antiga" = já tinha comprado (PER-B39-05). */
  cliente: "" | "nova" | "antiga"
  /** Vazio = todos; id do atendente da carteira; "sem" = sem atendente (SUP-B39-02). */
  atendente: string
}

/** Padrão da tela e do "Limpar filtros" (SUP-B39-01). */
export const FILTROS_PADRAO: FiltrosPedidos = {
  busca: "",
  situacao: "",
  periodo: "30",
  de: "",
  ate: "",
  valorMin: "",
  valorMax: "",
  produtoId: "",
  produtoNome: "",
  cliente: "",
  atendente: "",
}

export const AVISO_PERIODO_INVERTIDO = "O dia final precisa ser depois do inicial"

/** Aviso do período personalizado, ou null quando está certo ou incompleto. */
export function erroDoPeriodo(f: Pick<FiltrosPedidos, "periodo" | "de" | "ate">): string | null {
  if (f.periodo !== "personalizado" || !f.de || !f.ate) return null
  return f.ate < f.de ? AVISO_PERIODO_INVERTIDO : null
}

/** Dá para pedir ao servidor: o personalizado precisa dos dois dias, em ordem. */
export function filtrosProntos(f: FiltrosPedidos): boolean {
  if (f.periodo !== "personalizado") return true
  return !!f.de && !!f.ate && erroDoPeriodo(f) === null
}

const DIA = /^\d{4}-\d{2}-\d{2}$/
const VALOR = /^\d{1,10}(\.\d{1,2})?$/

export const esquemaFiltrosPedidos = z
  .object({
    busca: z.string().max(100),
    situacao: z.enum(["", "novo", "em_atendimento", "fechado", "cancelado"]),
    periodo: z.enum(["hoje", "7", "30", "tudo", "personalizado"]),
    de: z.string().refine((v) => v === "" || DIA.test(v)),
    ate: z.string().refine((v) => v === "" || DIA.test(v)),
    valorMin: z.string().refine((v) => v === "" || VALOR.test(v)),
    valorMax: z.string().refine((v) => v === "" || VALOR.test(v)),
    produtoId: z.string().refine((v) => v === "" || z.uuid().safeParse(v).success),
    produtoNome: z.string().max(200),
    cliente: z.enum(["", "nova", "antiga"]),
    atendente: z.string().refine((v) => v === "" || v === "sem" || z.uuid().safeParse(v).success),
  })
  .refine((f) => filtrosProntos(f as FiltrosPedidos), { message: "Período inválido" })
