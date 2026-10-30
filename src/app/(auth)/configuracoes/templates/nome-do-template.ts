// B53-08: a mesma regra de nome na tela (que mostra o nome final ao digitar) e no
// servidor (que confere antes de chamar a Meta). A Meta só aceita minúsculas,
// números e underscore.

export const NOME_DO_TEMPLATE_ACEITO = "Nome deve conter apenas letras minúsculas, números e underscores"

/** O nome que vai para a Meta: minúsculo, com espaço virando underscore. "Teste Luan" → "teste_luan". */
export function nomeFinalDoTemplate(texto: string): string {
  return texto.trim().toLowerCase().replace(/\s+/g, "_")
}

/** Converte e confere: devolve o nome final ou o motivo da recusa. */
export function conferirNomeDoTemplate(texto: string): { nome: string } | { erro: string } {
  const nome = nomeFinalDoTemplate(texto)
  if (!nome) return { erro: "Nome é obrigatório" }
  if (!/^[a-z0-9_]+$/.test(nome)) return { erro: NOME_DO_TEMPLATE_ACEITO }
  return { nome }
}
