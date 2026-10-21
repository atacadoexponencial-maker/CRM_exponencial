// Repetir o último pedido (B31-05). Só no servidor: a lista de peças vem do aparelho da
// cliente e não vale nada sozinha. Aqui ela é conferida com o catálogo de hoje — produto
// visível, combinação existente, estoque, preço e regras — e volta como itens de carrinho.

import { createServiceClient } from "@/integrations/supabase/service"
import { chaveCombinacao, combinacoes, type TipoVariacao } from "./combinacoes"
import { carregarLojaPublica, urlPublicaImagem } from "./loja-publica"
import { blocoDaCombinacao, faixasDoBanco, gradeDoBanco, opcaoDaCombinacao, pacotesDoBloco, pacotesQueCabem, type FaixaPreco, type GradeFechada } from "./regras-de-venda"

export interface PecaGuardada {
  produtoId: string
  combinacao: string
  quantidade: number
}

/** Item pronto para o carrinho, com os dados de hoje. */
export interface PecaParaRepetir {
  produtoId: string
  combinacao: string
  quantidade: number
  nome: string
  preco: number
  fotoUrl: string | null
  maximo: number
  faixas: FaixaPreco[]
  minimo: number | null
  grade: GradeFechada | null
}

export interface PecaForaDaRepeticao {
  produtoId: string
  combinacao: string
  nome: string
  motivo: string
}

export type ResultadoRepeticao = { ok: true; itens: PecaParaRepetir[]; fora: PecaForaDaRepeticao[] } | { ok: false; erro: string }

export async function prepararRepeticao(endereco: string, pecas: PecaGuardada[]): Promise<ResultadoRepeticao> {
  if (!Array.isArray(pecas) || pecas.length === 0 || pecas.length > 100) return { ok: false, erro: "Não há pedido para repetir." }
  const validas = pecas.filter((p) => /^[0-9a-f-]{36}$/i.test(p.produtoId) && typeof p.combinacao === "string" && Number.isInteger(p.quantidade) && p.quantidade > 0)
  if (validas.length === 0) return { ok: false, erro: "Não há pedido para repetir." }
  const loja = await carregarLojaPublica(endereco)
  if (!loja) return { ok: false, erro: "A loja não está recebendo pedidos agora." }

  const ids = [...new Set(validas.map((p) => p.produtoId))]
  const { data: produtos } = await createServiceClient()
    .from("catalog_products")
    .select("id, name, price, photos, variant_types, price_tiers, min_quantity, pack_quantities, pack_price, catalog_stock(combination, quantity)")
    .eq("workspace_id", loja.workspaceId)
    .eq("visible", true)
    .in("id", ids)
  const porId = new Map((produtos ?? []).map((p) => [p.id, p]))

  const itens: PecaParaRepetir[] = []
  const fora: PecaForaDaRepeticao[] = []
  // Produto de grade fechada: o bloco inteiro volta com os pacotes que cabem no estoque de hoje.
  const blocosDeGrade = new Map<string, { produtoId: string; bloco: string; pecas: PecaGuardada[] }>()

  for (const p of validas) {
    const produto = porId.get(p.produtoId)
    if (!produto) {
      fora.push({ produtoId: p.produtoId, combinacao: p.combinacao, nome: "Um produto", motivo: "saiu da loja" })
      continue
    }
    const tipos = (produto.variant_types as TipoVariacao[]) ?? []
    if (!combinacoes(tipos).map(chaveCombinacao).includes(p.combinacao)) {
      fora.push({ produtoId: p.produtoId, combinacao: p.combinacao, nome: produto.name, motivo: "essa opção não existe mais" })
      continue
    }
    const grade = gradeDoBanco(produto.pack_quantities, produto.pack_price, tipos)
    if (grade) {
      const chave = `${p.produtoId}|${blocoDaCombinacao(p.combinacao)}`
      const b = blocosDeGrade.get(chave) ?? { produtoId: p.produtoId, bloco: blocoDaCombinacao(p.combinacao), pecas: [] }
      b.pecas.push(p)
      blocosDeGrade.set(chave, b)
      continue
    }
    const estoque = ((produto.catalog_stock as { combination: string; quantity: number }[]) ?? []).find((e) => e.combination === p.combinacao)?.quantity ?? 0
    if (estoque === 0) {
      fora.push({ produtoId: p.produtoId, combinacao: p.combinacao, nome: produto.name, motivo: "esgotou" })
      continue
    }
    itens.push({
      produtoId: p.produtoId,
      combinacao: p.combinacao,
      quantidade: Math.min(p.quantidade, estoque),
      nome: produto.name,
      preco: Number(produto.price),
      fotoUrl: ((produto.photos as string[]) ?? [])[0] ? urlPublicaImagem((produto.photos as string[])[0]) : null,
      maximo: estoque,
      faixas: faixasDoBanco(produto.price_tiers),
      minimo: produto.min_quantity,
      grade: null,
    })
  }

  for (const b of blocosDeGrade.values()) {
    const produto = porId.get(b.produtoId)!
    const tipos = (produto.variant_types as TipoVariacao[]) ?? []
    const grade = gradeDoBanco(produto.pack_quantities, produto.pack_price, tipos)!
    const estoqueDe = (combinacao: string) => ((produto.catalog_stock as { combination: string; quantity: number }[]) ?? []).find((e) => e.combination === combinacao)?.quantity ?? 0
    const combinacaoDa = (opcao: string) => (b.bloco ? chaveCombinacao([opcao, b.bloco]) : opcao)
    const pedidos = pacotesDoBloco(grade, Object.fromEntries(b.pecas.map((p) => [opcaoDaCombinacao(p.combinacao), p.quantidade]))) ?? 1
    const cabem = pacotesQueCabem(grade, (opcao) => estoqueDe(combinacaoDa(opcao)))
    const pacotes = Math.min(Math.max(1, pedidos), cabem)
    const rotulo = `${produto.name}${b.bloco ? ` (${b.bloco})` : ""}`
    if (pacotes === 0) {
      fora.push({ produtoId: b.produtoId, combinacao: b.bloco, nome: rotulo, motivo: "sem estoque para uma grade inteira" })
      continue
    }
    for (const [opcao, porPacote] of Object.entries(grade.quantidades)) {
      if (porPacote === 0) continue
      const combinacao = combinacaoDa(opcao)
      itens.push({
        produtoId: b.produtoId,
        combinacao,
        quantidade: pacotes * porPacote,
        nome: produto.name,
        preco: Number(produto.price),
        fotoUrl: ((produto.photos as string[]) ?? [])[0] ? urlPublicaImagem((produto.photos as string[])[0]) : null,
        maximo: estoqueDe(combinacao),
        faixas: faixasDoBanco(produto.price_tiers),
        minimo: produto.min_quantity,
        grade,
      })
    }
  }

  return { ok: true, itens, fora }
}

/** Texto do aviso: "Regata canelada ficou de fora: saiu da loja · Camiseta (M / Azul) ficou de fora: esgotou". */
export function textoDoQueFicouFora(fora: PecaForaDaRepeticao[]): string | null {
  if (fora.length === 0) return null
  return fora.map((f) => `${f.nome}${f.combinacao && f.nome !== "Um produto" && !f.nome.endsWith(")") ? ` (${f.combinacao})` : ""} ficou de fora: ${f.motivo}`).join(" · ")
}
