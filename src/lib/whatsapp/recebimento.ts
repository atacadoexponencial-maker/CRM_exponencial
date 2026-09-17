// Mensagem recebida pelo gateway virando o que o CRM já entende: um contato,
// uma conversa aberta e uma mensagem na conversa (B6-02).
//
// O alvo é que o atendente não consiga dizer por qual canal a mensagem chegou
// olhando a caixa de entrada. Por isso este módulo produz o mesmo resultado que
// o webhook da Meta produz hoje — mesmas tabelas, mesmos campos, mesmo evento
// de tempo real — a partir de um evento de formato diferente.
//
// Só texto. Mídia e os demais tipos entram na B6-03.

import type { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes } from "@/lib/automacoes"
import { transmitirMensagem } from "./realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

/** Evento `message.received` do contrato (seção 3.1), na parte que a B6-02 usa. */
export type EventoMensagemRecebida = {
  message_id: string
  from: string
  from_is_lid?: boolean
  to?: string | null
  type: string
  text?: string | null
  reply_to?: { message_id: string; preview_text?: string | null } | null
}

/**
 * Prefixo do contato que chegou sem telefone utilizável.
 *
 * **O LID é a parte perigosa deste módulo.** O WhatsApp às vezes entrega, em vez
 * do telefone, um identificador de privacidade da Meta: são só dígitos, cabem na
 * faixa do E.164, e portanto **passam por telefone válido sem nenhum erro
 * aparecer**. Gravado como telefone, ele cria um contato fantasma, e a conversa
 * real do cliente nunca encontra o contato certo.
 *
 * Decisão (17/09/2026, tomada na execução — ver a nota na issue): o contato é
 * criado com `lid:` na frente do identificador. Consequências, todas
 * deliberadas:
 *
 *  - **A mensagem não se perde.** Perder mensagem de cliente é pior do que
 *    registrá-la sem telefone, e o gateway nunca segura a mensagem por falta de
 *    tradução.
 *  - **Não vira telefone.** Toda busca do CRM é por dígitos puros, então este
 *    valor nunca casa com um telefone de verdade, nem por engano.
 *  - **É estável.** O mesmo LID cai sempre no mesmo contato, então a conversa
 *    continua coerente em vez de virar uma conversa por mensagem.
 *  - **Fica visível.** O atendente vê `lid:` na tela e entende que aquele
 *    contato não está identificado.
 *
 * O que falta, e é issue própria: quando o gateway conseguir traduzir o LID
 * depois, o mesmo cliente terá dois contatos — um por LID e um por telefone. A
 * junção dos dois não está resolvida aqui.
 */
export const PREFIXO_LID = "lid:"

/** Telefone para casar o contato, ou o LID marcado quando não há telefone. */
export function identificadorDoContato(evento: EventoMensagemRecebida): string {
  return evento.from_is_lid ? `${PREFIXO_LID}${evento.from}` : evento.from
}

export type ResultadoDoRecebimento = {
  contactId: string
  conversationId: string
  messageId: string | null
  /** true quando a conversa foi aberta agora (é o que dispara automação). */
  conversaCriada: boolean
}

/**
 * Conteúdo e tipo já traduzidos para o vocabulário do CRM, mais a prévia que
 * aparece na lista de conversas. A B6-03 preenche isto para mídia e os demais
 * tipos; aqui é só texto.
 */
export type ConteudoTraduzido = {
  /** Valor de `messages.type`, em pt-BR. */
  tipo: string
  /** Valor de `messages.content`. */
  conteudo: string
  /** Texto curto para `conversations.last_message_text`. */
  previa: string
}

export function traduzirTexto(evento: EventoMensagemRecebida): ConteudoTraduzido {
  const texto = evento.text ?? ""
  return { tipo: "texto", conteudo: texto, previa: texto }
}

/**
 * Registra a mensagem recebida. Lança se o banco falhar em algo essencial — o
 * chamador responde não-2xx e o gateway reentrega o mesmo evento, que a
 * idempotência da B6-01 reconhece como tentativa interrompida.
 */
