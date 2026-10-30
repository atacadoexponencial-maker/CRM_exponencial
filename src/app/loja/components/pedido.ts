// Regras do pedido da vitrine, sem tela nem banco: o carrinho usa para mostrar, e o
// servidor reaproveita para conferir e montar a mensagem (B16-09).

export type TipoMinimo = "nenhum" | "pecas" | "valor"

export interface MinimoPedido {
  tipo: TipoMinimo
  valor: number | null
}

export interface ItemPedido {
  nome: string
  /** Código do produto (SKU) do cadastro; vazio quando o lojista não preencheu. */
  codigo?: string
  /** Ex.: "M / Azul"; vazio quando o produto não tem variação. */
  variacao: string
  quantidade: number
  precoUnitario: number
  /** B31-01: quantidade da faixa de preço que valeu ("preço de 12+"); ausente sem faixa. */
  faixaAplicada?: number | null
  /** B31-03: o item faz parte de uma grade fechada (a mensagem o mostra pela linha da grade). */
  naGrade?: boolean
}

/** B31-03: uma grade fechada no pedido (um bloco/cor), para a mensagem. */
export interface GradeNoPedido {
  nome: string
  /** Opção do segundo tipo (cor); vazio com um tipo só. */
  bloco: string
  pacotes: number
  pecas: number
  precoUnitario: number
  /** "P 2 · M 4 · G 4 · GG 2" */
  detalhe: string
}

export interface DescontoAplicado {
  percent: number
  /** Em reais, já arredondado em centavos. */
  valor: number
}

export function totaisDoPedido(itens: ItemPedido[]): { pecas: number; valor: number } {
  const soma = itens.reduce(
    (acc, i) => ({ pecas: acc.pecas + i.quantidade, valor: acc.valor + i.quantidade * i.precoUnitario }),
    { pecas: 0, valor: 0 }
  )
  // B53-12: o unitário da grade vem sem arredondar; o total arredonda em centavos, como a função do banco.
  return { pecas: soma.pecas, valor: Math.round(soma.valor * 100) / 100 }
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
  /** B31-02: desconto por total do pedido, quando valeu. */
  desconto?: DescontoAplicado | null
  /** B31-03: grades fechadas do pedido (os itens delas não saem linha a linha). */
  grades?: GradeNoPedido[]
  mensagemFechamento?: string
}): string {
  const { pecas, valor } = totaisDoPedido(dados.itens)
  const desconto = dados.desconto && dados.desconto.valor > 0 ? dados.desconto : null
  const totais = desconto
    ? [
        `Subtotal: ${pecas} ${pecas === 1 ? "peça" : "peças"} · ${reais(valor)}`,
        `Desconto de ${desconto.percent}% do pedido: − ${reais(desconto.valor)}`,
        `Total: *${reais(Math.round((valor - desconto.valor) * 100) / 100)}*`,
      ]
    : [`Total: ${pecas} ${pecas === 1 ? "peça" : "peças"} · *${reais(valor)}*`]
  const linhas = [
    `*Pedido #${dados.numero}*`,
    `Cliente: ${dados.nomeCliente}`,
    "",
    ...dados.itens
      .filter((i) => !i.naGrade)
      .map(
        (i) =>
          `• ${i.quantidade}x ${i.nome}${i.variacao ? ` (${i.variacao})` : ""}${i.codigo?.trim() ? ` · cód. ${i.codigo.trim()}` : ""} — ${reais(i.precoUnitario)} cada${i.faixaAplicada ? ` (preço de ${i.faixaAplicada}+)` : ""} = ${reais(i.quantidade * i.precoUnitario)}`
      ),
    ...(dados.grades ?? []).flatMap((g) => [
      `• ${g.nome}${g.bloco ? ` (${g.bloco})` : ""}: ${g.pacotes} ${g.pacotes === 1 ? "grade" : "grades"} (${g.pecas} peças) — ${reais(g.precoUnitario)} cada = ${reais(Math.round(g.pecas * g.precoUnitario * 100) / 100)}`,
      `   ${g.detalhe}`,
    ]),
    "",
    ...totais,
  ]
  if (dados.mensagemFechamento?.trim()) linhas.push("", dados.mensagemFechamento.trim())
  return linhas.join("\n")
}

export function linkWhatsapp(numero: string, mensagem: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}
