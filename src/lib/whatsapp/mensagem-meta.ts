// Mensagem recebida pela API Oficial (webhook da Meta): o texto que vai para a
// conversa e o que as regras das automações leem (B22-23, achado M3 do QA das
// automações). Antes, só `text.body` era lido, e resposta de botão, resposta de
// lista e cartão de contato chegavam vazios, com tipo "desconhecido".
//
// Formato da Meta: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components

/** O que interessa de uma mensagem do webhook da Meta. Os campos dependem do `type`. */
export interface MensagemMeta {
  type?: string
  text?: { body?: string }
  /** Resposta a botão de modelo (template). */
  button?: { text?: string }
  /** Resposta a botão ou a lista de uma mensagem interativa. */
  interactive?: {
    type?: string
    button_reply?: { title?: string }
    list_reply?: { title?: string; description?: string }
  }
  contacts?: Array<{ name?: { formatted_name?: string }; phones?: Array<{ phone?: string }> }>
  location?: { latitude?: number; longitude?: number; name?: string; address?: string }
  image?: { caption?: string }
  video?: { caption?: string }
  document?: { caption?: string; filename?: string }
}

export interface MensagemMetaLida {
  /** O que a conversa mostra. */
  conteudo: string
  /** O tipo para as regras, no vocabulário do CRM. */
  tipo: string
  /** O que o cliente escreveu ou escolheu, para as verificações de texto. Vazio quando não há. */
  textoDoCliente: string
}

const TIPO_DA_META: Record<string, string> = {
  text: "texto",
  button: "texto",
  interactive: "texto",
  image: "imagem",
  video: "video",
  audio: "audio",
  voice: "audio",
  document: "documento",
  sticker: "figurinha",
  location: "localizacao",
  contacts: "contato",
}

export function lerMensagemMeta(mensagem: MensagemMeta): MensagemMetaLida {
  const tipo = TIPO_DA_META[mensagem.type ?? "text"] ?? "desconhecido"

  switch (mensagem.type) {
    case undefined:
    case "text":
      return comTexto(tipo, mensagem.text?.body)
    case "button":
      return comTexto(tipo, mensagem.button?.text)
    case "interactive":
      return comTexto(tipo, mensagem.interactive?.button_reply?.title ?? mensagem.interactive?.list_reply?.title)
    case "image":
    case "video":
    case "document":
      return comTexto(tipo, mensagem[mensagem.type]?.caption)
    case "contacts": {
      // Cartão de contato: o CRM monta o texto; as regras não leem texto nele
      const cartoes = (mensagem.contacts ?? []).map((c) => {
        const nome = c.name?.formatted_name?.trim() || "Contato sem nome"
        const telefones = (c.phones ?? []).map((p) => p.phone).filter(Boolean)
        return [`👤 ${nome}`, ...telefones].join("\n")
      })
      return { conteudo: cartoes.join("\n\n") || "👤 Contato", tipo, textoDoCliente: "" }
    }
    case "location": {
      const local = mensagem.location ?? {}
      const mapa = `https://www.google.com/maps?q=${local.latitude},${local.longitude}`
      const partes = [local.name, local.address].filter(Boolean)
      return { conteudo: partes.length > 0 ? `📍 ${partes.join(" — ")}\n${mapa}` : `📍 ${mapa}`, tipo, textoDoCliente: "" }
    }
    default:
      return comTexto(tipo, mensagem.text?.body)
  }
}

function comTexto(tipo: string, texto: string | undefined): MensagemMetaLida {
  const limpo = texto ?? ""
  return { conteudo: limpo, tipo, textoDoCliente: limpo }
}
