/** Cor da coluna no quadro (Funil de Recompra, B15-02). */
export type CorColuna = "verde" | "amarelo" | "cinza" | "laranja" | "vermelho"

export type EtapaRecompra =
  | "onboarding"
  | "reposicao"
  | "ativos"
  | "ativos_ri"
  | "inativos"
  | "inativos_rp"
  | "perdidos"

export interface CardCliente {
  id: string
  contactId?: string | null
  contato: { nome: string; telefone: string }
  etapa: EtapaRecompra
  atendente: string | null
  tempoNaEtapa: string
  dataEntradaEtapa: string
  tempoNoFunil: string
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  conversaId: string | null
  /** B36-05: cidade e UF do contato, total já comprado, entrada na etapa e limite de "parado". */
  cidade?: string | null
  totalComprado?: number
  etapaDesde?: string
  limiteParadoDias?: number | null
}

export const ETAPAS_RECOMPRA: { id: EtapaRecompra; label: string; cor?: CorColuna }[] = [
  { id: "onboarding", label: "Onboarding" },
  { id: "reposicao", label: "Reposição" },
  { id: "ativos", label: "Ativos", cor: "verde" },
  { id: "ativos_ri", label: "Ativos RI", cor: "amarelo" },
  { id: "inativos", label: "Inativos", cor: "cinza" },
  { id: "inativos_rp", label: "Inativos RP", cor: "laranja" },
  { id: "perdidos", label: "Perdidos", cor: "vermelho" },
]

export type EtapaEntrada =
  | "lead"
  | "sondagem"
  | "catalogo_enviado"
  | "follow_catalogo"
  | "negociacao"
  | "nutricao"
  | "ganho"
  | "perdido"

export interface CardLead {
  id: string
  contactId?: string | null
  contato: { nome: string; telefone: string }
  etapa: EtapaEntrada
  atendente: string | null
  tempoNaEtapa: string
  dataEntradaEtapa: string
  tempoNoFunil: string
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  conversaId: string | null
  /** B36-05: cidade e UF do contato, total já comprado, entrada na etapa e limite de "parado". */
  cidade?: string | null
  totalComprado?: number
  etapaDesde?: string
  limiteParadoDias?: number | null
}

export const ETAPAS_ENTRADA: { id: EtapaEntrada; label: string; alerta?: boolean }[] = [
  { id: "lead", label: "Lead" },
  { id: "sondagem", label: "Sondagem" },
  { id: "catalogo_enviado", label: "Catálogo Enviado" },
  { id: "follow_catalogo", label: "Follow do Catálogo" },
  { id: "negociacao", label: "Negociação" },
  { id: "nutricao", label: "Nutrição" },
  { id: "ganho", label: "Ganho" },
  { id: "perdido", label: "Perdido", alerta: true },
]

/** B41-01: etapa de funil da empresa. `id` é o id da etapa; `cor`, cor pronta ou "#rrggbb". */
export interface EtapaDoFunil {
  id: string
  label: string
  cor?: string | null
  /** B41-05: dias até o card ficar parado na etapa; vazio = sem aviso. */
  paradoDias?: number | null
}

/** B41-01: funil criado pela empresa, além de Entrada e Recompra. */
export interface FunilDaEmpresa {
  id: string
  nome: string
  etapas: EtapaDoFunil[]
}

/** B41-01: card de funil da empresa; `etapa` é o id da etapa. */
export type CardDoFunil = Omit<CardLead, "etapa"> & { etapa: string }

export interface HistoricoEtapa {
  deEtapa: string
  etapa: string
  data: string
  responsavel?: string
}

export interface NotaInterna {
  id: string
  autor: string
  texto: string
  data: string
}
