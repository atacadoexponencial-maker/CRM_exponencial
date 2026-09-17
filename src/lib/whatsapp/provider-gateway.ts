// Implementação do contrato de WhatsApp para o gateway próprio (canal direto,
// conexão por QR Code).
//
// Este é o único arquivo do CRM que conhece os caminhos `/v1/instances/...`,
// assim como `provider-meta.ts` é o único que conhece `graph.facebook.com`.
// Nenhum arquivo de negócio deve voltar a saber qual canal está em uso.
//
// Duas diferenças do canal da Meta que o contrato impõe, e que este arquivo
// esconde do resto do CRM:
//
//  1. **Todo envio é enfileirado.** A resposta traz `queued: true`, que
//     significa aceita, não enviada. A confirmação real chega depois, pelo
//     evento `message.status` (B6). O `message_id` devolvido é o que grava em
//     `messages.wamid`, no mesmo lugar do `wamid` da Meta.
//  2. **A mídia vai por URL.** O gateway baixa do Supabase Storage do CRM; não
//     há upload. Mesma coisa que a Meta faz com `link`.

import {
  GatewayRecusou,
  type ClienteGateway,
} from "./gateway/cliente"
import type { EnvioEnfileirado } from "./gateway/tipos"
import type {
  MidiaEnvio,
  ProviderWhatsApp,
  RecursoWhatsApp,
  ResultadoEnvio,
} from "./tipos"

/** Tradução do vocabulário do CRM para o do contrato do gateway. */
const TIPO_GATEWAY: Record<MidiaEnvio["tipo"], "image" | "video" | "audio" | "document"> = {
  imagem: "image",
  video: "video",
  audio: "audio",
  documento: "document",
}

/**
 * Recursos do canal direto. `templates` é `false` porque template de mensagem
 * só existe na API Oficial — não é limitação da nossa implementação, é ausência
 * do conceito fora dela.
 */
const RECURSOS_SUPORTADOS: Record<RecursoWhatsApp, boolean> = {
  templates: false,
  midia: true,
  marcar_lida: true,
}

/**
 * Cria um provider fechado sobre uma instância do gateway.
 *
 * Recebe o cliente e as credenciais prontos, como o provider Meta: quem sabe
 * consultar o banco é o seletor (`index.ts`).
 */
export function criarProviderGateway(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string
): ProviderWhatsApp {
  /**
   * Recusa do gateway vira `{ ok: false, motivo }`, com a mensagem legível que
   * o contrato promete. Falha de rede **não** é capturada: a exceção sobe para
   * o chamador, que mantém o tratamento que já tem (decisão 5.5 da B1-01).
   */
  async function pedir(pedido: {
    caminho: string
    corpo: Record<string, unknown>
  }): Promise<ResultadoEnvio> {
    try {
      const resposta = await cliente.comInstancia<EnvioEnfileirado | undefined>(instanceToken, {
        caminho: pedido.caminho,
        metodo: "POST",
        corpo: pedido.corpo,
      })

      // `read` e `presence` não entram na fila e respondem sem message_id.
      return { ok: true, mensagemId: resposta?.message_id ?? null }
    } catch (erro) {
      if (erro instanceof GatewayRecusou) return { ok: false, motivo: erro.message }
      throw erro
    }
  }

  return {
    canal: "gateway",

    async enviarTexto(destino, texto) {
      return pedir({
        caminho: `/instances/${instanceId}/messages`,
        corpo: {
          to: destino,
          type: "text",
          text: texto,
          // Conversa tem prioridade sobre campanha na fila do gateway (A6-06).
          // Campanha declara o contrário na issue dela (B8).
          priority: "conversation",
        },
      })
    },

    async enviarMidia(destino, midia) {
      return pedir({
        caminho: `/instances/${instanceId}/messages`,
        corpo: {
          to: destino,
          type: TIPO_GATEWAY[midia.tipo],
          // O gateway baixa daqui: a URL já é pública, do Supabase Storage.
          media_url: midia.url,
          // Legenda e nome de arquivo só entram quando existem, pela mesma
          // regra do provider Meta: presença é `!== undefined`, não truthiness.
          ...(midia.legenda !== undefined ? { text: midia.legenda } : {}),
          ...(midia.nomeArquivo !== undefined ? { filename: midia.nomeArquivo } : {}),
          priority: "conversation",
        },
      })
    },

    async marcarComoLida({ destino }) {
      // Aqui o recibo é por conversa, e não por mensagem como na Meta: o
      // contrato do gateway pede `{ to }`. É o motivo de `AlvoDeLeitura`
      // carregar os dois identificadores.
      return pedir({
        caminho: `/instances/${instanceId}/read`,
        corpo: { to: destino },
      })
    },

    suporta(recurso) {
      return RECURSOS_SUPORTADOS[recurso] ?? false
    },
  }
}
