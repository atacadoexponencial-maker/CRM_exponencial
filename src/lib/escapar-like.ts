/**
 * Texto digitado dentro de um `ilike` do PostgREST: `%`, `_` e `\` são curingas e
 * precisam de escape. QA M18 (06/10): "Entr_da" batia com "Entrada" e "%" com tudo.
 */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}
