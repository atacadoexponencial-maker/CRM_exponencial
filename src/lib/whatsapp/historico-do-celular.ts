// Conversas antigas do WhatsApp Business do celular (B23-02, coexistência).
//
// Depois de conectar um número que continua em uso no aplicativo, o CRM pede à
// Meta a agenda e o histórico (`POST /{phone_number_id}/smb_app_data`, uma vez
// só, em até 24 horas). A Meta responde pelos webhooks `smb_app_state_sync`
// (agenda) e `history` (partes do histórico, fora de ordem, até 180 dias).
//
// O que importa aqui, e que difere do recebimento normal:
//  - a mensagem antiga é história, não acontecimento: nada de automação, de
//    "não lida", de tempo real ou de alerta;
//  - só vira contato quem tem conversa (PER-B23-02); a agenda fica guardada à
//    parte e empresta o nome a quem aparecer numa conversa;
//  - contato que já existe recebe as mensagens e mantém o nome (SUP-B23-06);
//  - o contato criado aqui nasce SEM card: os cards são decisão do Admin na
//    conexão (B23-03), e não a regra "todo contato nasce com card" da B45-01;
//  - a mesma parte pode chegar duas vezes: o `wamid` único absorve a repetição.
//
// Documentação lida em 30/10/2026: "Onboarding WhatsApp Business app users" e as
// referências dos webhooks `history` e `smb_app_state_sync`.

import type { createServiceClient } from "@/integrations/supabase/service"
import { lerMensagemMeta, midiaDaMensagemMeta, type MensagemMeta } from "./mensagem-meta"
import { guardarMidiaDaMeta } from "./midia-recebida"
import { escolherConversaDoNumero, nomeDoPerfil, previaDaMensagemGravada } from "./recebimento"
import { criarCardDeEntrada } from "@/lib/card-de-entrada"

type ServiceClient = ReturnType<typeof createServiceClient>

const VERSAO_DA_GRAPH = "v21.0"

/** O que o balão mostra no lugar da foto, do áudio ou do arquivo que a Meta não entregou. */
export const MARCADOR_DE_MIDIA_ANTIGA = "Mídia não disponível (mensagem antiga)"
/** Valor de `messages.type` do marcador; o balão o mostra como texto. */
export const TIPO_MIDIA_ANTIGA = "midia_antiga"

/** Código da Meta quando o dono do número recusou compartilhar o histórico. */
const CODIGO_HISTORICO_RECUSADO = 2593109

export type SituacaoDoHistorico = "importando" | "importado" | "recusado" | "falhou"

/** A conexão, no que este módulo precisa dela. */
export type ConexaoDoHistorico = {
  id: string
  workspace_id: string
  phone_number: string | null
  access_token: string | null
  em_uso_no_celular: boolean
  /** B23-03: escolha do Admin na conexão; lida no fim da importação. */
  criar_cards_do_historico?: boolean | null
}

/** O texto do cartão do número, ou nulo quando não há importação. */
export function textoDaImportacao(situacao: string | null | undefined, progresso: number | null | undefined): string | null {
  switch (situacao) {
    case "importando":
      return `Trazendo conversas antigas (${Math.max(0, Math.min(100, progresso ?? 0))}%)`
    case "importado":
      return "Conversas antigas importadas"
    case "recusado":
      return "Você não autorizou o envio das conversas antigas"
    case "falhou":
      return "Não foi possível trazer as conversas antigas"
    default:
      return null
  }
}

function digitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "")
}

/**
 * Pede à Meta a agenda e o histórico do celular. Uma vez só por conexão: a Meta
 * não aceita repetir, então a marca `historico_pedido_em` entra antes dos pedidos.
 * Falha não derruba a conexão: fica registrada como "falhou" no cartão.
 */
