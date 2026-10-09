"use server"

// Ação pública da vitrine: a cliente não tem login. Toda conferência é do servidor
// (src/lib/catalogo/pedidos.ts).

import { registrarPedido, type ItemSolicitado, type ResultadoPedido } from "@/lib/catalogo/pedidos"
import { chaveDoPedidoNaLoja, ipDaRequisicao, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"

// B21-07: um robô não cria pedidos (e contatos) em massa — no máximo 10 por hora por
// endereço de internet, em cada loja. Conta só pedido que entrou.
const PEDIDOS_POR_HORA = 10
const AVISO_MUITOS_PEDIDOS = "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo."

export async function fazerPedido(endereco: string, cliente: { nome: string; whatsapp: string }, itens: ItemSolicitado[]): Promise<ResultadoPedido> {
  try {
    const chave = chaveDoPedidoNaLoja(await ipDaRequisicao(), endereco)
    if (await passouDoLimite("pedido_loja", [{ chave, limite: PEDIDOS_POR_HORA }], 60)) {
      return { ok: false, erro: AVISO_MUITOS_PEDIDOS }
    }

    const resultado = await registrarPedido(endereco, cliente, itens)
    if (resultado.ok) await registrarTentativa("pedido_loja", [chave])
    return resultado
  } catch {
    return { ok: false, erro: "Não deu para enviar o pedido. Tente de novo." }
  }
}