export async function registrarMensagemRecebida({
  supabase,
  workspaceId,
  evento,
  recebidoEm,
  conteudo,
}: {
  supabase: ServiceClient
  workspaceId: string
  evento: EventoMensagemRecebida
  /** `timestamp` do envelope: o momento do fato, não o da entrega. */
  recebidoEm: string
  /** Tradução já feita. Sem ela, trata como texto. */
  conteudo?: ConteudoTraduzido
}): Promise<ResultadoDoRecebimento> {
  const traduzido = conteudo ?? traduzirTexto(evento)
  const identificador = identificadorDoContato(evento)

  const contactId = await acharOuCriarContato(supabase, workspaceId, identificador)
  const { conversationId, conversaCriada } = await abrirOuReusarConversa({
    supabase,
    workspaceId,
    contactId,
    previa: traduzido.previa,
    recebidoEm,
  })

  // Automação dispara ao ABRIR conversa, e só. É o comportamento do webhook da
  // Meta hoje: não existe gatilho de "mensagem recebida" em `automacoes.ts`, e
  // inventar um aqui mudaria o produto por conta própria.
  if (conversaCriada) {
    await processarAutomacoes({
      tipo: "conversa_criada",
      workspaceId,
      contactId,
      conversationId,
    })
  }

  const respondendo = await acharMensagemPorWamid(supabase, evento.reply_to?.message_id)

  const { data: inserida } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      workspace_id: workspaceId,
      direction: "recebida",
      type: traduzido.tipo,
      content: traduzido.conteudo,
      wamid: evento.message_id,
      created_at: recebidoEm,
      // A mensagem citada pode ser anterior ao CRM conhecer a conversa: nesse
      // caso a prévia que o gateway mandou é tudo o que se tem, e vale guardar.
      reply_to_id: respondendo,
      reply_preview_text: evento.reply_to?.preview_text ?? null,
    })
    .select("id")
    .single()

  if (inserida) {
    await transmitirMensagem({
      id: inserida.id,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      direction: "recebida",
      type: traduzido.tipo,
      content: traduzido.conteudo,
      created_at: recebidoEm,
      status: null,
    })
  }

  return { contactId, conversationId, messageId: inserida?.id ?? null, conversaCriada }
}

async function acharOuCriarContato(
  supabase: ServiceClient,
  workspaceId: string,
  identificador: string
): Promise<string> {
  const { data: existente } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("phone_number", identificador)
    .maybeSingle()

  if (existente) return existente.id

  const { data: criado, error } = await supabase
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: identificador })
    .select("id")
    .single()

  if (error || !criado) {
    throw new Error(`Não foi possível criar o contato: ${error?.message ?? "sem detalhe"}`)
  }
  return criado.id
}

async function abrirOuReusarConversa({
  supabase,
  workspaceId,
  contactId,
  previa,
  recebidoEm,
}: {
  supabase: ServiceClient
  workspaceId: string
  contactId: string
  previa: string
  recebidoEm: string
}): Promise<{ conversationId: string; conversaCriada: boolean }> {
  const { data: aberta } = await supabase
    .from("conversations")
    .select("id, unread_count")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .in("status", ["em_espera", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (aberta) {
    const { error } = await supabase
      .from("conversations")
      .update({
        last_message_text: previa,
        last_message_at: recebidoEm,
        unread_count: aberta.unread_count + 1,
      })
      .eq("id", aberta.id)

    if (error) throw new Error(`Não foi possível atualizar a conversa: ${error.message}`)
    return { conversationId: aberta.id, conversaCriada: false }
  }

  const { data: nova, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      status: "em_espera",
      assigned_to: null,
      unread_count: 1,
      last_message_text: previa,
      last_message_at: recebidoEm,
    })
    .select("id")
    .single()

  if (error || !nova) {
    throw new Error(`Não foi possível abrir a conversa: ${error?.message ?? "sem detalhe"}`)
  }
  return { conversationId: nova.id, conversaCriada: true }
}

/** Mensagem local citada pela recebida. Null quando o CRM não a tem. */
async function acharMensagemPorWamid(
  supabase: ServiceClient,
  wamid: string | undefined
): Promise<string | null> {
  if (!wamid) return null

  const { data } = await supabase.from("messages").select("id").eq("wamid", wamid).maybeSingle()
  return data?.id ?? null
}