export async function pedirHistoricoDoCelular({
  supabase,
  connectionId,
  phoneNumberId,
  accessToken,
  buscar = fetch,
}: {
  supabase: ServiceClient
  connectionId: string
  phoneNumberId: string
  accessToken: string
  buscar?: typeof fetch
}): Promise<SituacaoDoHistorico | null> {
  const { data: conexao } = await supabase
    .from("whatsapp_connections")
    .select("historico_pedido_em")
    .eq("id", connectionId)
    .maybeSingle()
  if (!conexao || conexao.historico_pedido_em) return null

  await supabase
    .from("whatsapp_connections")
    .update({ historico_pedido_em: new Date().toISOString(), historico_situacao: "importando", historico_progresso: 0 })
    .eq("id", connectionId)

  let situacao: SituacaoDoHistorico = "importando"
  try {
    // Primeiro a agenda, depois o histórico: é a ordem que a Meta documenta.
    for (const syncType of ["smb_app_state_sync", "history"]) {
      const resposta = await buscar(`https://graph.facebook.com/${VERSAO_DA_GRAPH}/${phoneNumberId}/smb_app_data`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
      })
      if (!resposta.ok) {
        console.error("[whatsapp] erro ao pedir o histórico do celular:", syncType, await resposta.text())
        situacao = "falhou"
        break
      }
    }
  } catch (erro) {
    console.error("[whatsapp] erro ao pedir o histórico do celular:", erro)
    situacao = "falhou"
  }

  if (situacao === "falhou") {
    await supabase.from("whatsapp_connections").update({ historico_situacao: "falhou" }).eq("id", connectionId)
  }
  return situacao
}

/** Webhook `smb_app_state_sync`: a agenda do celular. */
export type ValorDaAgenda = {
  state_sync?: Array<{
    type?: string
    action?: string
    contact?: { full_name?: string; first_name?: string; phone_number?: string }
  }>
}

/**
 * Guarda os nomes da agenda. Nenhum contato nasce daqui; contato da empresa que
 * já existe e está sem nome ganha o da agenda (a mesma regra do nome de perfil).
 */
export async function processarAgenda({
  supabase,
  conexao,
  valor,
}: {
  supabase: ServiceClient
  conexao: ConexaoDoHistorico
  valor: ValorDaAgenda
}): Promise<void> {
  if (!conexao.em_uso_no_celular) return
  for (const item of valor.state_sync ?? []) {
    if (item.type !== "contact") continue
    const telefone = digitos(item.contact?.phone_number)
    if (!telefone) continue

    if (item.action === "remove") {
      await supabase
        .from("agenda_do_celular")
        .delete()
        .eq("whatsapp_connection_id", conexao.id)
        .eq("phone_number", telefone)
      continue
    }

    const nome = nomeDoPerfil(item.contact?.full_name ?? item.contact?.first_name)
    await supabase
      .from("agenda_do_celular")
      .upsert(
        { workspace_id: conexao.workspace_id, whatsapp_connection_id: conexao.id, phone_number: telefone, nome },
        { onConflict: "whatsapp_connection_id,phone_number" }
      )

    if (nome) {
      const { data: semNome } = await supabase
        .from("contacts")
        .select("id, name")
        .eq("workspace_id", conexao.workspace_id)
        .eq("phone_number", telefone)
        .maybeSingle()
      if (semNome && !semNome.name?.trim()) {
        await supabase.from("contacts").update({ name: nome }).eq("id", semNome.id)
      }
    }
  }
}

/** Uma mensagem como vem no webhook `history`. */
type MensagemDoHistorico = MensagemMeta & {
  from?: string
  id?: string
  timestamp?: string
  history_context?: { status?: string }
}

/** Webhook `history`: partes do histórico, ou a mídia entregue à parte. */
export type ValorDoHistorico = {
  metadata?: { display_phone_number?: string; phone_number_id?: string }
  history?: Array<{
    metadata?: { phase?: number; chunk_order?: number; progress?: number }
    threads?: Array<{ id?: string; messages?: MensagemDoHistorico[] }>
    errors?: Array<{ code?: number; title?: string; message?: string }>
  }>
  messages?: MensagemDoHistorico[]
}

/** `history_context.status` da Meta no termo do CRM. */
const STATUS_DO_HISTORICO: Record<string, string> = {
  READ: "lido",
  PLAYED: "lido",
  DELIVERED: "entregue",
}

