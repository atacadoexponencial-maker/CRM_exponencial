// Por que a mensagem não chegou, em português (B8-04).
//
// Existe para o operador nunca ler um `error.code` do contrato. "falhou" mil
// vezes não ajuda ninguém: número sem WhatsApp, número de envio banido e
// arquivo grande demais pedem três reações diferentes, e é o motivo que diz
// qual.
//
// Regra de tradução: o texto fala do que aconteceu e de quem é o problema. Erro
// nosso é dito como erro nosso — culpar o número do cliente por um defeito do
// CRM faria o operador limpar uma base que está certa.

/** Códigos do contrato do gateway (seção 5) que chegam a um destinatário. */
const MOTIVO_POR_CODIGO: Record<string, string> = {
  recipient_not_on_whatsapp: "O número não tem WhatsApp.",
  instance_not_connected: "O número de envio estava fora do ar.",
  instance_banned: "O número de envio foi banido pelo WhatsApp.",
  instance_braked: "Os envios do número estavam interrompidos.",
  media_too_large: "O arquivo passou do tamanho que o WhatsApp aceita.",
  media_type_unsupported: "O WhatsApp não aceita esse tipo de arquivo.",
  invalid_payload: "Falha técnica do CRM ao montar a mensagem.",
  invalid_credentials: "Falha técnica: o CRM não conseguiu se autenticar no número de envio.",
  instance_forbidden: "Falha técnica: o CRM não tem acesso a esse número de envio.",
  instance_not_found: "O número de envio não existe mais.",
}

/** Motivos que o CRM produz sozinho, sem o canal ter respondido. */
export const MOTIVO_SEM_RESPOSTA = "O canal não respondeu. A mensagem não chegou a ser aceita."
export const MOTIVO_CAMPANHA_INTERROMPIDA = "Não enviada: o disparo foi interrompido."
export const MOTIVO_SEM_NUMERO = "Nenhum número de envio disponível no momento do disparo."
/** B54-06 (CA-B54-27): a campanha tinha um número escolhido, e ele não está mais conectado. */
export const MOTIVO_NUMERO_DESCONECTADO = "O número da campanha não está mais conectado"
/** B54-06: campanha por template num número do canal direto. */
export const MOTIVO_TEMPLATE_SEM_API_OFICIAL = "Template só existe na API Oficial; este número é do canal direto."

/**
 * B54-06: os códigos de erro da Meta para template (`error.code` da Graph API), em
 * português. O provider da Meta devolve o corpo do erro na `message`; aqui ele é lido.
 */
const MOTIVO_DA_META_POR_CODIGO: Record<string, string> = {
  "132000": "A Meta recusou: o número de variáveis não bate com o template",
  "132001": "A Meta recusou: o template não existe ou não está aprovado neste número",
  "132005": "A Meta recusou: o texto do template foi traduzido de forma inválida",
  "132007": "A Meta recusou: o conteúdo do template viola a política dela",
  "132012": "A Meta recusou: um valor de variável está fora do padrão (quebras de linha, tabulação ou mais de 4 espaços seguidos)",
  "132015": "A Meta recusou: o template está pausado",
  "132016": "A Meta recusou: o template foi desativado",
  "132068": "A Meta recusou: o fluxo do template está bloqueado",
  "132069": "A Meta recusou: o fluxo do template está limitado",
  "131026": "A Meta recusou: o destinatário não pode receber esta mensagem (número fora do WhatsApp ou que não aceita mensagens de empresa)",
  "131047": "A Meta recusou: mais de 24 horas desde a última mensagem do cliente e a mensagem não é um template",
  "131049": "A Meta não entregou: limite de mensagens de marketing para este destinatário",
  "131051": "A Meta recusou: tipo de mensagem não suportado",
}

function motivoDaMeta(mensagem: string): string | null {
  if (!mensagem.startsWith("Meta API error:")) return null
  const codigo = /"code"\s*:\s*(\d+)/.exec(mensagem)?.[1]
  if (codigo && MOTIVO_DA_META_POR_CODIGO[codigo]) return MOTIVO_DA_META_POR_CODIGO[codigo]
  const texto = /"error_user_msg"\s*:\s*"([^"]+)"/.exec(mensagem)?.[1] ?? /"message"\s*:\s*"([^"]+)"/.exec(mensagem)?.[1]
  return texto ? `A Meta recusou: ${texto}` : null
}

/**
 * Traduz a recusa do canal para o operador.
 *
 * Aceita o `code` do contrato e, quando ele não é conhecido, a `message`
 * legível que o próprio gateway manda — o contrato promete que ela pode ser
 * mostrada. Sem nenhum dos dois, uma frase honesta em vez de "erro".
 */
export function motivoDaFalha(entrada: {
  codigo?: string | null
  mensagem?: string | null
}): string {
  const { codigo, mensagem } = entrada

  if (codigo && MOTIVO_POR_CODIGO[codigo]) return MOTIVO_POR_CODIGO[codigo]

  // B54-06: recusa da API Oficial com o código dela traduzido.
  if (mensagem) {
    const daMeta = motivoDaMeta(mensagem)
    if (daMeta) return daMeta
  }

  // Nunca devolve o código cru: ele não diz nada a quem lê o relatório.
  if (mensagem && !ehCodigoCru(mensagem)) return mensagem

  return "Não foi possível enviar. O canal recusou a mensagem sem explicar o motivo."
}

/**
 * O texto parece um código de máquina?
 *
 * `instance_not_connected` e afins chegam assim quando algum caminho repassa o
 * `code` no lugar da `message`. Deixar passar colocaria o código na tela.
 */
function ehCodigoCru(texto: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(texto.trim())
}
