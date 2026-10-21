"use client"

// Carrinho e gaveta da loja, iguais na vitrine e na página do produto (B16-09).

import { useState } from "react"
import { Carrinho, pecasPorProduto, unitarioDaLinha, type LinhaCarrinho, type ResultadoPedido } from "../components/carrinho"
import { guardarUltimoPedido, useCarrinho, useUltimoPedido } from "../components/carrinho-local"
import { textoDoQueFicouFora } from "@/lib/catalogo/repetir-pedido"
import type { MinimoPedido } from "../components/pedido"
import type { TemaLoja } from "../components/tema"
import type { DescontoPedido } from "@/lib/catalogo/regras-de-venda"
import { fazerPedido, repetirPedido } from "./actions"

export function useCarrinhoLoja(endereco: string, tema: TemaLoja, minimo: MinimoPedido, descontos: DescontoPedido[] = []) {
  const carrinho = useCarrinho(endereco)
  const [aberto, setAberto] = useState(false)
  // B31-05: o último pedido fica no aparelho (nulo no servidor, para a hidratação bater).
  const ultimoPedido = useUltimoPedido(endereco)
  const [avisoRepeticao, setAvisoRepeticao] = useState<string | null>(null)
  const [repetindo, setRepetindo] = useState(false)

  async function repetir() {
    if (!ultimoPedido || repetindo) return
    setRepetindo(true)
    setAvisoRepeticao(null)
    const r = await repetirPedido(endereco, ultimoPedido.pecas)
    setRepetindo(false)
    setAberto(true)
    if (!r.ok) {
      setAvisoRepeticao(r.erro)
      return
    }
    carrinho.substituir(r.itens.map((i) => ({ produtoId: i.produtoId, combinacao: i.combinacao, quantidade: i.quantidade, nome: i.nome, preco: i.preco, fotoUrl: i.fotoUrl, maximo: i.maximo, faixas: i.faixas, minimo: i.minimo, grade: i.grade })))
    const fora = textoDoQueFicouFora(r.fora)
    setAvisoRepeticao(fora ? `Pedido #${ultimoPedido.numero} repetido. ${fora}.` : `Pedido #${ultimoPedido.numero} repetido com as peças de hoje.`)
  }

  const linhas: LinhaCarrinho[] = carrinho.itens.map((i) => ({
    produtoId: i.produtoId,
    combinacao: i.combinacao,
    nome: i.nome,
    fotoUrl: i.fotoUrl,
    preco: i.preco,
    quantidade: i.quantidade,
    maximo: i.maximo,
    faixas: i.faixas,
    minimo: i.minimo,
    grade: i.grade,
  }))
  const pecas = linhas.reduce((s, l) => s + l.quantidade, 0)

  async function enviar(cliente: { nome: string; whatsapp: string }): Promise<ResultadoPedido> {
    // B31-01: vai o unitário que a cliente viu (já pela faixa); o servidor recalcula e compara.
    const porProduto = pecasPorProduto(carrinho.itens)
    const r = await fazerPedido(
      endereco,
      cliente,
      carrinho.itens.map((i) => ({ produtoId: i.produtoId, combinacao: i.combinacao, quantidade: i.quantidade, preco: unitarioDaLinha(i, porProduto) }))
    )
    if (!r.ok) {
      if (r.semEstoque?.length) carrinho.ajustarLimites(r.semEstoque)
      if (r.precosNovos?.length) carrinho.ajustarPrecos(r.precosNovos)
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
      descontos={descontos}
      onFechar={() => setAberto(false)}
      onMudarQuantidade={carrinho.mudarQuantidade}
      onRemover={carrinho.remover}
      onMudarQuantidades={carrinho.mudarQuantidades}
      onRemoverVarios={carrinho.removerVarios}
      onPedidoFeito={({ numero }) => {
        guardarUltimoPedido(endereco, numero, carrinho.itens)
        setAvisoRepeticao(null)
        carrinho.esvaziar()
      }}
      ultimoPedido={ultimoPedido}
      onRepetirPedido={repetir}
      avisoRepeticao={avisoRepeticao}
      onFazerPedido={enviar}
    />
  )

  return { carrinho, pecas, abrir: () => setAberto(true), gaveta, repetir: ultimoPedido ? repetir : undefined }
}