type LinhaDeMensagem = {
  conversation_id: string
  workspace_id: string
  direction: "recebida" | "enviada"
  type: string
  content: string
  wamid: string
  created_at: string
  status: string | null
  sent_from_phone: boolean
  media_mime_type: string | null
  media_filename: string | null
  media_caption: string | null
}

function quandoFoi(timestamp: string | undefined): string | null {
  const segundos = Number(timestamp)
  if (!Number.isFinite(segundos) || segundos <= 0) return null
  return new Date(segundos * 1000).toISOString()
}

/**
 * A mensagem antiga no vocabulário do CRM. Mídia com `id` é baixada; sem sucesso
 * (ou `media_placeholder`, que vem sem conteúdo) fica o marcador.
 */
async function traduzirMensagemAntiga({
  supabase,
  conexao,
  mensagem,
}: {
  supabase: ServiceClient
  conexao: ConexaoDoHistorico
  mensagem: MensagemDoHistorico
}): Promise<Pick<LinhaDeMensagem, "type" | "content" | "media_mime_type" | "media_filename" | "media_caption">> {
  if (mensagem.type === "media_placeholder") {
    return { type: TIPO_MIDIA_ANTIGA, content: MARCADOR_DE_MIDIA_ANTIGA, media_mime_type: null, media_filename: null, media_caption: null }
  }

  const midia = midiaDaMensagemMeta(mensagem)
  if (midia) {
    const guardada = await guardarMidiaDaMeta({
      supabase,
      workspaceId: conexao.workspace_id,
      midia: { id: midia.id, url: midia.url, mime_type: midia.mimeType, filename: midia.filename },
      accessToken: conexao.access_token,
    })
    if (!guardada) {
      return { type: TIPO_MIDIA_ANTIGA, content: MARCADOR_DE_MIDIA_ANTIGA, media_mime_type: null, media_filename: null, media_caption: midia.legenda }
    }
    const lida = lerMensagemMeta(mensagem)
    return {
      type: lida.tipo,
      content: guardada.url,
      media_mime_type: guardada.mimeType,
      media_filename: midia.filename,
      media_caption: midia.legenda,
    }
  }

  const lida = lerMensagemMeta(mensagem)
  return { type: lida.tipo, content: lida.conteudo, media_mime_type: null, media_filename: null, media_caption: null }
}

function previaDaLinha(linha: Pick<LinhaDeMensagem, "type" | "content">): string {
  return linha.type === TIPO_MIDIA_ANTIGA ? MARCADOR_DE_MIDIA_ANTIGA : previaDaMensagemGravada(linha.type, linha.content)
}

/** O contato do telefone, criado sem card quando não existe; o nome vem da agenda. */
async function contatoDoHistorico(supabase: ServiceClient, conexao: ConexaoDoHistorico, telefone: string): Promise<string | null> {
  const { data: existente } = await supabase
    .from("contacts")
    .select("id, name, importado_do_celular_em")
    .eq("workspace_id", conexao.workspace_id)
    .eq("phone_number", telefone)
    .maybeSingle()

  const { data: daAgenda } = await supabase
    .from("agenda_do_celular")
    .select("nome")
    .eq("whatsapp_connection_id", conexao.id)
    .eq("phone_number", telefone)
    .maybeSingle()
  const nome = nomeDoPerfil(daAgenda?.nome)

  // B23-03: marca de quem apareceu numa conversa antiga; é quem ganha card no fim.
  const agora = new Date().toISOString()

  if (existente) {
    // SUP-B23-06: o nome do CRM vale mais; só o vazio ganha o da agenda.
    await supabase
      .from("contacts")
      .update({
        ...(nome && !existente.name?.trim() ? { name: nome } : {}),
        ...(existente.importado_do_celular_em ? {} : { importado_do_celular_em: agora }),
      })
      .eq("id", existente.id)
    return existente.id
  }

  const { data: criado, error } = await supabase
    .from("contacts")
    .insert({ workspace_id: conexao.workspace_id, phone_number: telefone, name: nome, importado_do_celular_em: agora })
    .select("id")
    .single()
  if (error || !criado) {
    console.error("[whatsapp] histórico: não foi possível criar o contato", error?.message)
    return null
  }
  return criado.id
}

