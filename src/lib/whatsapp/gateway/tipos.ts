// Tipos da fronteira com o gateway WhatsApp próprio.
//
// Espelham `pre-desenvolvimento/contrato-gateway-v1.md`, que é uma cópia — a
// fonte de verdade vive no repositório do gateway. Mudança no contrato começa
// lá; aqui só reflete.
//
// Este arquivo é só tipo, sem runtime, menos o catálogo de erros: aquele existe
// porque o CRM decide o que fazer a partir do `code`.

/** Códigos de recusa do gateway, seção 5 do contrato. `code` é estável. */
export const CODIGOS_DE_ERRO = [
  "invalid_credentials",
  "instance_forbidden",
  "instance_not_found",
  "instance_not_connected",
  "instance_banned",
  "instance_braked",
  "recipient_not_on_whatsapp",
  "media_too_large",
  "media_type_unsupported",
  "workspace_instance_limit_reached",
  "invalid_payload",
  "rate_profile_out_of_range",
  "brake_not_releasable",
  "instance_not_braked",
] as const

export type CodigoDeErroGateway = (typeof CODIGOS_DE_ERRO)[number]

/** Os seis estados de instância do contrato (seção 3.3). */
export type EstadoInstanciaGateway =
  | "pairing"
  | "connecting"
  | "connected"
  | "disconnected"
  | "banned"
  | "removed"

/** Resposta de `POST /instances`. O token é devolvido uma única vez. */
export type InstanciaCriada = {
  instance_id: string
  instance_token: string
  state: EstadoInstanciaGateway
}

/** Resposta de `GET /instances/{id}`. */
export type InstanciaNoGateway = {
  instance_id: string
  state: EstadoInstanciaGateway
  phone_number: string | null
  display_name: string | null
  created_at: string
  last_connected_at: string | null
}

/** `POST /instances/{id}/pair/qr` — conteúdo bruto do código; quem desenha é o CRM. */
export type PareamentoPorQr = { qr: string; expires_at: string }

/** `POST /instances/{id}/pair/code`. */
export type PareamentoPorCodigo = { pairing_code: string; expires_at: string }

/** Resposta de envio. `queued: true` significa aceita, não enviada. */
export type EnvioEnfileirado = {
  message_id: string
  queued: boolean
  queue_position: number
  estimated_send_at: string
}

/** `GET /instances/{id}/health`, seção 4.5. Ingredientes do risco, sem classificação. */
export type SaudeDoNumero = {
  instance_id: string
  state: EstadoInstanciaGateway
  connected_24h_ms: number
  sent: { last_hour: number; last_24h: number }
  received: { last_hour: number; last_24h: number }
  failures: { failed: number; sent: number; ratio: number | null }
  caps: { hourly: number; hourly_used: number; daily: number; daily_used: number }
  warmup: { active: boolean; day_of_life: number; hourly_cap: number; daily_cap: number }
  brake: { braked: boolean; reason: "banned" | "failure_rate" | "manual" | null; braked_at: string | null }
  queue: { queued_count: number }
}

/** Campos de ritmo que o administrador configura. */
export type RitmoConfigurado = {
  send_interval_seconds: number
  hourly_cap: number
  daily_cap: number
  send_window_start: string
  send_window_end: string
}

/** `GET` e `PATCH /instances/{id}/rate-profile`, seção 4.5. */
export type RitmoDoNumero = {
  configured: RitmoConfigurado
  /** O que a fila usa agora: aquecimento e limites do sistema já aplicados. */
  effective: RitmoConfigurado & { warmup_applied: boolean }
  /** Os limites vêm do gateway para o formulário não duplicá-los. */
  system_limits: {
    send_interval_seconds_min: number
    hourly_cap_max: number
    daily_cap_max: number
    send_window_earliest: string
    send_window_latest: string
  }
}

/** `POST /instances/{id}/brake/release`. */
export type FreioLiberado = {
  braked: boolean
  released_reason: "failure_rate" | "manual"
}
