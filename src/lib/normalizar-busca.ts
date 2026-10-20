/**
 * QA M29 (06/10/2026): a busca das telas não ignorava acento ("Joao" não achava
 * "João") nem a formatação do telefone ("(11) 9" não achava "5511 9"). Tudo passa
 * por aqui antes de comparar.
 */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

/** Só os dígitos; vazio quando não há nenhum. */
export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "")
}

/** `true` quando `texto` contém `termo`, sem acento, maiúscula ou formatação de telefone. */
export function contemTermo(texto: string, termo: string): boolean {
  const t = semAcento(termo)
  if (!t) return true
  if (semAcento(texto).includes(t)) return true
  const digitos = soDigitos(termo)
  return digitos.length >= 3 && soDigitos(texto).includes(digitos)
}
