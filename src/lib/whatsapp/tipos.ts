// Contrato da camada de WhatsApp: o conjunto de operações de mensagem que o
// CRM conhece, independente de qual canal está em uso.
//
// Por que existe: o CRM nasceu falando com a API Oficial da Meta direto de
// dentro dos arquivos de negócio. Está em construção um segundo canal (gateway
// próprio, conexão por QR Code). Sem um contrato no meio, cada canal novo
// espalharia um `if (canal === ...)` pelos sete pontos de envio.
//
// Este arquivo é só tipo — não tem runtime. Quem implementa é
// `provider-meta.ts`; quem escolhe a implementação é `index.ts`.

/** Identifica de qual canal um número conectado é. */
export type CanalWhatsApp = "meta" | "gateway"

/**
 * Resultado de uma operação de envio.
 *
 * `ok: false` significa que o canal respondeu, mas recusou. Falha de rede
 * **não** vira `ok: false`: a exceção sobe para o chamador, que já tem o
 * tratamento dele. Ver decisão 5.5 em
 * `pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`.
 */
export type ResultadoEnvio =
  | { ok: true; mensagemId: string | null }
  | { ok: false; motivo: string }

/**
 * Mídia a enviar.
 *
 * `legenda` e `nomeArquivo` são opcionais no sentido literal: a chave só entra
 * na requisição quando o campo foi passado (`!== undefined`), nunca por ser
 * truthy. Isso importa porque os chamadores discordam entre si — a campanha
 * manda legenda mesmo vazia, o chat não manda o campo.
 */
export type MidiaEnvio = {
  url: string
  tipo: "imagem" | "video" | "audio" | "documento"
  legenda?: string
  nomeArquivo?: string
}

/**
 * Quem é a leitura a confirmar.
 *
 * Os dois canais pedem identificadores diferentes para a mesma operação, e não
 * há como um traduzir o do outro: a Meta confirma **uma mensagem**
 * (`message_id`), o gateway confirma **a conversa** (`to`). Por isso o contrato
 * carrega os dois — quem chama tem ambos em mãos, e nenhum provider fica
 * adivinhando.
 *
 * Mudança de 17/09/2026, na B1-02. Antes o contrato pedia só `mensagemId`, o
 * que funcionava para a Meta e daria recibo no contato errado no gateway. Não
 * havia chamador ainda; o primeiro nasce na B7.
 */
export type AlvoDeLeitura = {
  /** `wamid` da mensagem recebida. Usado pela API Oficial. */
  mensagemId: string
  /** Telefone do contato, em dígitos. Usado pelo canal direto. */
  destino: string
}

/** Recursos que um canal pode ou não oferecer. */
export type RecursoWhatsApp = "templates" | "midia" | "marcar_lida"

/**
 * A fronteira. Outras issues (B6, B7, B8) são escritas contra estas
 * assinaturas, possivelmente em outro repositório — mudar qualquer uma exige
 * avisar antes.
 */
export type ProviderWhatsApp = {
  canal: CanalWhatsApp

  enviarTexto(destino: string, texto: string): Promise<ResultadoEnvio>
  enviarMidia(destino: string, midia: MidiaEnvio): Promise<ResultadoEnvio>
  marcarComoLida(alvo: AlvoDeLeitura): Promise<ResultadoEnvio>

  /** Recursos que este canal suporta. */
  suporta(recurso: RecursoWhatsApp): boolean
}
