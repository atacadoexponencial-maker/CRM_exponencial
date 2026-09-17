// Implementação do contrato de WhatsApp para a API Oficial da Meta (Cloud API).
//
// Este é o único arquivo do CRM que sabe o que é `wamid`, `v21.0`,
// `messaging_product` ou `graph.facebook.com`. Nenhum arquivo de negócio deve
// voltar a conhecer esses nomes.
//
// Regra que governou a escrita: **movimentação de código, não reescrita.** As
// requisições montadas aqui são byte a byte idênticas às que os sete pontos de
// envio montavam antes — mesma URL, mesma versão, mesma ordem de chaves. A
// única mudança deliberada é o formato do motivo de erro, unificado para
// sempre incluir o corpo da resposta (decisão 5.4).

import type {
  MidiaEnvio,
  ProviderWhatsApp,
  ResultadoEnvio,
  RecursoWhatsApp,
} from "./tipos"

const VERSAO_API = "v21.0"

/**
 * Tradução do vocabulário do CRM para o da Meta. A chave do objeto de mídia no
 * corpo da requisição é a mesma string do `type` — por isso um mapa só.
 */
const TIPO_META: Record<MidiaEnvio["tipo"], "image" | "video" | "audio" | "document"> = {
  imagem: "image",
  video: "video",
  audio: "audio",
  documento: "document",
}

/** Recursos da API Oficial. O gateway vai declarar os dele quando existir. */
const RECURSOS_SUPORTADOS: Record<RecursoWhatsApp, boolean> = {
  templates: true,
  midia: true,
  marcar_lida: true,
}

/**
 * Cria um provider fechado sobre as credenciais de uma conexão.
 *
 * Recebe as credenciais prontas em vez de buscá-las: quem sabe consultar o
 * banco é o seletor (`index.ts`), e assim este arquivo permanece testável sem
 * Supabase nenhum.
 */
export function criarProviderMeta(
  phoneNumberId: string,
  accessToken: string
): ProviderWhatsApp {
  const url = `https://graph.facebook.com/${VERSAO_API}/${phoneNumberId}/messages`

  /**
   * Faz o POST e traduz a resposta.
   *
   * Não captura exceção de rede de propósito — ela sobe para o chamador, que
   * mantém o tratamento que sempre teve.
   */
  async function postar(corpo: Record<string, unknown>): Promise<ResultadoEnvio> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(corpo),
    })

    if (!res.ok) {
      const corpoErro = await res.text().catch(() => "")
      return { ok: false, motivo: `Meta API error: ${res.status} - ${corpoErro}` }
    }

    const dados = (await res.json()) as { messages?: Array<{ id: string }> }
    return { ok: true, mensagemId: dados.messages?.[0]?.id ?? null }
  }

  return {
    canal: "meta",

    async enviarTexto(destino, texto) {
      return postar({
        messaging_product: "whatsapp",
        to: destino,
        type: "text",
        text: { body: texto },
      })
    },

    async enviarMidia(destino, midia) {
      const tipo = TIPO_META[midia.tipo]

      // A ordem de inserção das chaves é a ordem que sai no JSON. Mantida
      // igual à de antes: link, caption, filename.
      const objeto: Record<string, unknown> = { link: midia.url }
      if (midia.legenda !== undefined) objeto.caption = midia.legenda
      if (midia.nomeArquivo !== undefined) objeto.filename = midia.nomeArquivo

      return postar({
        messaging_product: "whatsapp",
        to: destino,
        type: tipo,
        [tipo]: objeto,
      })
    },

    async marcarComoLida({ mensagemId }) {
      // Nasce sem chamador: nenhum ponto do CRM marca mensagem como lida na
      // Meta hoje. Existe porque o contrato pede e a issue do gateway vai usar.
      return postar({
        messaging_product: "whatsapp",
        status: "read",
        message_id: mensagemId,
      })
    },

    suporta(recurso) {
      return RECURSOS_SUPORTADOS[recurso] ?? false
    },
  }
}
