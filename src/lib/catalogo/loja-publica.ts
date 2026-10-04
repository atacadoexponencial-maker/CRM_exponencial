// Leitura da loja publicada para a vitrine (B16-07). Só no servidor: usa a chave de
// serviço porque a cliente da loja não tem login, e por isso devolve SÓ o que é público —
// produtos visíveis, preços, fotos, estoque por combinação e as regras do pedido.
// Nunca devolver dado de contato, pedido ou configuração interna daqui.

import { createServiceClient } from "@/integrations/supabase/service"
import { chaveCombinacao, combinacoes, type TipoVariacao } from "./combinacoes"
import { BUCKET_CATALOGO } from "./regras"
import { TEMA_PADRAO, type TemaLoja } from "@/app/loja/components/tema"
import type { CategoriaVitrine, ProdutoVitrine } from "@/app/loja/components/vitrine"
import type { ProdutoDetalhe } from "@/app/loja/components/pagina-produto"
import type { MinimoPedido } from "@/app/loja/components/pedido"

export interface LojaPublica {
  workspaceId: string
  endereco: string
  tema: TemaLoja
  minimo: MinimoPedido
  mensagemFechamento: string
  /** WhatsApp da loja, só dígitos com 55 (para o link do pedido). */
  whatsapp: string
}

export function urlPublicaImagem(caminho: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_CATALOGO}/${caminho}`
}

function soDigitos(numero: string): string {
  const d = numero.replace(/\D/g, "")
  return d.length === 10 || d.length === 11 ? "55" + d : d
}

/** A loja do endereço, se estiver publicada e com um número ativo para receber pedidos. */
export async function carregarLojaPublica(endereco: string): Promise<LojaPublica | null> {
  const service = createServiceClient()
  const { data: cfg } = await service
    .from("catalog_settings")
    .select("workspace_id, slug, min_type, min_value, closing_message, published, whatsapp_connections(phone_number, status), workspaces(name)")
    .eq("slug", endereco.toLowerCase())
    .eq("published", true)
    .maybeSingle()
  if (!cfg) return null

  const conexao = cfg.whatsapp_connections as unknown as { phone_number: string | null; status: string | null } | null
  if (!conexao?.phone_number || conexao.status === "removed") return null
  const empresa = cfg.workspaces as unknown as { name: string } | null

  return {
    workspaceId: cfg.workspace_id,
    endereco: cfg.slug,
    tema: { ...TEMA_PADRAO, nomeLoja: empresa?.name ?? TEMA_PADRAO.nomeLoja },
    minimo: { tipo: cfg.min_type as MinimoPedido["tipo"], valor: cfg.min_value === null ? null : Number(cfg.min_value) },
    mensagemFechamento: cfg.closing_message,
    whatsapp: soDigitos(conexao.phone_number),
  }
}

/** Categorias e produtos visíveis da loja, na ordem do lojista. */
export async function carregarVitrine(workspaceId: string): Promise<{ categorias: CategoriaVitrine[]; produtos: ProdutoVitrine[] }> {
  const service = createServiceClient()
  const [{ data: cats }, { data: prods }] = await Promise.all([
    service.from("catalog_categories").select("id, name").eq("workspace_id", workspaceId).order("position").order("created_at"),
    service
      .from("catalog_products")
      .select("id, name, description, price, compare_at_price, category_id, featured, photos, variant_types, catalog_stock(combination, quantity)")
      .eq("workspace_id", workspaceId)
      .eq("visible", true)
      .order("position")
      .order("created_at"),
  ])

  const produtos = (prods ?? []).map((p) => {
    const estoque = Object.fromEntries(((p.catalog_stock as { combination: string; quantity: number }[]) ?? []).map((e) => [e.combination, e.quantity]))
    const fotos = (p.photos as string[]) ?? []
    return {
      id: p.id,
      nome: p.name,
      descricao: p.description,
      preco: Number(p.price),
      precoDe: p.compare_at_price === null ? null : Number(p.compare_at_price),
      fotoUrl: fotos[0] ? urlPublicaImagem(fotos[0]) : null,
      categoriaId: p.category_id,
      destaque: p.featured,
      esgotado: combinacoes((p.variant_types as TipoVariacao[]) ?? []).every((c) => (estoque[chaveCombinacao(c)] ?? 0) === 0),
    }
  })
  // Só categorias com algum produto visível aparecem na loja.
  const comProduto = new Set(produtos.map((p) => p.categoriaId))
  return { categorias: (cats ?? []).filter((c) => comProduto.has(c.id)).map((c) => ({ id: c.id, nome: c.name })), produtos }
}

/** Um produto visível da loja, com variações e estoque. */
export async function carregarProdutoPublico(workspaceId: string, produtoId: string): Promise<ProdutoDetalhe | null> {
  if (!/^[0-9a-f-]{36}$/i.test(produtoId)) return null
  const { data: p } = await createServiceClient()
    .from("catalog_products")
    .select("id, name, description, price, compare_at_price, photos, variant_types, catalog_stock(combination, quantity)")
    .eq("id", produtoId)
    .eq("workspace_id", workspaceId)
    .eq("visible", true)
    .maybeSingle()
  if (!p) return null
  return {
    id: p.id,
    nome: p.name,
    descricao: p.description,
    preco: Number(p.price),
    precoDe: p.compare_at_price === null ? null : Number(p.compare_at_price),
    fotos: ((p.photos as string[]) ?? []).map(urlPublicaImagem),
    tipos: (p.variant_types as TipoVariacao[]) ?? [],
    estoque: Object.fromEntries(((p.catalog_stock as { combination: string; quantity: number }[]) ?? []).map((e) => [e.combination, e.quantity])),
  }
}
