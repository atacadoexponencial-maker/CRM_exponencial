// B53-15: a regra única das iniciais dos avatares (contato, usuário e time).
// Símbolo não vira inicial: de cada palavra sai o que não é letra nem número
// (letra acentuada conta como letra). "[TESTE] Automações B11" → "TB".

/**
 * Primeira letra da primeira e da última palavra, em maiúsculo. Com uma palavra
 * só, as `letrasDeUmaPalavra` primeiras dela. Nome sem letra nem número → "".
 */
export function iniciaisDoNome(nome: string, letrasDeUmaPalavra = 1): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .map((parte) => parte.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
  if (partes.length === 0) return ""
  if (partes.length === 1) return Array.from(partes[0]).slice(0, letrasDeUmaPalavra).join("").toUpperCase()
  return (Array.from(partes[0])[0] + Array.from(partes[partes.length - 1])[0]).toUpperCase()
}
