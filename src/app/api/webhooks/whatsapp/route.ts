import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { tipoDaMensagemParaRegras } from "@/lib/automacoes/contexto"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { assinaturaHmacValida } from "@/lib/webhooks/assinatura"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { buscarEGuardarFotoDoContato } from "@/lib/whatsapp/foto-de-perfil"
import { lerMensagemMeta, midiaDaMensagemMeta, type MensagemMeta } from "@/lib/whatsapp/mensagem-meta"
import { guardarMidiaDaMeta } from "@/lib/whatsapp/midia-recebida"
import { escolherConversaDoNumero, nomeDoPerfil, statusAoReabrir, traduzirConteudo } from "@/lib/whatsapp/recebimento"
import { tirarDaLixeira } from "@/lib/lixeira"
import { criarCardDeEntrada } from "@/lib/card-de-entrada"

// Valida a assinatura X-Hub-Signature-256 que a Meta envia em todo webhook.
// B21-06: sem META_APP_SECRET configurado, recusa (antes, a validação era pulada e
// qualquer um gravava mensagens falsas) — como no webhook do gateway.
//
// O HMAC em si mora em @/lib/webhooks/assinatura (B6-01), compartilhado com o
// webhook do gateway.
function assinaturaValida(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return false

  return assinaturaHmacValida({ corpoBruto: rawBody, assinatura: signature, segredo: appSecret })
}

/** Tipos da Meta que não são o cliente escrevendo: reação e aviso de sistema (troca de número). */
const TIPOS_QUE_NAO_DISPARAM = ["reaction", "system"]

/** B53-07: o que o balão mostra quando a mídia recebida não pôde ser baixada. */
const MIDIA_NAO_CARREGADA = "Mídia não pôde ser carregada"

/** Avisos de status da Meta que o CRM grava, já no termo do CRM. */
const STATUS_DA_META: Record<string, string> = {
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
}

/**
 * B53-05: os status que cada aviso NÃO pode sobrescrever. A ordem só avança
 * (enviado → entregue → lido) e "falhou" só vem depois de "enviado", nunca
 * depois de "entregue" ou "lido" (SUP-B53-01). "Lido" é o último: substitui
 * todos os outros (e um "lido" repetido não regrava nada).
 */
const STATUS_A_FRENTE: Record<string, string[]> = {
  entregue: ["lido"],
  lido: ["lido"],
  falhou: ["entregue", "lido"],
}

