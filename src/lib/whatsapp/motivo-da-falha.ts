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
