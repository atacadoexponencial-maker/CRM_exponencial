// Vocabulário da tela de saúde, em português e no domínio do CRM (B4-01).
//
// De propósito **não** espelha os nomes do contrato do gateway: no protótipo os
// dados são fixos, e batizar campo de tela com nome de contrato faria parecer
// que a tela já está ligada. A tradução do contrato para estes nomes é da
// B4-02, num lugar só.

export type NivelDeRisco = "baixo" | "medio" | "alto"

export type MotivoDoFreio = "failure_rate" | "manual" | "banned"

export type SaudeDoNumero = {
  numero: string | null
  nomeExibicao: string | null
  /** Estado da conexão, no vocabulário que a tela de números já usa. */
  estado: "pairing" | "connecting" | "connected" | "disconnected" | "banned" | "removed"
  /** Quanto tempo a conexão ficou de pé nas últimas 24 horas. */
  tempoConectado24hMs: number

  enviadasNaHora: number
  enviadasNoDia: number
  recebidasNaHora: number
  recebidasNoDia: number

  /** Tetos vigentes: já com aquecimento e limites do sistema aplicados. */
  tetoHora: number
  tetoDia: number

  aquecimento: {
    ativo: boolean
    /** Dia de vida do número, em períodos de 24h desde a primeira conexão. */
    dia: number
    /** Último dia em que o aquecimento ainda aperta os tetos. */
    ultimoDia: number
    tetoHora: number
    tetoDia: number
  }

  risco: {
    nivel: NivelDeRisco
    /** O que está elevando o risco. Vazio quando nada está. */
    razoes: string[]
  }

  freio: {
    freado: boolean
    motivo: MotivoDoFreio | null
    desde: string | null
    /** Mensagens que ficaram paradas na fila do gateway. */
    mensagensParadas: number
  }

  /** Proporção de falhas na janela que o gateway usa para acionar o freio. */
  falhas: { falharam: number; enviadas: number; proporcao: number | null }
}