/** Filtro do PostgREST: status vazio, ou um que este aviso pode substituir. */
function filtroDeQuemPodeMudar(novoStatus: string): string {
  return `status.is.null,status.not.in.(${STATUS_A_FRENTE[novoStatus].join(",")})`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) return NextResponse.json({ error: "not configured" }, { status: 403 })

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!assinaturaValida(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  type WebhookValue = {
    metadata?: { phone_number_id?: string }
    statuses?: Array<{ status: string; id?: string }>
    messages?: Array<MensagemMeta & { from: string; id: string; timestamp: string }>
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
  }
  type WebhookBody = { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> }

  let body: WebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  // B53-05: um pacote da Meta pode trazer várias entradas e várias mudanças;
  // antes só a primeira era lida e os outros avisos se perdiam.
  const mudancas = (Array.isArray(body?.entry) ? body.entry : []).flatMap((e) =>
    (Array.isArray(e?.changes) ? e.changes : []).map((c) => c?.value)
  )

  const supabase = createServiceClient()

  for (const change of mudancas) {
    const phoneNumberId = change?.metadata?.phone_number_id
    if (!phoneNumberId) continue

    const statuses = change?.statuses
    if (Array.isArray(statuses) && statuses.length > 0) {
      for (const s of statuses) {
        const novoStatus = STATUS_DA_META[s.status]
        if (!novoStatus || !s.id) continue
        // B53-05: aviso atrasado nunca faz o status voltar. Só grava em quem está
        // vazio ou num status que este aviso pode substituir (SUP-B53-01).
        const filtro = filtroDeQuemPodeMudar(novoStatus)
        await supabase.from("messages").update({ status: novoStatus }).eq("wamid", s.id).or(filtro)
        // Campanhas usam os mesmos eventos para o relatório de entrega
        await supabase
          .from("campaign_recipients")
          .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
          .eq("wamid", s.id)
          .or(filtro)
      }
      continue
    }

    const messages = change?.messages
    if (!messages?.length) continue

    const { data: connection } = await supabase
      .from("whatsapp_connections")
      // B7-01: o `id` entrou junto do workspace para a conversa nascer sabendo
      // por qual número ela chegou. Nada mais mudou neste arquivo.
      // B53-07: e o token, que baixa a mídia recebida. Fica no servidor.
      .select("id, workspace_id, access_token")
      .eq("phone_number_id", phoneNumberId)
      .single()

    if (!connection) continue

    const { id: connectionId, workspace_id } = connection

    for (const message of messages) {
      // B22-45: a Meta reentrega o mesmo evento quando não recebe resposta a tempo. O
      // id dela já gravado é tentativa repetida: sem isso, a conversa somava "não lida"
      // de novo e, se tivesse sido resolvida no meio, nascia outra, com "conversa criada"
      if (message.id) {
        const { data: jaGravada } = await supabase.from("messages").select("id").eq("wamid", message.id).maybeSingle()
        if (jaGravada) continue
      }

      const phoneNumber: string = message.from
      // B22-23: botão, lista, cartão de contato e localização também têm texto
      const lida = lerMensagemMeta(message)
      // B53-07: foto, áudio, vídeo, documento e figurinha são baixados da Meta e
      // gravados como no canal direto: o arquivo no Storage, a legenda e o nome à parte.
      const midiaDaMeta = midiaDaMensagemMeta(message)
      const guardada = midiaDaMeta
        ? await guardarMidiaDaMeta({
            supabase,
            workspaceId: workspace_id,
            midia: { id: midiaDaMeta.id, url: midiaDaMeta.url, mime_type: midiaDaMeta.mimeType, filename: midiaDaMeta.filename },
            accessToken: connection.access_token,
          })
        : null
      // Tipo e prévia da conversa pela mesma tradução do canal direto
      const traduzido = midiaDaMeta
        ? traduzirConteudo(
            {
              message_id: message.id,
              from: message.from,
              type: midiaDaMeta.tipoDaMeta,
              text: midiaDaMeta.legenda,
              media: midiaDaMeta.filename ? { url: "", filename: midiaDaMeta.filename } : null,
            },
            guardada
          )
        : null
      const tipoGravado = traduzido?.tipo ?? "texto"
      // Sem o arquivo, o balão diz que a mídia não pôde ser carregada em vez de ficar vazio
      const conteudoGravado = midiaDaMeta ? guardada?.url ?? MIDIA_NAO_CARREGADA : lida.conteudo
      const messageText = traduzido?.previa ?? lida.conteudo
      const camposDeMidia = midiaDaMeta
        ? {
            media_mime_type: guardada?.mimeType ?? null,
            media_filename: midiaDaMeta.filename,
            media_caption: midiaDaMeta.legenda,
          }
        : {}
      const messageAt = new Date(Number(message.timestamp) * 1000).toISOString()
      // Nome de perfil do remetente: a Meta manda em `contacts`, ao lado das mensagens
      const nome = nomeDoPerfil(
        change?.contacts?.find((c) => c.wa_id === phoneNumber)?.profile?.name
      )

      let { data: contact } = await supabase
        .from("contacts")
        .select("id, excluido_em, name")
        .eq("workspace_id", workspace_id)
        .eq("phone_number", phoneNumber)
        .single()

      // B13-05: cliente na lixeira que escreve sai dela, com o histórico. Se falhar,
      // a mensagem é gravada mesmo assim (fica escondida até restaurarem).
      if (contact?.excluido_em) {
        await tirarDaLixeira(supabase, workspace_id, contact.id).catch(() => {})
      }

      // Contato sem nome ganha o do perfil; o nome que o time deu nunca é trocado
      if (contact && nome && !contact.name?.trim()) {
        await supabase.from("contacts").update({ name: nome }).eq("id", contact.id)
      }

      if (!contact) {
        const { data: newContact, error } = await supabase
          .from("contacts")
          .insert({ workspace_id, phone_number: phoneNumber, name: nome })
          .select("id, excluido_em, name")
          .single()
        if (error || !newContact) return NextResponse.json({ error: "db error" }, { status: 500 })
        contact = newContact
        // B45-01: todo contato nasce com card na Entrada
        await criarCardDeEntrada(supabase, workspace_id, newContact.id)
      }

      // A caixa é por NÚMERO DONO, e não só por contato: o mesmo cliente que
      // escreve para dois números do workspace tem duas conversas. Sem isto, a
      // segunda mensagem caía na caixa do primeiro número e a resposta saía pelo
      // telefone errado. A escolha é a mesma do gateway, e mora lá.
      const { data: conversasDoContato } = await supabase
        .from("conversations")
        .select("id, status, assigned_to, unread_count, whatsapp_connection_id")
        .eq("workspace_id", workspace_id)
        .eq("contact_id", contact.id)
        .in("status", ["em_espera", "em_atendimento", "resolvida"])
        .order("created_at", { ascending: false })
        .limit(50)

      // 20/10: uma conversa só por contato e número. Sem aberta, a resolvida é
      // reaberta (regra do botão Reabrir), em vez de nascer outra vazia.
      type ConversaDoContato = { id: string; status: string; assigned_to: string | null; unread_count: number; whatsapp_connection_id: string | null }
      const conversas = (conversasDoContato ?? []) as ConversaDoContato[]
      const aberta = escolherConversaDoNumero(conversas.filter((c) => c.status !== "resolvida"), connectionId ?? null)
      const resolvida = aberta ? null : escolherConversaDoNumero(conversas.filter((c) => c.status === "resolvida"), connectionId ?? null)
      const openConversation = aberta ?? resolvida

      let conversaId: string

      if (openConversation) {
        const { error } = await supabase
          .from("conversations")
          .update({
            last_message_text: messageText,
            last_message_at: messageAt,
            unread_count: openConversation.unread_count + 1,
            // Conversa sem dono registrado adota o número por onde a mensagem
            // chegou, em vez de virar caixa duplicada.
            whatsapp_connection_id: openConversation.whatsapp_connection_id ?? connectionId ?? null,
            ...(resolvida ? { status: statusAoReabrir(resolvida.assigned_to) } : {}),
          })
          .eq("id", openConversation.id)
        if (error) return NextResponse.json({ error: "db error" }, { status: 500 })
        conversaId = openConversation.id
      } else {
        const { data: novaConversa, error } = await supabase.from("conversations").insert({
          workspace_id,
          contact_id: contact.id,
          status: "em_espera",
          assigned_to: null,
          unread_count: 1,
          last_message_text: messageText,
          last_message_at: messageAt,
          // B7-01: a resposta a esta conversa sai por este mesmo número.
          whatsapp_connection_id: connectionId,
        }).select("id").single()
        if (error || !novaConversa) return NextResponse.json({ error: "db error" }, { status: 500 })
        conversaId = novaConversa.id

        await dispararAutomacoes({
          tipo: "conversa_criada",
          workspaceId: workspace_id,
          contactId: contact.id,
          conversationId: conversaId,
        })
      }

      const { data: msgInserida } = await supabase.from("messages").insert({
        conversation_id: conversaId,
        workspace_id,
        direction: "recebida",
        type: tipoGravado,
        content: conteudoGravado,
        wamid: message.id,
        created_at: messageAt,
        ...camposDeMidia,
      }).select("id").single()

      if (msgInserida) {
        // Mesma transmissão de sempre, agora em @/lib/whatsapp/realtime (B6-02),
        // compartilhada com o canal do gateway: mesmo tópico, mesmo evento, mesmo
        // corpo. É o que faz a caixa de entrada não distinguir a origem.
        await transmitirMensagem({
          id: msgInserida.id,
          conversation_id: conversaId,
          workspace_id,
          direction: "recebida",
          type: tipoGravado,
          content: conteudoGravado,
          created_at: messageAt,
          status: null,
          ...(midiaDaMeta
            ? { media_mime_type: guardada?.mimeType ?? null, media_filename: midiaDaMeta.filename, media_thumbnail_url: null }
            : {}),
        })

        // B11-04: depois de gravada, como no canal direto. A reação a uma mensagem
        // chega aqui como mensagem, e não é o cliente escrevendo: não dispara.
        if (!TIPOS_QUE_NAO_DISPARAM.includes(message.type ?? "")) {
          await dispararAutomacoes({
            tipo: "mensagem_recebida",
            workspaceId: workspace_id,
            contactId: contact.id,
            conversationId: conversaId,
            messageId: msgInserida.id,
            // As regras veem o tipo que a Meta mandou e o texto ou a legenda
            tipoMensagem: tipoDaMensagemParaRegras(lida.tipo, lida.textoDoCliente),
            texto: lida.textoDoCliente,
          })
        }

        // B29-02: a foto vem pelo canal direto da empresa, se houver um conectado.
        // Por último, e sem derrubar nada.
        await buscarEGuardarFotoDoContato({ svc: supabase, workspaceId: workspace_id, contactId: contact.id, telefone: phoneNumber, connectionId: connectionId ?? null })
      }
    }
  }

  return NextResponse.json({ status: "ok" })
}
