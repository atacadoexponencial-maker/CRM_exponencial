import type { ClassificacaoContato } from "./mock-contatos"

export function calcularClassificacao(
  cards: Array<{ funil: string; etapa: string }>
): ClassificacaoContato {
  const recompra = cards.find((c) => c.funil === "recompra")
  if (recompra) {
    if (["em_onboarding", "cliente_ativo", "aguardando_recompra", "recompra_realizada"].includes(recompra.etapa)) return "ativo"
    if (recompra.etapa === "em_risco") return "em_risco"
    if (recompra.etapa === "inativo") return "inativo"
    if (recompra.etapa === "perdido") return "perdido"
  }
  if (cards.some((c) => c.funil === "entrada")) return "lead"
  return "sem_historico"
}
