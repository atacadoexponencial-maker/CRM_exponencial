// Número em uso no celular desligado do lado da Meta (B23-06, coexistência).
//
// A Meta não deixa o CRM desligar, do lado dele, um número que está em uso no
// WhatsApp Business do celular. Quem desliga é o dono (Configurações > Conta >
// Plataforma Comercial), ou a própria Meta quando o aplicativo fica ~14 dias sem
// abrir ou o número muda de aparelho. O aviso vem pelo webhook `account_update`,
// que é da WABA (sem `phone_number_id`). Aqui ele vira o mesmo estado que o canal
// direto já conhece: `disconnected`, com o motivo no vocabulário do cartão, e o
// alerta "Número desconectado" na central (B4-03).

import type { createServiceClient } from "@/integrations/supabase/service"
import { refletirEstadoNaCentral } from "./alertas-de-numero"
import { TEXTO_DO_MOTIVO } from "./gateway/estado"

type ServiceClient = ReturnType<typeof createServiceClient>

/** `value` do webhook `account_update`, no que interessa à coexistência. */
export type ValorDoAccountUpdate = {
  event?: string
  waba_info?: { waba_id?: string }
  disconnection_info?: { reason?: string; initiated_by?: string }
}

/** Eventos da Meta que desligam o número em uso no celular. */
const EVENTOS_DE_DESCONEXAO = ["PARTNER_REMOVED", "ACCOUNT_OFFBOARDED"]

/** `disconnection_info.reason` da Meta no vocabulário do cartão (`TEXTO_DO_MOTIVO`). */
const MOTIVO_NO_CRM: Record<string, string> = {
  ACCOUNT_DISCONNECTED: "desconectado_pelo_celular",
  BUSINESS_DOWNGRADE: "desconectado_pelo_celular",
  PRIMARY_INACTIVITY: "sem_uso_do_aplicativo",
  COMPANION_INACTIVITY: "sem_uso_do_aplicativo",
  CHANGE_NUMBER: "mudou_de_aparelho",
  USER_RE_REGISTERED: "mudou_de_aparelho",
}

export function motivoDaDesconexao(valor: ValorDoAccountUpdate): string {
  if (valor.event === "ACCOUNT_OFFBOARDED") return "mudou_de_aparelho"
  return MOTIVO_NO_CRM[valor.disconnection_info?.reason ?? ""] ?? "desconectado_pelo_celular"
}

/**
 * Webhook `account_update`. Devolve quantas conexões mudaram de estado. Lança em
 * falha de banco, para a Meta reentregar.
 */
export async function processarAccountUpdate({
  supabase,
  wabaId,
  valor,
}: {
  supabase: ServiceClient
  /** `entry[].id` do webhook, ou `waba_info.waba_id`. */
  wabaId: string | null | undefined
  valor: ValorDoAccountUpdate
}): Promise<number> {
  const waba = valor.waba_info?.waba_id ?? wabaId
  if (!waba || !EVENTOS_DE_DESCONEXAO.includes(valor.event ?? "")) return 0

  const { data: conexoes } = await supabase
    .from("whatsapp_connections")
    .select("id, workspace_id")
    .eq("waba_id", waba)
    .eq("em_uso_no_celular", true)
    .neq("status", "removed")

  const motivo = motivoDaDesconexao(valor)
  const agora = new Date().toISOString()
  for (const conexao of conexoes ?? []) {
    const { error } = await supabase
      .from("whatsapp_connections")
      .update({ status: "disconnected", state_reason: motivo, disconnected_at: agora })
      .eq("id", conexao.id)
    if (error) throw new Error(`Não foi possível gravar a desconexão: ${error.message}`)
    await refletirEstadoNaCentral({
      supabase,
      workspaceId: conexao.workspace_id,
      connectionId: conexao.id,
      estado: "disconnected",
      motivo: TEXTO_DO_MOTIVO[motivo] ?? null,
    })
  }
  return (conexoes ?? []).length
}
