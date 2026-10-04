"use server"

// Ação pública da vitrine: a cliente não tem login. Toda conferência é do servidor
// (src/lib/catalogo/pedidos.ts).

import { registrarPedido, type ItemSolicitado, type ResultadoPedido } from "@/lib/catalogo/pedidos"

export async function fazerPedido(endereco: string, cliente: { nome: string; whatsapp: string }, itens: ItemSolicitado[]): Promise<ResultadoPedido> {
  try {
    return await registrarPedido(endereco, cliente, itens)
  } catch {
    return { ok: false, erro: "Não deu para enviar o pedido. Tente de novo." }
  }
}
