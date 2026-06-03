import type { ClassificacaoContato } from "./mock-contatos"

export function calcularClassificacao(
  cards: Array<{ funil: string; etapa: string }>
): ClassificacaoContato {
  const retencao = cards.find((c) => c.funil === "retencao")
  if (retencao) {
    if (["em_onboarding", "cliente_ativo", "aguardando_recompra", "recompra_realizada"].includes(retencao.etapa)) return "ativo"
    if (retencao.etapa === "em_risco") return "em_risco"
    if (retencao.etapa === "inativo") return "inativo"
    if (retencao.etapa === "perdido") return "perdido"
  }
  if (cards.some((c) => c.funil === "expansao")) return "lead"
  return "sem_historico"
}
