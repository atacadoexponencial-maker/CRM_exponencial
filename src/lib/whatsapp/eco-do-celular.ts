// Mensagem que o vendedor mandou pelo WhatsApp Business do celular, num número
// em coexistência com a API Oficial (B23-04).
//
// A Meta avisa pelo webhook `smb_message_echoes`. O que acontece depois é o
// mesmo do canal direto (B25-02/03): a mensagem entra do lado da empresa, com
// "Enviada pelo celular", sem somar não lidas, e vale como resposta do time.
// Por isso este módulo só traduz o eco para o evento que o canal direto já
// produz e entrega a mídia baixada da Meta; o registro é o de lá.
//
// `revoke` e `edit` (o vendedor apagou ou editou pelo celular) ficam para a B23-05.

import type { createServiceClient } from "@/integrations/supabase/service"
import { registrarEnviadaPeloCelular, type EventoMensagemEnviadaPeloCelular } from "./enviada-pelo-celular"
import { lerMensagemMeta, midiaDaMensagemMeta, type MensagemMeta } from "./mensagem-meta"
import { guardarMidiaDaMeta } from "./midia-recebida"
import type { ConexaoDoHistorico } from "./historico-do-celular"

type ServiceClient = ReturnType<typeof createServiceClient>

/** Um eco como vem no webhook `smb_message_echoes`. */
export type EcoDoCelular = MensagemMeta & {
  from?: string
  to?: string
  id?: string
  timestamp?: string
}

export type ValorDosEcos = {
  message_echoes?: EcoDoCelular[]
}

/** Tipos do eco que viram mensagem nova; `revoke` e `edit` são da B23-05. */
const TIPOS_DE_MENSAGEM = ["text", "image", "video", "audio", "document", "sticker", "location", "contacts"]

function digitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "")
}

function quandoFoi(timestamp: string | undefined): string {
  const segundos = Number(timestamp)
  return Number.isFinite(segundos) && segundos > 0 ? new Date(segundos * 1000).toISOString() : new Date().toISOString()
}

/** Webhook `smb_message_echoes`. Lança em falha de banco, para a Meta reentregar. */
export async function processarEcos({
  supabase,
  conexao,
  valor,
}: {
  supabase: ServiceClient
  conexao: ConexaoDoHistorico
  valor: ValorDosEcos
}): Promise<void> {
  if (!conexao.em_uso_no_celular) return

  for (const eco of valor.message_echoes ?? []) {
    const para = digitos(eco.to)
    if (!eco.id || !para || !TIPOS_DE_MENSAGEM.includes(eco.type ?? "")) continue

    const midia = midiaDaMensagemMeta(eco)
    const midiaGuardada = midia
      ? await guardarMidiaDaMeta({
          supabase,
          workspaceId: conexao.workspace_id,
          midia: { id: midia.id, url: midia.url, mime_type: midia.mimeType, filename: midia.filename },
          accessToken: conexao.access_token,
        })
      : null
    const lida = lerMensagemMeta(eco)

    const evento: EventoMensagemEnviadaPeloCelular = {
      message_id: eco.id,
      from: digitos(eco.from) || undefined,
      to: para,
      to_is_lid: false,
      // O vocabulário da Meta é o mesmo que o gateway usa (`TIPO_NO_CRM`); só o
      // cartão de contato muda de nome.
      type: eco.type === "contacts" ? "contact" : eco.type ?? "text",
      // Texto da mensagem ou legenda da mídia; localização e contato já vêm montados.
      text: midia ? midia.legenda : lida.conteudo,
      // Sem download pelo gateway: a mídia chega já guardada, ou sem arquivo.
      media: null,
      timestamp: eco.timestamp,
    }
    // Localização e cartão de contato: o texto montado por lerMensagemMeta vai como conteúdo.
    if (eco.type === "location" || eco.type === "contacts") {
      evento.type = "text"
    }

    await registrarEnviadaPeloCelular({
      supabase,
      workspaceId: conexao.workspace_id,
      evento,
      enviadaEm: quandoFoi(eco.timestamp),
      connectionId: conexao.id,
      midiaGuardada,
    })
  }
}
