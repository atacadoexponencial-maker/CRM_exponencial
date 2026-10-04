"use client"

// Carrinho guardado no aparelho da cliente, um por loja. Se o navegador bloquear o
// armazenamento (aba anônima, por exemplo), o carrinho vale só enquanto a página está aberta.

import { useCallback, useSyncExternalStore } from "react"

export interface ItemCarrinho {
  produtoId: string
  /** Chave da combinação (ex.: "M / Azul"); "" quando o produto não tem variação. */
  combinacao: string
  quantidade: number
  // Retrato do produto quando entrou no carrinho, para mostrar a gaveta em qualquer página.
  // Valem só para a tela: o servidor confere preço e estoque de novo ao fazer o pedido.
  nome: string
  preco: number
  fotoUrl: string | null
  /** Estoque disponível da combinação (o servidor atualiza quando muda). */
  maximo: number
}

export type NovoItemCarrinho = Omit<ItemCarrinho, "quantidade">

const VAZIO: ItemCarrinho[] = []
const memoria = new Map<string, ItemCarrinho[]>()
const ouvintes = new Set<() => void>()

/** Lê uma vez por mudança e guarda a mesma referência (exigência do useSyncExternalStore). */
function ler(chave: string): ItemCarrinho[] {
  const atual = memoria.get(chave)
  if (atual) return atual
  let itens = VAZIO
  try {
    const bruto = localStorage.getItem(chave)
    if (bruto) itens = (JSON.parse(bruto) as ItemCarrinho[]).filter((i) => typeof i.nome === "string" && typeof i.maximo === "number")
  } catch {
    // armazenamento indisponível: começa vazio, só na memória
  }
  memoria.set(chave, itens)
  return itens
}

function gravar(chave: string, itens: ItemCarrinho[]) {
  memoria.set(chave, itens)
  try {
    localStorage.setItem(chave, JSON.stringify(itens))
  } catch {
    // armazenamento indisponível: fica só na memória
  }
  ouvintes.forEach((avisar) => avisar())
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar)
  // Outra aba mexeu no carrinho: relê na próxima leitura.
  const deOutraAba = (e: StorageEvent) => { if (e.key?.startsWith("carrinho:")) { memoria.delete(e.key); avisar() } }
  window.addEventListener("storage", deOutraAba)
  return () => { ouvintes.delete(avisar); window.removeEventListener("storage", deOutraAba) }
}

/** Carrinho da loja `endereco`, guardado no aparelho. */
export function useCarrinho(endereco: string) {
  const chave = `carrinho:${endereco}`
  const itens = useSyncExternalStore(assinar, () => ler(chave), () => VAZIO)

  const atualizar = useCallback(
    (novo: ItemCarrinho[]) => gravar(chave, novo.filter((i) => i.quantidade > 0)),
    [chave]
  )

  function adicionar(novo: NovoItemCarrinho, quantidade: number) {
    const existente = itens.find((i) => i.produtoId === novo.produtoId && i.combinacao === novo.combinacao)
    if (existente) {
      atualizar(itens.map((i) => (i === existente ? { ...i, ...novo, quantidade: Math.min(novo.maximo, i.quantidade + quantidade) } : i)))
    } else {
      atualizar([...itens, { ...novo, quantidade: Math.min(novo.maximo, quantidade) }])
    }
  }

  function mudarQuantidade(produtoId: string, combinacao: string, quantidade: number) {
    atualizar(itens.map((i) => (i.produtoId === produtoId && i.combinacao === combinacao ? { ...i, quantidade: Math.max(0, Math.min(i.maximo, quantidade)) } : i)))
  }

  /** O servidor disse que o estoque mudou: limita (ou tira) os itens afetados. */
  function ajustarLimites(mudancas: { produtoId: string; combinacao: string; disponivel: number }[]) {
    atualizar(
      itens.map((i) => {
        const m = mudancas.find((x) => x.produtoId === i.produtoId && x.combinacao === i.combinacao)
        return m ? { ...i, maximo: m.disponivel, quantidade: Math.min(i.quantidade, m.disponivel) } : i
      })
    )
  }

  function remover(produtoId: string, combinacao: string) {
    atualizar(itens.filter((i) => !(i.produtoId === produtoId && i.combinacao === combinacao)))
  }

  function esvaziar() {
    atualizar([])
  }

  return { itens, adicionar, mudarQuantidade, ajustarLimites, remover, esvaziar }
}
