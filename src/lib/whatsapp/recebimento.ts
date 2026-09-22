// Mensagem recebida pelo gateway virando o que o CRM já entende: um contato,
// uma conversa aberta e uma mensagem na conversa (B6-02).
//
// O alvo é que o atendente não consiga dizer por qual canal a mensagem chegou
// olhando a caixa de entrada. Por isso este módulo produz o mesmo resultado que
// o webhook da Meta produz hoje — mesmas tabelas, mesmos campos, mesmo evento
// de tempo real — a partir de um evento de formato diferente.
//
// A B6-02 trouxe o texto; a B6-03 acrescentou mídia, localização, cartão de
// contato, figurinha, reação e os avisos de mensagem editada ou apagada.
//
// `receberMensagem` é a porta: reação e aviso de sistema ALTERAM uma mensagem
// existente, e os demais tipos criam mensagem nova.

import type { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes } from "@/lib/automacoes"
import { transmitirMensagem } from "./realtime"
import { guardarMidiaRecebida, type MidiaDoEvento, type MidiaGuardada } from "./midia-recebida"

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
  /** B6-03: foto, vídeo, áudio, gravação de voz, documento e figurinha. */
  media?: MidiaDoEvento | null
  location?: { latitude: number; longitude: number; name?: string | null; address?: string | null } | null
  contact?: { display_name?: string | null; phones?: string[] | null } | null
  /** `emoji` vazio significa reação removida. */
  reaction?: { emoji: string; target_message_id: string } | null
  system?: { action: "edited" | "deleted"; target_message_id: string; new_text?: string | null } | null
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
 * Vocabulário do gateway (o da Meta) para o do CRM, que é pt-BR (B6-03).
 *
 * `voice` e `audio` caem no mesmo tipo: o WhatsApp separa gravação de voz de
 * arquivo de áudio, o CRM tem um tipo só, e inventar a distinção agora mudaria
 * a caixa de entrada sem ninguém ter pedido.
 *
 * `figurinha`, `localizacao`, `contato` e `desconhecido` são valores novos —
 * `messages.type` é texto livre, sem `check`, então não exigem migration.
 */
export const TIPO_NO_CRM: Record<string, string> = {
  text: "texto",
  image: "imagem",
  video: "video",
  audio: "audio",
  voice: "audio",
  document: "documento",
  sticker: "figurinha",
  location: "localizacao",
  contact: "contato",
  unknown: "desconhecido",
}

/** Tipos que carregam arquivo, e portanto precisam do download. */
export const TIPOS_COM_ARQUIVO = ["image", "video", "audio", "voice", "document", "sticker"]

const PREVIA_POR_TIPO: Record<string, string> = {
  imagem: "📷 Foto",
  video: "🎥 Vídeo",
  audio: "🎤 Áudio",
  documento: "📄 Documento",
  figurinha: "🏷️ Figurinha",
  localizacao: "📍 Localização",
  contato: "👤 Contato",
  desconhecido: "Mensagem não suportada por aqui",
}

/** Endereço legível da localização: o que o atendente consegue abrir e ler. */
function textoDaLocalizacao(local: NonNullable<EventoMensagemRecebida["location"]>): string {
  const mapa = `https://www.google.com/maps?q=${local.latitude},${local.longitude}`
  const partes = [local.name, local.address].filter(Boolean)
  return partes.length > 0 ? `📍 ${partes.join(" — ")}\n${mapa}` : `📍 ${mapa}`
}

function textoDoContato(contato: NonNullable<EventoMensagemRecebida["contact"]>): string {
  const nome = contato.display_name?.trim() || "Contato sem nome"
  const telefones = (contato.phones ?? []).filter(Boolean)
  return telefones.length > 0 ? `👤 ${nome}\n${telefones.join("\n")}` : `👤 ${nome}`
}

/**
 * Conteúdo, tipo e prévia para qualquer tipo do contrato (B6-03).
 *
 * `midia` é o resultado do download, já no Storage do CRM. `null` significa que
 * o download falhou: a mensagem continua sendo registrada, com a legenda e um
 * aviso no lugar do arquivo — perder a mensagem seria pior.
 */
