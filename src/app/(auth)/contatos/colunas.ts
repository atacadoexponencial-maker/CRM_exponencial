// B38-09: colunas da lista de Contatos que cada usuário pode esconder. O Nome fica sempre.
// O perfil guarda as colunas ESCONDIDAS (chave da fixa ou id do campo personalizado),
// para que um campo criado depois apareça ligado para todos.

export const COLUNAS_FIXAS = [
  { chave: "whatsapp", nome: "WhatsApp" },
  { chave: "classificacao", nome: "Classificação" },
  { chave: "perfil_rfv", nome: "Perfil RFV" },
  { chave: "tipo", nome: "Tipo" },
  { chave: "cidade", nome: "Cidade" },
  { chave: "atendente", nome: "Atendente" },
] as const

export type ChaveDeColunaFixa = (typeof COLUNAS_FIXAS)[number]["chave"]

/** Mais do que as fixas e os 50 campos da empresa (SUP-B38-06), com folga para ids de campos apagados. */
export const LIMITE_DE_COLUNAS_OCULTAS = 80

const CHAVES_FIXAS = new Set<string>(COLUNAS_FIXAS.map((c) => c.chave))
const ID_DE_CAMPO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A lista recebida, sem repetidos, ou `null` se não for uma lista de colunas que existem. */
export function conferirColunasOcultas(entrada: unknown): string[] | null {
  if (!Array.isArray(entrada) || entrada.length > LIMITE_DE_COLUNAS_OCULTAS) return null
  if (!entrada.every((c) => typeof c === "string" && (CHAVES_FIXAS.has(c) || ID_DE_CAMPO.test(c)))) return null
  return Array.from(new Set(entrada as string[]))
}
