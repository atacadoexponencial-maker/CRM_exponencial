"use client"

// Carrinho e gaveta da loja, iguais na vitrine e na página do produto (B16-09).

import { useState } from "react"
import { Carrinho, type LinhaCarrinho, type ResultadoPedido } from "../components/carrinho"
import { useCarrinho } from "../components/carrinho-local"
import type { MinimoPedido } from "../components/pedido"
import type { TemaLoja } from "../components/tema"
import { fazerPedido } from "./actions"

export function useCarrinhoLoja(endereco: string, tema: TemaLoja, minimo: MinimoPedido) {
  const carrinho = useCarrinho(endereco)
  const [aberto, setAberto] = useState(false)

  const linhas: LinhaCarrinho[] = carrinho.itens.map((i) => ({
    produtoId: i.produtoId,
    combinacao: i.combinacao,
    nome: i.nome,
    fotoUrl: i.fotoUrl,
    preco: i.preco,
    quantidade: i.quantidade,
    maximo: i.maximo,
  }))
  const pecas = linhas.reduce((s, l) => s + l.quantidade, 0)

  async function enviar(cliente: { nome: string; whatsapp: string }): Promise<ResultadoPedido> {
    const r = await fazerPedido(
      endereco,
      cliente,
      carrinho.itens.map((i) => ({ produtoId: i.produtoId, combinacao: i.combinacao, quantidade: i.quantidade }))
    )
    if (!r.ok) {
      if (r.semEstoque?.length) carrinho.ajustarLimites(r.semEstoque)
      return { erro: r.erro }
    }
    return { numero: r.numero, mensagem: r.mensagem, link: r.link }
  }

  const gaveta = (
    <Carrinho
      tema={tema}
      aberto={aberto}
      linhas={linhas}
      minimo={minimo}
      onFechar={() => setAberto(false)}
      onMudarQuantidade={carrinho.mudarQuantidade}
      onRemover={carrinho.remover}
      onPedidoFeito={carrinho.esvaziar}
      onFazerPedido={enviar}
    />
  )

  return { carrinho, pecas, abrir: () => setAberto(true), gaveta }
}
