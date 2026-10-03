import type { ClassificacaoContato } from "./mock-contatos"

export function calcularClassificacao(
  cards: Array<{ funil: string; etapa: string }>
): ClassificacaoContato {
  const recompra = cards.find((c) => c.funil === "recompra")
  if (recompra) {
    if (["onboarding", "reposicao", "ativos"].includes(recompra.etapa)) return "ativo"
    if (recompra.etapa === "ativos_ri") return "em_risco"
    if (recompra.etapa === "inativos" || recompra.etapa === "inativos_rp") return "inativo"
    if (recompra.etapa === "perdidos") return "perdido"
  }
  if (cards.some((c) => c.funil === "entrada")) return "lead"
  return "sem_historico"
}