export function traduzirConteudo(
  evento: EventoMensagemRecebida,
  midia: MidiaGuardada | null = null
): ConteudoTraduzido {
  const tipo = TIPO_NO_CRM[evento.type] ?? "desconhecido"

  if (evento.type === "text") return traduzirTexto(evento)

  if (evento.type === "location" && evento.location) {
    const texto = textoDaLocalizacao(evento.location)
    return { tipo, conteudo: texto, previa: PREVIA_POR_TIPO.localizacao }
  }

  if (evento.type === "contact" && evento.contact) {
    const texto = textoDoContato(evento.contact)
    return { tipo, conteudo: texto, previa: PREVIA_POR_TIPO.contato }
  }

  if (TIPOS_COM_ARQUIVO.includes(evento.type)) {
    const legenda = evento.text ?? null
    const previaBase =
      evento.type === "document" && (midia?.filename || evento.media?.filename)
        ? `📄 ${midia?.filename ?? evento.media?.filename}`
        : PREVIA_POR_TIPO[tipo] ?? PREVIA_POR_TIPO.desconhecido

    return {
      tipo,
      // Sem arquivo, o conteúdo não pode ficar vazio e mudo: a legenda salva o
      // que a mensagem dizia, e o aviso explica a lacuna.
      conteudo: midia?.url ?? (legenda ? legenda : "Arquivo não recebido"),
      previa: legenda && legenda.length > 0 && (tipo === "imagem" || tipo === "video") ? legenda : previaBase,
    }
  }

  // Tipo que não conhecemos, mas com texto junto: o texto é o que o cliente
  // escreveu, e é melhor prévia do que o aviso genérico. Acontece de verdade —
  // o gateway manda tipo fora do mapa para texto com citação ou link, e a
  // conversa ficava com "Mensagem não suportada por aqui" na lista enquanto a
  // mensagem aparecia inteira lá dentro.
  const texto = evento.text ?? ""
  return {
    tipo,
    conteudo: texto,
    previa: texto.length > 0 ? texto : PREVIA_POR_TIPO[tipo] ?? PREVIA_POR_TIPO.desconhecido,
  }
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
  midia = null,
  connectionId = null,
}: {
  supabase: ServiceClient
  workspaceId: string
  evento: EventoMensagemRecebida
  /** `timestamp` do envelope: o momento do fato, não o da entrega. */
  recebidoEm: string
  /** Tradução já feita. Sem ela, trata como texto. */
  conteudo?: ConteudoTraduzido
  /** B6-03: arquivo já guardado no Storage do CRM, quando havia. */
  midia?: MidiaGuardada | null
  /** B7-01: número por onde a mensagem chegou; a conversa nasce com ele. */
  connectionId?: string | null
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
    connectionId,
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
      // B6-03. O nome original fica aqui porque `content` guarda a URL do
      // Storage, e o nome do arquivo lá é gerado por nós.
      media_mime_type: midia?.mimeType ?? null,
      media_filename: midia?.filename ?? null,
      media_caption: TIPOS_COM_ARQUIVO.includes(evento.type) ? evento.text ?? null : null,
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

/** Conversa aberta, no mínimo que a escolha por número dono precisa enxergar. */
export type ConversaAbertaDoContato = {
  id: string
  unread_count: number
  whatsapp_connection_id: string | null
}

/**
 * Qual conversa aberta do contato recebe a mensagem que chegou por `connectionId`.
 *
 * A caixa é por número dono: o mesmo cliente que escreve para dois números do
 * workspace tem duas conversas, e cada resposta sai pelo telefone certo.
 *
 * A ordem das preferências:
 *
 *  1. Conversa do MESMO número. É o caso normal.
 *  2. Conversa sem dono registrado, que então adota este número. Só existe em
 *     workspace que teve a conexão removida — a migration da B7-01 preencheu o
 *     resto. Adotar evita caixa duplicada para cliente antigo.
 *  3. Nenhuma: o chamador abre conversa nova com este número.
 *
 * Sem `connectionId` (origem desconhecida) não há como separar, e vale o
 * comportamento antigo: a conversa aberta mais recente.
 *
 * `abertas` vem ordenada da mais recente para a mais antiga.
 */
export function escolherConversaDoNumero(
  abertas: ConversaAbertaDoContato[],
  connectionId: string | null
): ConversaAbertaDoContato | null {
  if (abertas.length === 0) return null
  if (!connectionId) return abertas[0]

  return (
    abertas.find((c) => c.whatsapp_connection_id === connectionId) ??
    abertas.find((c) => c.whatsapp_connection_id === null) ??
    null
  )
}

async function abrirOuReusarConversa({
  supabase,
  workspaceId,
  contactId,
  previa,
  recebidoEm,
  connectionId,
}: {
  supabase: ServiceClient
  workspaceId: string
  contactId: string
  previa: string
  recebidoEm: string
  /** B7-01: número por onde a conversa chegou, para a resposta sair por ele. */
  connectionId?: string | null
}): Promise<{ conversationId: string; conversaCriada: boolean }> {
  const { data: abertas } = await supabase
    .from("conversations")
    .select("id, unread_count, whatsapp_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    // A caixa é por NÚMERO DONO, não por contato. Sem este filtro, o mesmo
    // cliente escrevendo para dois números do workspace caía na mesma conversa,
    // e a resposta saía pelo telefone errado.
    .in("status", ["em_espera", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(50)

  const doMesmoNumero = escolherConversaDoNumero(abertas ?? [], connectionId ?? null)

  if (doMesmoNumero) {
    const { error } = await supabase
      .from("conversations")
      .update({
        last_message_text: previa,
        last_message_at: recebidoEm,
        unread_count: doMesmoNumero.unread_count + 1,
        // Conversa sem dono registrado adota o número por onde a mensagem
        // chegou, em vez de virar caixa duplicada.
        whatsapp_connection_id: doMesmoNumero.whatsapp_connection_id ?? connectionId ?? null,
      })
      .eq("id", doMesmoNumero.id)

    if (error) throw new Error(`Não foi possível atualizar a conversa: ${error.message}`)
    return { conversationId: doMesmoNumero.id, conversaCriada: false }
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
      whatsapp_connection_id: connectionId ?? null,
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

/**
 * Reação recebida (B6-03). Não cria mensagem: altera a que foi reagida.
 *
 * `emoji` vazio é remoção da reação, e volta a coluna para `null` — "sem
 * reação" e "reagiu com nada" são estados diferentes.
 *
 * Alvo que o CRM não tem não é erro: a mensagem reagida pode ser anterior à
 * conexão do número. Nesse caso não há o que atualizar, e pronto.
 */
export async function aplicarReacao({
  supabase,
  reacao,
}: {
  supabase: ServiceClient
  reacao: NonNullable<EventoMensagemRecebida["reaction"]>
}): Promise<boolean> {
  const { data } = await supabase
    .from("messages")
    .update({ reaction_emoji: reacao.emoji === "" ? null : reacao.emoji })
    .eq("wamid", reacao.target_message_id)
    .select("id")
    .maybeSingle()

  return Boolean(data)
}

/**
 * Aviso sobre mensagem anterior (B6-03): editada ou apagada.
 *
 * Apagada é **marcada**, nunca removida: quem apaga no WhatsApp não apaga o
 * histórico do CRM, e o atendente precisa saber que havia algo ali.
 */
export async function aplicarAvisoDeSistema({
  supabase,
  aviso,
  quando,
}: {
  supabase: ServiceClient
  aviso: NonNullable<EventoMensagemRecebida["system"]>
  quando: string
}): Promise<boolean> {
  const alteracao =
    aviso.action === "deleted"
      ? { deleted_at: quando }
      : { content: aviso.new_text ?? "", edited_at: quando }

  const { data } = await supabase
    .from("messages")
    .update(alteracao)
    .eq("wamid", aviso.target_message_id)
    .select("id")
    .maybeSingle()

  return Boolean(data)
}

export type ResultadoDoEvento =
  | ({ tratamento: "mensagem" } & ResultadoDoRecebimento)
  | { tratamento: "reacao" | "edicao" | "exclusao"; alvoEncontrado: boolean }

/**
 * Ponto único de entrada do evento `message.received`, de qualquer tipo.
 *
 * Três caminhos, e a ordem importa: reação e aviso de sistema **alteram** uma
 * mensagem existente e não devem criar mensagem nova nem mexer na conversa.
 */
export async function receberMensagem({
  supabase,
  workspaceId,
  evento,
  recebidoEm,
  instanceToken,
  connectionId,
}: {
  supabase: ServiceClient
  workspaceId: string
  evento: EventoMensagemRecebida
  recebidoEm: string
  /** Credencial da instância dona, para baixar a mídia. Só backend. */
  instanceToken?: string | null
  /** B7-01: conexão dona da instância; a conversa aberta agora nasce com ela. */
  connectionId?: string | null
}): Promise<ResultadoDoEvento> {
  if (evento.reaction) {
    const alvoEncontrado = await aplicarReacao({ supabase, reacao: evento.reaction })
    return { tratamento: "reacao", alvoEncontrado }
  }

  if (evento.system) {
    const alvoEncontrado = await aplicarAvisoDeSistema({
      supabase,
      aviso: evento.system,
      quando: recebidoEm,
    })
    return {
      tratamento: evento.system.action === "deleted" ? "exclusao" : "edicao",
      alvoEncontrado,
    }
  }

  // O arquivo vem para dentro do CRM antes de a mensagem ser gravada, porque é
  // a URL do Storage que vai em `content`. Falha no download devolve null, e a
  // mensagem é registrada sem o arquivo.
  const midia =
    evento.media && TIPOS_COM_ARQUIVO.includes(evento.type)
      ? await guardarMidiaRecebida({
          supabase,
          workspaceId,
          midia: evento.media,
          instanceToken,
        })
      : null

  const registrada = await registrarMensagemRecebida({
    supabase,
    workspaceId,
    evento,
    recebidoEm,
    conteudo: traduzirConteudo(evento, midia),
    midia,
    connectionId,
  })

  return { tratamento: "mensagem", ...registrada }
}
