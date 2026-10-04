"use client"

// Carrinho guardado no aparelho da cliente, um por loja. Se o navegador bloquear o
// armazenamento (aba anônima, por exemplo), o carrinho vale só enquanto a página está aberta.

import { useCallback, useSyncExternalStore } from "react"

export interface ItemCarrinho {
  produtoId: string
  /** Chave da combinação (ex.: "M / Azul"); "" quando o produto não tem variação. */
  combinacao: string
  quantidade: number
}

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
    if (bruto) itens = JSON.parse(bruto) as ItemCarrinho[]
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

/** Carrinho da loja `endereco`. `limite(produtoId, combinacao)` é o estoque disponível. */
export function useCarrinho(endereco: string, limite: (produtoId: string, combinacao: string) => number) {
  const chave = `carrinho:${endereco}`
  const itens = useSyncExternalStore(assinar, () => ler(chave), () => VAZIO)

  const atualizar = useCallback(
    (novo: ItemCarrinho[]) => gravar(chave, novo.filter((i) => i.quantidade > 0)),
    [chave]
  )

  function adicionar(produtoId: string, combinacao: string, quantidade: number) {
    const max = limite(produtoId, combinacao)
    const existente = itens.find((i) => i.produtoId === produtoId && i.combinacao === combinacao)
    if (existente) {
      atualizar(itens.map((i) => (i === existente ? { ...i, quantidade: Math.min(max, i.quantidade + quantidade) } : i)))
    } else {
      atualizar([...itens, { produtoId, combinacao, quantidade: Math.min(max, quantidade) }])
    }
  }

  function mudarQuantidade(produtoId: string, combinacao: string, quantidade: number) {
    const max = limite(produtoId, combinacao)
    atualizar(itens.map((i) => (i.produtoId === produtoId && i.combinacao === combinacao ? { ...i, quantidade: Math.max(0, Math.min(max, quantidade)) } : i)))
  }

  function remover(produtoId: string, combinacao: string) {
    atualizar(itens.filter((i) => !(i.produtoId === produtoId && i.combinacao === combinacao)))
  }

  function esvaziar() {
    atualizar([])
  }

  return { itens, adicionar, mudarQuantidade, remover, esvaziar }
}
