// B36-05: há quanto tempo o card está na etapa e se já passou do limite de "parado".
// O limite é o mesmo que a empresa configura nos Alertas (src/lib/alertas.ts):
// no funil de Entrada, o de "lead sem resposta"; no de Recompra, o da etapa
// (Reposição, Ativos RI e Inativos). Etapa sem limite nunca fica vermelha.

import type { ConfigAlertas } from "@/lib/alertas"

/**
 * A partir de quantos dias na etapa o card conta como parado; `null` = sem limite.
 * B41-05: no funil da empresa, vale o prazo da etapa (`prazoDaEtapa`); como na
 * Recompra, o card fica parado quando passa do prazo.
 */
export function limiteDeParado(funil: string, etapa: string, config: ConfigAlertas, prazoDaEtapa?: number | null): number | null {
  if (funil === "entrada") return etapa === "ganho" || etapa === "perdido" ? null : config.leadSemRespostaDias
  if (funil !== "recompra") return prazoDaEtapa ? prazoDaEtapa + 1 : null
  // Recompra: o alerta nasce quando passa do limite (dias > limite).
  if (etapa === "reposicao") return config.semRecompraDias + 1
  if (etapa === "ativos_ri") return config.emRiscoDias + 1
  if (etapa === "inativos") return config.inativoDias + 1
  return null
}

/** "há 2 h" enquanto está no prazo; "parado 4 dias" quando passou do limite. */
export function situacaoDoCard(etapaDesde: string, limite: number | null, agora: Date = new Date()): { texto: string; parado: boolean } {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(etapaDesde).getTime()) / 60000))
  const dias = Math.floor(minutos / 1440)
  if (limite !== null && dias >= limite) return { texto: dias === 1 ? "parado 1 dia" : `parado ${dias} dias`, parado: true }
  if (minutos < 60) return { texto: minutos < 1 ? "agora" : `há ${minutos} min`, parado: false }
  if (minutos < 1440) return { texto: `há ${Math.floor(minutos / 60)} h`, parado: false }
  return { texto: dias === 1 ? "há 1 dia" : `há ${dias} dias`, parado: false }
}

/** Quantos cards e quanto os clientes da coluna já compraram. */
export function resumoDaColuna(cards: Array<{ totalComprado?: number }>): { quantidade: number; soma: number } {
  return { quantidade: cards.length, soma: cards.reduce((s, c) => s + (c.totalComprado ?? 0), 0) }
}
