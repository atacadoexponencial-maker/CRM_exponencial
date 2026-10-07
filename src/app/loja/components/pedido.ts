// Regras do pedido da vitrine, sem tela nem banco: o carrinho usa para mostrar, e o
// servidor reaproveita para conferir e montar a mensagem (B16-09).

export type TipoMinimo = "nenhum" | "pecas" | "valor"

export interface MinimoPedido {
  tipo: TipoMinimo
  valor: number | null
}

export interface ItemPedido {
  nome: string
  /** Ex.: "M / Azul"; vazio quando o produto não tem variação. */
  variacao: string
  quantidade: number
  precoUnitario: number
}

export function totaisDoPedido(itens: ItemPedido[]): { pecas: number; valor: number } {
  return itens.reduce(
    (acc, i) => ({ pecas: acc.pecas + i.quantidade, valor: acc.valor + i.quantidade * i.precoUnitario }),
    { pecas: 0, valor: 0 }
  )
}

function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/** Texto do que falta para o mínimo; `null` quando já atingiu (ou não há mínimo). */
export function faltaParaMinimo(itens: ItemPedido[], minimo: MinimoPedido): string | null {
  if (minimo.tipo === "nenhum" || !minimo.valor) return null
  const { pecas, valor } = totaisDoPedido(itens)
  if (minimo.tipo === "pecas") {
    const falta = minimo.valor - pecas
    return falta > 0 ? `${falta === 1 ? "Falta 1 peça" : `Faltam ${falta} peças`} para o pedido mínimo de ${minimo.valor}` : null
  }
  const falta = minimo.valor - valor
  return falta > 0.0049 ? `Falta ${reais(falta)} para o pedido mínimo de ${reais(minimo.valor)}` : null
}

export function textoDoMinimo(minimo: MinimoPedido): string | null {
  if (minimo.tipo === "nenhum" || !minimo.valor) return null
  return minimo.tipo === "pecas" ? `Pedido mínimo: ${minimo.valor} peças` : `Pedido mínimo: ${reais(minimo.valor)}`
}

/**
 * WhatsApp só com dígitos e com o 55 do Brasil. `null` quando não parece um celular
 * ou fixo brasileiro com DDD (10 ou 11 dígitos depois do 55).
 */
export function normalizarWhatsapp(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "")
  if (digitos.length === 10 || digitos.length === 11) digitos = "55" + digitos
  if (!digitos.startsWith("55") || (digitos.length !== 12 && digitos.length !== 13)) return null
  return digitos
}

export function montarMensagemPedido(dados: {
  numero: number | string
  nomeCliente: string
  itens: ItemPedido[]
  mensagemFechamento?: string
}): string {
  const { pecas, valor } = totaisDoPedido(dados.itens)
  const linhas = [
    `*Pedido #${dados.numero}*`,
    `Cliente: ${dados.nomeCliente}`,
    "",
    ...dados.itens.map(
      (i) =>
        `• ${i.quantidade}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ""} — ${reais(i.precoUnitario)} cada = ${reais(i.quantidade * i.precoUnitario)}`
    ),
    "",
    `Total: ${pecas} ${pecas === 1 ? "peça" : "peças"} · *${reais(valor)}*`,
  ]
  if (dados.mensagemFechamento?.trim()) linhas.push("", dados.mensagemFechamento.trim())
  return linhas.join("\n")
}

export function linkWhatsapp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}
