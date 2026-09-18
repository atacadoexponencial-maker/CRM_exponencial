// Os três eventos do gateway que não são mensagem recebida (B6-04):
// status de envio, estado da instância e freio de emergência.
//
// Batem em lugares diferentes do CRM — a mensagem e o relatório de campanha, a
// conexão, e a central de alertas — e por isso moram juntos aqui em vez de na
// rota: cada um é pequeno, e testá-los pela rota exigiria montar o webhook
// inteiro três vezes.

import type { createServiceClient } from "@/integrations/supabase/service"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Status do gateway para o do CRM.
 *
 * O gateway emite os mesmos termos em inglês que a Meta, de propósito, então
 * este é o mesmo mapa do webhook da Meta — com `sent` acrescentado, que lá não
 * existe. `enviado` é valor aceito por `campaign_recipients.status`, cuja
 * restrição admite `pendente, enviado, entregue, lido, falhou`.
 */
export const STATUS_NO_CRM: Record<string, string> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
}

export type EventoDeStatus = {
  message_id: string
  status: string
  error?: { code?: string | null; message?: string | null } | null
}

/**
 * Atualiza a mensagem e o destinatário de campanha pelo identificador.
 *
 * `wamid` é a mesma coluna que a Meta usa: o identificador que o gateway
 * devolve no envio já foi gravado lá, e por isso o relatório de campanha
 * continua funcionando sem migration.
 *
 * Identificador que o CRM não tem simplesmente não atualiza nada — pode ser
 * status de mensagem enviada antes de a conexão existir.
 */
export async function aplicarStatusDeMensagem({
  supabase,
  evento,
}: {
  supabase: ServiceClient
  evento: EventoDeStatus
}): Promise<{ status: string | null }> {
  const status = STATUS_NO_CRM[evento.status]
  // Status novo no gateway não pode virar valor inválido no banco: a restrição
  // de `campaign_recipients.status` recusaria a linha inteira.
  if (!status) return { status: null }

  await supabase
    .from("messages")
    .update({
      status,
      // O motivo só existe em falha, e é o que o atendente precisa ler para
      // saber se o número não tem WhatsApp ou se a mídia estourou o limite.
      status_error: status === "falhou" ? motivoLegivel(evento.error) : null,
    })
    .eq("wamid", evento.message_id)

  await supabase
    .from("campaign_recipients")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("wamid", evento.message_id)

  return { status }
}

function motivoLegivel(erro: EventoDeStatus["error"]): string | null {
  if (!erro) return null
  return erro.message ?? erro.code ?? null
}

export type EventoDeEstado = {
  state: string
  phone_number?: string | null
  display_name?: string | null
  /** `session_closed_on_device`, `banned_by_whatsapp`, `connection_lost`. */
  reason?: string | null
}

/**
 * Atualiza a conexão do número (B6-04).
 *
 * `whatsapp_connections.status` é texto livre, e os seis estados do gateway
 * caem nele direto. Número e nome de exibição só ficam conhecidos a partir de
 * `connected`, e é por isso que a B1-02 os tornou opcionais: uma conexão do
 * canal direto nasce sem eles.
 */
export async function aplicarEstadoDaInstancia({
  supabase,
  connectionId,
  evento,
}: {
  supabase: ServiceClient
  connectionId: string
  evento: EventoDeEstado
}): Promise<void> {
  const alteracao: Record<string, unknown> = {
    status: evento.state,
    // Transição solicitada por nós vem sem motivo, e isso limpa o motivo
    // anterior em vez de deixar um "connection_lost" velho grudado na tela.
    state_reason: evento.reason ?? null,
  }

  // Só sobrescreve quando o gateway informa: uma transição para `disconnected`
  // não pode apagar o número que já estava conhecido.
  if (evento.phone_number) alteracao.phone_number = evento.phone_number
  if (evento.display_name) alteracao.display_name = evento.display_name

  await supabase.from("whatsapp_connections").update(alteracao).eq("id", connectionId)
}

export type EventoDeFreio = {
  reason: string
  queued_count?: number | null
  released?: boolean
}

export const TIPO_ALERTA_FREIO = "numero_freado"

/**
 * Freio de emergência do número (B6-04).
 *
 * `released: true` resolve o aviso aberto em vez de criar outro — o gateway
 * entrega os dois momentos do mesmo fato, e o segundo é o fim dele.
 *
 * Um aviso aberto por conexão: a reentrega do mesmo evento, ou um freio que
 * insiste, não enche a central de linhas repetidas (índice único na migration).
 */
export async function registrarFreio({
  supabase,
  workspaceId,
  connectionId,
  evento,
}: {
  supabase: ServiceClient
  workspaceId: string
  connectionId: string
  evento: EventoDeFreio
}): Promise<{ acao: "aberto" | "resolvido" }> {
  if (evento.released) {
    await supabase
      .from("operational_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("connection_id", connectionId)
      .eq("tipo", TIPO_ALERTA_FREIO)
      .is("resolved_at", null)

    return { acao: "resolvido" }
  }

  await supabase.from("operational_alerts").upsert(
    {
      workspace_id: workspaceId,
      connection_id: connectionId,
      tipo: TIPO_ALERTA_FREIO,
      motivo: evento.reason,
      queued_count: evento.queued_count ?? null,
    },
    { onConflict: "connection_id,tipo", ignoreDuplicates: true }
  )

  // B8-03: número freado para as campanhas dele na hora. Insistir com o número
  // freado é o caminho mais rápido para o banimento — e o gateway recusaria
  // cada envio com `instance_braked`, transformando a campanha em milhares de
  // falhas. Campanha de outro número não é tocada.
  await supabase
    .from("campaigns")
    .update({
      status: "interrompida",
      interrompida_motivo: evento.reason,
      interrompida_em: new Date().toISOString(),
    })
    .eq("whatsapp_connection_id", connectionId)
    .eq("status", "enviando")

  return { acao: "aberto" }
}
