// Avisos do Salvar do editor de automação (B47-08). Fora do componente de
// cliente porque a página, no servidor, escolhe o aviso de quem chega pelo
// primeiro salvamento (`?salva=`).

export const AVISO_SALVA = "Automação salva"
export const AVISO_SALVA_DESLIGADA = "Automação salva, desligada. Use “Salvar e ativar” para ligar."
export const AVISO_SALVA_LIGADA = "Automação salva e ligada"

export function avisoDoPrimeiroSalvamento(salva: string | undefined): string | undefined {
  if (salva === "ativa") return AVISO_SALVA_LIGADA
  if (salva === "1") return AVISO_SALVA_DESLIGADA
  return undefined
}
