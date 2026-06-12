// Cálculo puro dos alertas automáticos (Central de Alertas) — testável.

export type TipoAlerta = "lead_sem_resposta" | "sem_recompra" | "em_risco" | "inativo"

export type ConfigAlertas = {
  leadSemRespostaDias: number
  semRecompraDias: number
  emRiscoDias: number
  inativoDias: number
}

export const CONFIG_ALERTAS_PADRAO: ConfigAlertas = {
  leadSemRespostaDias: 3,
  semRecompraDias: 30,
  emRiscoDias: 7,
  inativoDias: 15,
}

export type CardParaAlerta = {
  id: string
  funil: string
  etapa: string
  etapa_changed_at: string
  contact_id: string | null
  contatoNome: string
  atendenteNome: string | null
  contatoId?: string
  // Última atividade na conversa do contato (mensagem enviada ou recebida)
  ultimaAtividade: string | null
}

export type Dismissal = { card_id: string; tipo: string; referencia: string }

export type Alerta = {
  cardId: string
  contactId: string | null
  tipo: TipoAlerta
  tipoLabel: string
  contatoNome: string
  etapaLabel: string
  diasSemAtividade: number
  atendenteNome: string | null
  referencia: string // timestamp usado para "não regerar até atingir o limiar de novo"
}

export const TIPO_ALERTA_LABEL: Record<TipoAlerta, string> = {
  lead_sem_resposta: "Lead sem resposta",
  sem_recompra: "Cliente sem recompra",
  em_risco: "Cliente em risco",
  inativo: "Cliente inativo",
}

const ETAPA_LABEL: Record<string, string> = {
  lead: "Lead",
  em_qualificacao: "Em Qualificação",
  catalogo_enviado: "Catálogo Enviado",
  em_negociacao: "Em Negociação",
  primeira_compra: "Primeira Compra",
  em_onboarding: "Em Onboarding",
  cliente_ativo: "Cliente Ativo",
  aguardando_recompra: "Aguardando Recompra",
  recompra_realizada: "Recompra Realizada",
  em_risco: "Em Risco",
  inativo: "Inativo",
  perdido: "Perdido",
}

function diasDesde(iso: string, agora: Date): number {
  return Math.floor((agora.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

export function calcularAlertas(
  cards: CardParaAlerta[],
  config: ConfigAlertas,
  dismissals: Dismissal[],
  agora = new Date()
): Alerta[] {
  const dispensados = new Set(dismissals.map((d) => `${d.card_id}|${d.tipo}|${new Date(d.referencia).getTime()}`))
  const alertas: Alerta[] = []

  function adicionar(card: CardParaAlerta, tipo: TipoAlerta, referenciaIso: string, dias: number) {
    const chave = `${card.id}|${tipo}|${new Date(referenciaIso).getTime()}`
    if (dispensados.has(chave)) return
    alertas.push({
      cardId: card.id,
      contactId: card.contact_id,
      tipo,
      tipoLabel: TIPO_ALERTA_LABEL[tipo],
      contatoNome: card.contatoNome,
      etapaLabel: ETAPA_LABEL[card.etapa] ?? card.etapa,
      diasSemAtividade: dias,
      atendenteNome: card.atendenteNome,
      referencia: referenciaIso,
    })
  }

  for (const card of cards) {
    if (card.funil === "expansao") {
      // Lead sem resposta: lead ativo sem atividade na conversa há N dias
      if (card.etapa === "primeira_compra") continue
      const referencia = card.ultimaAtividade ?? card.etapa_changed_at
      const dias = diasDesde(referencia, agora)
      if (dias >= config.leadSemRespostaDias) {
        adicionar(card, "lead_sem_resposta", referencia, dias)
      }
      continue
    }

    // Funil de retenção: alertas por tempo parado na etapa
    const dias = diasDesde(card.etapa_changed_at, agora)
    if (card.etapa === "aguardando_recompra" && dias > config.semRecompraDias) {
      adicionar(card, "sem_recompra", card.etapa_changed_at, dias)
    } else if (card.etapa === "em_risco" && dias > config.emRiscoDias) {
      adicionar(card, "em_risco", card.etapa_changed_at, dias)
    } else if (card.etapa === "inativo" && dias > config.inativoDias) {
      adicionar(card, "inativo", card.etapa_changed_at, dias)
    }
  }

  return alertas.sort((a, b) => b.diasSemAtividade - a.diasSemAtividade)
}