/**
 * A conversa do contato neste número (qualquer status, a mais recente); sem
 * nenhuma, nasce em espera, sem atendente e sem não lidas (SUP-B23-04, SUP-B23-14).
 */
async function conversaDoHistorico(
  supabase: ServiceClient,
  conexao: ConexaoDoHistorico,
  contactId: string,
  maisNova: { previa: string; quando: string }
): Promise<{ id: string; last_message_at: string | null } | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id, last_message_at, whatsapp_connection_id, unread_count")
    .eq("workspace_id", conexao.workspace_id)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(50)

  const existente = escolherConversaDoNumero(
    (data ?? []) as Array<{ id: string; last_message_at: string | null; whatsapp_connection_id: string | null; unread_count: number }>,
    conexao.id
  )
  if (existente) return { id: existente.id, last_message_at: existente.last_message_at }

  const { data: nova, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: conexao.workspace_id,
      contact_id: contactId,
      status: "em_espera",
      assigned_to: null,
      unread_count: 0,
      last_message_text: maisNova.previa,
      last_message_at: maisNova.quando,
      whatsapp_connection_id: conexao.id,
    })
    .select("id, last_message_at")
    .single()
  if (error || !nova) {
    console.error("[whatsapp] histórico: não foi possível abrir a conversa", error?.message)
    return null
  }
  return { id: nova.id, last_message_at: nova.last_message_at }
}

/** Uma thread do histórico: o contato, a conversa e as mensagens dela. */
async function importarThread({
  supabase,
  conexao,
  telefoneDaEmpresa,
  telefone,
  mensagens,
}: {
  supabase: ServiceClient
  conexao: ConexaoDoHistorico
  telefoneDaEmpresa: string
  telefone: string
  mensagens: MensagemDoHistorico[]
}): Promise<void> {
  const contactId = await contatoDoHistorico(supabase, conexao, telefone)
  if (!contactId) return

  const traduzidas: Array<Omit<LinhaDeMensagem, "conversation_id">> = []
  for (const mensagem of mensagens) {
    const quando = quandoFoi(mensagem.timestamp)
    if (!mensagem.id || !quando) continue
    const daEmpresa = digitos(mensagem.from) === telefoneDaEmpresa
    const conteudo = await traduzirMensagemAntiga({ supabase, conexao, mensagem })
    traduzidas.push({
      workspace_id: conexao.workspace_id,
      direction: daEmpresa ? "enviada" : "recebida",
      wamid: mensagem.id,
      created_at: quando,
      // SUP-B23-13: a enviada pelo celular leva a marca e o status que a Meta informa.
      status: daEmpresa ? STATUS_DO_HISTORICO[mensagem.history_context?.status ?? ""] ?? "enviado" : null,
      sent_from_phone: daEmpresa,
      ...conteudo,
    })
  }
  if (traduzidas.length === 0) return

  const maisNova = traduzidas.reduce((a, b) => (a.created_at >= b.created_at ? a : b))
  const conversa = await conversaDoHistorico(supabase, conexao, contactId, {
    previa: previaDaLinha(maisNova),
    quando: maisNova.created_at,
  })
  if (!conversa) return

  // CA-B23-08: a mesma parte entregue duas vezes não duplica (wamid único).
  const { error } = await supabase
    .from("messages")
    .upsert(
      traduzidas.map((linha) => ({ ...linha, conversation_id: conversa.id })),
      { onConflict: "wamid", ignoreDuplicates: true }
    )
  if (error) throw new Error(`Não foi possível gravar o histórico: ${error.message}`)

  // SUP-B23-14: a prévia só avança.
  if (!conversa.last_message_at || maisNova.created_at > conversa.last_message_at) {
    await supabase
      .from("conversations")
      .update({ last_message_text: previaDaLinha(maisNova), last_message_at: maisNova.created_at })
      .eq("id", conversa.id)
  }
}

