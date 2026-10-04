"use client"

// Protótipo da B16-03: carrinho e gaveta compartilhados pela vitrine e pela página do
// produto. O pedido é fingido: monta a mensagem e o link, sem gravar nada.

import { useState } from "react"
import Link from "next/link"
import { Carrinho, type LinhaCarrinho } from "../components/carrinho"
import { useCarrinho } from "../components/carrinho-local"
import { linkWhatsapp, montarMensagemPedido } from "../components/pedido"
import type { LayoutVitrine } from "../components/tema"
import { DETALHES_LOJA, ENDERECO_PROTOTIPO, FECHAMENTO_LOJA, MINIMO_LOJA, TEMA_LOJA, WHATSAPP_LOJA } from "./dados-exemplo"

function estoque(produtoId: string, combinacao: string) {
  return DETALHES_LOJA[produtoId]?.estoque[combinacao] ?? 0
}

export function useCarrinhoPrototipo(layout: LayoutVitrine) {
  const carrinho = useCarrinho(ENDERECO_PROTOTIPO, estoque)
  const [aberto, setAberto] = useState(false)

  const linhas: LinhaCarrinho[] = carrinho.itens
    .filter((i) => DETALHES_LOJA[i.produtoId])
    .map((i) => {
      const p = DETALHES_LOJA[i.produtoId]
      return { produtoId: i.produtoId, combinacao: i.combinacao, nome: p.nome, fotoUrl: p.fotos[0] ?? null, preco: p.preco, quantidade: i.quantidade, maximo: estoque(i.produtoId, i.combinacao) }
    })
  const pecas = linhas.reduce((s, l) => s + l.quantidade, 0)

  const gaveta = (
    <Carrinho
      tema={{ ...TEMA_LOJA, layout }}
      aberto={aberto}
      linhas={linhas}
      minimo={MINIMO_LOJA}
      onFechar={() => setAberto(false)}
      onMudarQuantidade={carrinho.mudarQuantidade}
      onRemover={carrinho.remover}
      onPedidoFeito={carrinho.esvaziar}
      onFazerPedido={async ({ nome }) => {
        const mensagem = montarMensagemPedido({
          numero: 1042,
          nomeCliente: nome,
          itens: linhas.map((l) => ({ nome: l.nome, variacao: l.combinacao, quantidade: l.quantidade, precoUnitario: l.preco })),
          mensagemFechamento: FECHAMENTO_LOJA,
        })
        return { numero: 1042, mensagem, link: linkWhatsapp(WHATSAPP_LOJA, mensagem) }
      }}
    />
  )

  return { carrinho, pecas, abrir: () => setAberto(true), gaveta }
}

export function FaixaPrototipoLoja({ layout, base }: { layout: LayoutVitrine; base: string }) {
  return (
    <div className="bg-amber-100 text-amber-950 text-xs px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans">
      <strong>Protótipo (B16-03):</strong> loja de exemplo, nenhum pedido é gravado e o WhatsApp é fictício.
      <span className="flex gap-2">
        Layout:
        {(["grade", "lista", "destaque"] as const).map((l) => (
          <Link key={l} href={`${base}?layout=${l}`} className={l === layout ? "font-bold underline" : "underline opacity-70"}>
            {l === "grade" ? "Grade" : l === "lista" ? "Lista" : "Destaque"}
          </Link>
        ))}
      </span>
    </div>
  )
}
