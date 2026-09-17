// Porta de entrada dos eventos do gateway WhatsApp próprio (B6-01).
//
// Rota separada da da Meta de propósito: dois canais, duas portas. O webhook da
// Meta está em produção e não pode ser posto em risco por um canal novo.
//
// Regras que vêm do contrato (pre-desenvolvimento/contrato-gateway-v1.md) e não
// são negociáveis:
//
//  - A assinatura é validada sobre o CORPO BRUTO, antes de qualquer parse, em
//    tempo constante.
//  - `401` é a única resposta que faz o gateway PARAR de reenviar. Por isso ela
//    é reservada à assinatura inválida: responder 401 por engano perde o evento
//    de vez.
//  - Qualquer outra resposta não-2xx faz o gateway reenfileirar. Então tudo o
//    que não vale insistir — instância desconhecida, evento repetido, tipo que
//    não conhecemos — responde 2xx.
//  - O mesmo `event_id` chega mais de uma vez; o registro em `gateway_events` é
//    o que impede processar duas vezes.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { assinaturaHmacValida } from "@/lib/webhooks/assinatura"
import {
  registrarMensagemRecebida,
  type EventoMensagemRecebida,
} from "@/lib/whatsapp/recebimento"

const HEADER_ASSINATURA = "x-gateway-signature-256"

/** Os quatro tipos da seção 3 do contrato. */
const TIPOS_CONHECIDOS = [
  "message.received",
  "message.status",
  "instance.state",
  "instance.braked",
] as const

type TipoDeEvento = (typeof TIPOS_CONHECIDOS)[number]

type Envelope = {
  event_id: string
  type: string
  instance_id: string
  timestamp?: string
  data?: unknown
}

/** Envelope da seção 2: sem estes três campos não há o que processar. */
function envelopeValido(corpo: unknown): corpo is Envelope {
  if (typeof corpo !== "object" || corpo === null) return false
  const e = corpo as Record<string, unknown>
  return (
    typeof e.event_id === "string" &&
    e.event_id.length > 0 &&
    typeof e.type === "string" &&
    e.type.length > 0 &&
    typeof e.instance_id === "string" &&
    e.instance_id.length > 0
  )
}

/** `data` de `message.received`: sem remetente e identificador não há mensagem. */
function mensagemValida(data: unknown): data is EventoMensagemRecebida {
  if (typeof data !== "object" || data === null) return false
  const d = data as Record<string, unknown>
  return (
    typeof d.message_id === "string" &&
    d.message_id.length > 0 &&
    typeof d.from === "string" &&
    d.from.length > 0 &&
    typeof d.type === "string"
  )
}

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text()

  // Segredo ausente é recusa, e não "aceita tudo" como no webhook da Meta: aqui
  // o canal é novo, não há ambiente legado para acomodar, e aceitar sem conferir
  // deixaria qualquer um inserir mensagem de cliente no CRM.
  const segredo = process.env.GATEWAY_WEBHOOK_SECRET
  if (!segredo) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  if (
    !assinaturaHmacValida({
      corpoBruto,
      assinatura: request.headers.get(HEADER_ASSINATURA),
      segredo,
    })
  ) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  let corpo: unknown
  try {
    corpo = JSON.parse(corpoBruto)
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  if (!envelopeValido(corpo)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  const envelope = corpo
  const supabase = createServiceClient()

  // O instance_id ocupa o lugar do phone_number_id da Meta: é por ele que o
  // workspace aparece. Instância que não conhecemos responde 2xx e não escreve
  // nada — mesmo espírito do webhook da Meta quando não acha a conexão.
  const { data: conexao } = await supabase
    .from("whatsapp_connections")
    .select("id, workspace_id")
    .eq("instance_id", envelope.instance_id)
    .maybeSingle()

  if (!conexao) {
    return NextResponse.json({ status: "ignorado", motivo: "instancia_desconhecida" })
  }

  // Idempotência. `on conflict do nothing` + select do que já existe separa os
  // dois casos que parecem um: reentrega de evento já concluído (ignora) e
  // reentrega de tentativa que morreu no meio (processa de novo).
  const { data: registrado } = await supabase
    .from("gateway_events")
    .upsert(
      {
        event_id: envelope.event_id,
        type: envelope.type,
        instance_id: envelope.instance_id,
        workspace_id: conexao.workspace_id,
        event_at: envelope.timestamp ?? null,
      },
      { onConflict: "event_id", ignoreDuplicates: true }
    )
    .select("event_id")
    .maybeSingle()

  if (!registrado) {
    const { data: anterior } = await supabase
      .from("gateway_events")
      .select("processed_at")
      .eq("event_id", envelope.event_id)
      .maybeSingle()

    // Já concluído: 2xx para o gateway parar de reenviar. Erro aqui faria ele
    // reenviar para sempre.
    if (anterior?.processed_at) {
      return NextResponse.json({ status: "ignorado", motivo: "evento_repetido" })
    }
    // processed_at nulo: tentativa anterior não terminou. Segue e processa.
  }

  if (!TIPOS_CONHECIDOS.includes(envelope.type as TipoDeEvento)) {
    // Tipo novo no gateway não pode derrubar o CRM: fica registrado e o evento
    // é dado por recebido. O contrato prevê acréscimo de tipo sem aviso.
    await marcarProcessado(supabase, envelope.event_id)
    return NextResponse.json({ status: "ignorado", motivo: "tipo_desconhecido" })
  }

  if (envelope.type === "message.received") {
    if (!mensagemValida(envelope.data)) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 })
    }

    await registrarMensagemRecebida({
      supabase,
      workspaceId: conexao.workspace_id,
      evento: envelope.data,
      // Momento do fato. Sem ele, o da chegada — melhor do que mensagem sem data.
      recebidoEm: envelope.timestamp ?? new Date().toISOString(),
    })
  }

  // Os outros três tipos entram na B6-04.
  await marcarProcessado(supabase, envelope.event_id)
  return NextResponse.json({ status: "ok" })
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function marcarProcessado(supabase: ServiceClient, eventId: string): Promise<void> {
  await supabase
    .from("gateway_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", eventId)
}