/** SUP-B23-15: mídia entregue à parte substitui o marcador da mesma mensagem. */
async function aplicarMidiaEntregueDepois(supabase: ServiceClient, conexao: ConexaoDoHistorico, mensagem: MensagemDoHistorico): Promise<void> {
  if (!mensagem.id) return
  const midia = midiaDaMensagemMeta(mensagem)
  if (!midia) return
  const { data: marcador } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", conexao.workspace_id)
    .eq("wamid", mensagem.id)
    .eq("type", TIPO_MIDIA_ANTIGA)
    .maybeSingle()
  if (!marcador) return

  const guardada = await guardarMidiaDaMeta({
    supabase,
    workspaceId: conexao.workspace_id,
    midia: { id: midia.id, url: midia.url, mime_type: midia.mimeType, filename: midia.filename },
    accessToken: conexao.access_token,
  })
  if (!guardada) return

  await supabase
    .from("messages")
    .update({
      type: lerMensagemMeta(mensagem).tipo,
      content: guardada.url,
      media_mime_type: guardada.mimeType,
      media_filename: midia.filename,
      media_caption: midia.legenda,
    })
    .eq("id", marcador.id)
}

/**
 * B23-03: no fim da importação, com a opção marcada na conexão, cada contato
 * importado que ainda não tem card no Funil de Entrada ganha um, na primeira
 * etapa, pela mesma regra do contato novo. Quem já tem card continua com ele
 * (`criarCardDeEntrada` trata o índice único como "já existe").
 */
async function criarCardsDosImportados(supabase: ServiceClient, conexao: ConexaoDoHistorico): Promise<void> {
  if (!conexao.criar_cards_do_historico) return
  const { data: contatos } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", conexao.workspace_id)
    .not("importado_do_celular_em", "is", null)
    .is("excluido_em", null)
  for (const contato of contatos ?? []) {
    await criarCardDeEntrada(supabase, conexao.workspace_id, contato.id)
  }
}

/**
 * Webhook `history`. Lança em falha de banco, para a Meta reentregar; o
 * `wamid` único absorve o que já tinha entrado.
 */
export async function processarHistorico({
  supabase,
  conexao,
  valor,
}: {
  supabase: ServiceClient
  conexao: ConexaoDoHistorico
  valor: ValorDoHistorico
}): Promise<void> {
  if (!conexao.em_uso_no_celular) return
  const telefoneDaEmpresa = digitos(valor.metadata?.display_phone_number) || digitos(conexao.phone_number)

  let maiorProgresso: number | null = null
  let situacao: SituacaoDoHistorico | null = null

  for (const parte of valor.history ?? []) {
    if (parte.errors?.length) {
      const recusou = parte.errors.some((e) => e.code === CODIGO_HISTORICO_RECUSADO)
      situacao = recusou ? "recusado" : "falhou"
      continue
    }
    for (const thread of parte.threads ?? []) {
      const telefone = thread.id ?? ""
      // CA-B23-12: grupo (ou qualquer id que não seja telefone) fica de fora.
      if (!/^\d{8,15}$/.test(telefone)) continue
      await importarThread({ supabase, conexao, telefoneDaEmpresa, telefone, mensagens: thread.messages ?? [] })
    }
    const progresso = parte.metadata?.progress
    if (typeof progresso === "number") maiorProgresso = Math.max(maiorProgresso ?? 0, progresso)
  }

  for (const mensagem of valor.messages ?? []) {
    await aplicarMidiaEntregueDepois(supabase, conexao, mensagem)
  }

  if (situacao) {
    await supabase.from("whatsapp_connections").update({ historico_situacao: situacao }).eq("id", conexao.id)
    return
  }
  if (maiorProgresso !== null) {
    const { data: atual } = await supabase
      .from("whatsapp_connections")
      .select("historico_progresso, historico_situacao")
      .eq("id", conexao.id)
      .maybeSingle()
    const progresso = Math.max(atual?.historico_progresso ?? 0, maiorProgresso)
    const terminou = progresso >= 100
    await supabase
      .from("whatsapp_connections")
      .update({
        historico_progresso: progresso,
        historico_situacao: terminou ? "importado" : atual?.historico_situacao === "importado" ? "importado" : "importando",
      })
      .eq("id", conexao.id)
    // B23-03: os cards são a última coisa, quando a Meta diz que acabou.
    if (terminou) await criarCardsDosImportados(supabase, conexao)
  }
}
