// B38-05: variáveis das mensagens, com texto reserva obrigatório.
//
// Uma variável é `{{chave|reserva}}`: na hora de enviar, vira o valor do contato ou,
// sem valor, o reserva. O reserva é obrigatório em toda variável (PER-B38-15): texto
// com variável sem reserva não é salvo, e o que foi salvo antes não é enviado até
// ganhar o reserva (SUP-B38-18). Vale para a mensagem e o lembrete das automações,
// as campanhas e as mensagens rápidas.

/** Variáveis que não são de campo personalizado. A campanha não tem `primeiro_nome`. */
export const VARIAVEIS_FIXAS = ["nome_contato", "primeiro_nome", "nome_vendedor"] as const

const VARIAVEL = /\{\{\s*([a-z0-9_]+)\s*(?:\|([^{}]*))?\}\}/g

export type VariavelDoTexto = { chave: string; reserva: string | null; inteira: string }

/** As variáveis do texto, na ordem; reserva vazio conta como sem reserva. */
export function variaveisDoTexto(texto: string): VariavelDoTexto[] {
  return Array.from((texto ?? "").matchAll(VARIAVEL), (m) => ({
    chave: m[1],
    reserva: m[2] !== undefined && m[2].trim() !== "" ? m[2].trim() : null,
    inteira: m[0],
  }))
}

/** As variáveis sem reserva, como aparecem no texto ("{{nome_contato}}"), sem repetir. */
export function variaveisSemReserva(texto: string): string[] {
  return [...new Set(variaveisDoTexto(texto).filter((v) => v.reserva === null).map((v) => `{{${v.chave}}}`))]
}

/** A mensagem de quem tenta salvar ou enviar texto com variável sem reserva. */
export function avisoDeSemReserva(texto: string): string | null {
  const sem = variaveisSemReserva(texto)
  if (sem.length === 0) return null
  return sem.length === 1
    ? `A variável ${sem[0]} está sem texto reserva. Use o botão da variável para pôr o reserva.`
    : `As variáveis ${sem.join(", ")} estão sem texto reserva. Use o botão de cada uma para pôr o reserva.`
}

/**
 * Troca cada variável pelo valor (`valores[chave]`) ou, vazio, pelo reserva. Uma troca
 * só (B22-39): o que entra no lugar não é lido de novo. Quem chama confere antes que
 * nenhuma está sem reserva.
 */
export function preencherVariaveis(texto: string, valores: Record<string, string | null | undefined>): string {
  return (texto ?? "").replace(VARIAVEL, (_, chave: string, reserva: string | undefined) => {
    const valor = valores[chave]?.trim()
    return valor ? valor : (reserva ?? "").trim()
  })
}

/** A variável de um campo pelo nome: minúsculo, sem acento, o resto vira "_" (CA-B38-14). */
export function chaveDaVariavel(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

/** Troca a chave da variável no texto, mantendo o reserva (CA-B38-46). */
export function trocarChave(texto: string, antiga: string, nova: string): string {
  return (texto ?? "").replace(VARIAVEL, (inteira, chave: string, reserva: string | undefined) =>
    chave === antiga ? (reserva !== undefined ? `{{${nova}|${reserva}}}` : `{{${nova}}}`) : inteira
  )
}

/** Insere o trecho no lugar da seleção (ou no cursor) e diz onde o cursor fica depois dele. */
export function inserirNoCursor(
  texto: string,
  inicio: number,
  fim: number,
  trecho: string
): { texto: string; cursor: number } {
  return { texto: texto.slice(0, inicio) + trecho + texto.slice(fim), cursor: inicio + trecho.length }
}
