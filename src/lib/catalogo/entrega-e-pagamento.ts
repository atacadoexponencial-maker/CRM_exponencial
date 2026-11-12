// Formas de entrega e de pagamento da loja (B61-06). A lista é pronta: o lojista só marca,
// e a loja pública mostra o que ele marcou. Funções puras; quem confere é o servidor.

export interface Forma {
  id: string
  nome: string
}

export const FORMAS_ENTREGA: Forma[] = [
  { id: "correios", nome: "Correios" },
  { id: "transportadora", nome: "Transportadora" },
  { id: "retirada", nome: "Retirada no local" },
  { id: "excursao", nome: "Excursão" },
]

export const FORMAS_PAGAMENTO: Forma[] = [
  { id: "pix", nome: "Pix" },
  { id: "cartao", nome: "Cartão de crédito" },
  { id: "boleto", nome: "Boleto" },
  { id: "dinheiro", nome: "Dinheiro" },
]

/**
 * Os identificadores marcados, sem repetição e na ordem da lista pronta; `null` quando o
 * valor não é uma lista ou traz algo que não está na lista pronta.
 */
export function formasValidas(marcadas: unknown, lista: Forma[]): string[] | null {
  if (!Array.isArray(marcadas)) return null
  if (marcadas.some((m) => typeof m !== "string" || !lista.some((f) => f.id === m))) return null
  return lista.filter((f) => marcadas.includes(f.id)).map((f) => f.id)
}

/** Nomes para exibir, na ordem da lista pronta; o que não está na lista fica de fora. */
export function nomesDasFormas(marcadas: string[] | null | undefined, lista: Forma[]): string[] {
  return lista.filter((f) => (marcadas ?? []).includes(f.id)).map((f) => f.nome)
}

/** Identificadores gravados que ainda estão na lista pronta, na ordem dela. */
export function idsDasFormas(marcadas: string[] | null | undefined, lista: Forma[]): string[] {
  return lista.filter((f) => (marcadas ?? []).includes(f.id)).map((f) => f.id)
}
