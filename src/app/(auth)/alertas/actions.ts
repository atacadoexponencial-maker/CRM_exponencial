"use server"

import { createServiceClient } from "@/integrations/supabase/service"
import { sessaoAtual } from "@/lib/sessao"
import {
  calcularAlertas,
  CONFIG_ALERTAS_PADRAO,
  type Alerta,
  type CardParaAlerta,
  type ConfigAlertas,
  type TipoAlerta,
} from "@/lib/alertas"
import {
  listarAlertasDeNumero,
  type AlertaDeNumero,
  type BancoDeAlertas,
} from "@/lib/whatsapp/alertas-de-numero"

export type { Alerta, ConfigAlertas, TipoAlerta } from "@/lib/alertas"

// Usuário e perfil resolvidos uma vez por requisição (B10-03).
async function perfilAtual() {
  return sessaoAtual()
}

export async function buscarConfigAlertas(): Promise<ConfigAlertas> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return CONFIG_ALERTAS_PADRAO

  const { data } = await supabase
    .from("alert_config")
    .select("lead_sem_resposta_dias, sem_recompra_dias, em_risco_dias, inativo_dias")
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()

  if (!data) return CONFIG_ALERTAS_PADRAO

  return {
    leadSemRespostaDias: data.lead_sem_resposta_dias,
    semRecompraDias: data.sem_recompra_dias,
    emRiscoDias: data.em_risco_dias,
    inativoDias: data.inativo_dias,
  }
}

export async function salvarConfigAlertas(config: ConfigAlertas): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const valores = Object.values(config)
  if (valores.some((v) => !Number.isInteger(v) || v < 1 || v > 365)) {
    return { erro: "Os limiares devem ser números inteiros entre 1 e 365" }
  }

  const { error } = await supabase.from("alert_config").upsert({
    workspace_id: perfil.workspace_id,
    lead_sem_resposta_dias: config.leadSemRespostaDias,
    sem_recompra_dias: config.semRecompraDias,
    em_risco_dias: config.emRiscoDias,
    inativo_dias: config.inativoDias,
  })

  if (error) return { erro: "Não foi possível salvar a configuração" }
  return {}
}

export async function listarAlertas(): Promise<{
  alertas: AlertaComConversa[]
  /**
   * B4-03: alertas que nascem de um número conectado, não de um card.
   *
   * Lista separada de propósito. Os alertas de card sempre têm contato, etapa e
   * dias sem atividade; os de número não têm nenhum dos três, e enfiá-los na
   * mesma lista obrigaria a tela a testar campo por campo antes de renderizar.
   * A central mostra as duas, uma acima da outra.
   */
  alertasDeNumero: AlertaDeNumero[]
  config: ConfigAlertas
} | null> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return null

  // B10-05: config, cards, dispensas e alertas de número não dependem entre
  // si; saem juntos. RLS já restringe atendente aos próprios cards.
  const [config, { data: cardsData }, { data: dismissalsData }, alertasDeNumero] = await Promise.all([
    buscarConfigAlertas(),
    supabase
      .from("pipeline_cards")
      .select("id, funil, etapa, etapa_changed_at, contact_id, atendente:profiles!atendente_id(name), contato:contacts!contact_id(name, phone_number)")
      .eq("workspace_id", perfil.workspace_id)
      .order("etapa_changed_at", { ascending: false })
      .limit(500),
    supabase
      .from("alert_dismissals")
      .select("card_id, tipo, referencia")
      .eq("workspace_id", perfil.workspace_id),
    listarAlertasDeNumero(supabase as unknown as BancoDeAlertas, perfil.workspace_id as string),
  ])

  type Row = {
    id: string
    funil: string
    etapa: string
    etapa_changed_at: string
    contact_id: string | null
    atendente: { name: string } | null
    contato: { name: string | null; phone_number: string } | null
  }
  const rows = (cardsData ?? []) as unknown as Row[]

  // Última atividade nas conversas dos contatos (para "lead sem resposta")
  const contactIds = rows.map((r) => r.contact_id).filter(Boolean) as string[]
  const ultimaAtividade: Record<string, string> = {}
  const conversaPorContato: Record<string, string> = {}
  if (contactIds.length > 0) {
    // B21-01: o atendente só lê as conversas dele, mas o card dele pode ter conversa de
    // outro ou sem responsável. A última atividade (só o horário) vem pelo servidor, para
    // o alerta não mudar; o link para a conversa só aparece se ele puder abri-la.
    const [{ data: atividades }, { data: conversas }] = await Promise.all([
      createServiceClient()
        .from("conversations")
        .select("contact_id, last_message_at")
        .eq("workspace_id", perfil.workspace_id)
        .in("contact_id", contactIds)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("id, contact_id")
        .in("contact_id", contactIds)
        .order("last_message_at", { ascending: false }),
    ])

    for (const c of atividades ?? []) {
      if (c.contact_id && c.last_message_at && !ultimaAtividade[c.contact_id]) ultimaAtividade[c.contact_id] = c.last_message_at
    }
    for (const c of conversas ?? []) {
      if (c.contact_id && !conversaPorContato[c.contact_id]) conversaPorContato[c.contact_id] = c.id
    }
  }

  const cards: CardParaAlerta[] = rows.map((r) => ({
    id: r.id,
    funil: r.funil,
    etapa: r.etapa,
    etapa_changed_at: r.etapa_changed_at,
    contact_id: r.contact_id,
    contatoNome: r.contato?.name ?? r.contato?.phone_number ?? "—",
    atendenteNome: r.atendente?.name ?? null,
    ultimaAtividade: r.contact_id ? (ultimaAtividade[r.contact_id] ?? null) : null,
  }))

  const alertas = calcularAlertas(cards, config, dismissalsData ?? [])

  return {
    alertas: alertas.map((a) => ({
      ...a,
      conversaId: a.contactId ? (conversaPorContato[a.contactId] ?? null) : null,
    })),
    alertasDeNumero,
    config,
  }
}

export type AlertaComConversa = Alerta & { conversaId: string | null }

export async function dispensarAlerta(
  cardId: string,
  tipo: TipoAlerta,
  referencia: string
): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { error } = await supabase.from("alert_dismissals").insert({
    workspace_id: perfil.workspace_id,
    card_id: cardId,
    tipo,
    referencia,
  })

  if (error && error.code !== "23505") return { erro: "Não foi possível dispensar o alerta" }
  return {}
}
