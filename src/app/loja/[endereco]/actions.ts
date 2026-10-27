"use server"

// Ação pública da vitrine: a cliente não tem login. Toda conferência é do servidor
// (src/lib/catalogo/pedidos.ts).

import { registrarPedido, type ItemSolicitado, type ResultadoPedido } from "@/lib/catalogo/pedidos"
import { prepararRepeticao, type PecaGuardada, type ResultadoRepeticao } from "@/lib/catalogo/repetir-pedido"
import { chaveDoPedidoNaLoja, ipDaRequisicao, liberarTentativa, reservarTentativa } from "@/lib/limite-de-tentativas"

// B21-07: um robô não cria pedidos (e contatos) em massa — no máximo 10 por hora por
// endereço de internet, em cada loja. Conta só pedido que entrou.
const PEDIDOS_POR_HORA = 10
const AVISO_MUITOS_PEDIDOS = "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo."

/** B31-05: as peças do último pedido guardadas no aparelho, conferidas com o catálogo de hoje. */
export async function repetirPedido(endereco: string, pecas: PecaGuardada[]): Promise<ResultadoRepeticao> {
  try {
    return await prepararRepeticao(endereco, pecas)
  } catch {
    return { ok: false, erro: "Não deu para repetir o pedido. Tente de novo." }
  }
}

export async function fazerPedido(endereco: string, cliente: { nome: string; whatsapp: string }, itens: ItemSolicitado[]): Promise<ResultadoPedido> {
  try {
    // B44-09: a vaga é reservada antes (conta e grava de uma vez); pedidos ao mesmo
    // tempo não passam juntos do limite. Pedido que não entra devolve a vaga.
    const chave = chaveDoPedidoNaLoja(await ipDaRequisicao(), endereco)
    const vaga = await reservarTentativa("pedido_loja", chave, PEDIDOS_POR_HORA, 60)
    if (!vaga.reservada) return { ok: false, erro: AVISO_MUITOS_PEDIDOS }

    try {
      const resultado = await registrarPedido(endereco, cliente, itens)
      if (!resultado.ok) await liberarTentativa(vaga.id)
      return resultado
    } catch (erro) {
      await liberarTentativa(vaga.id)
      throw erro
    }
  } catch {
    return { ok: false, erro: "Não deu para enviar o pedido. Tente de novo." }
  }
}
