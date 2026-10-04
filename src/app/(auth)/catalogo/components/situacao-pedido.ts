// Situação do pedido do catálogo. Só o vendedor muda; nada muda sozinho (B16).

export type SituacaoPedido = "novo" | "em_atendimento" | "fechado" | "cancelado"

export const ROTULO_SITUACAO: Record<SituacaoPedido, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  fechado: "Fechado",
  cancelado: "Cancelado",
}

/** Classes do selo de cada situação (tema escuro do CRM). */
export const COR_SITUACAO: Record<SituacaoPedido, string> = {
  novo: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  em_atendimento: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  fechado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelado: "bg-muted text-muted-foreground border-border",
}

/** Para onde cada situação pode ir: Novo → Em atendimento → Fechado; Cancelar de qualquer uma ainda aberta. */
export const PROXIMAS_SITUACOES: Record<SituacaoPedido, SituacaoPedido[]> = {
  novo: ["em_atendimento", "fechado", "cancelado"],
  em_atendimento: ["fechado", "cancelado"],
  fechado: ["cancelado"],
  cancelado: [],
}

export function podeMudar(de: SituacaoPedido, para: SituacaoPedido): boolean {
  return PROXIMAS_SITUACOES[de].includes(para)
}
