"use server"

// Pedidos do catálogo no CRM (B16-10). Todos os papéis da empresa veem e mudam a situação;
// a leitura passa pelo RLS e a mudança pela função do banco, que confere a empresa.

import { sessaoAtual } from "@/lib/sessao"
import { urlPublicaImagem } from "@/lib/catalogo/loja-publica"
import type { PedidoResumo } from "../components/lista-pedidos"
import type { PedidoDetalhe } from "../components/detalhe-pedido"
import type { SituacaoPedido } from "../components/situacao-pedido"
import { listarAtendentesAtivos } from "@/app/(auth)/contatos/actions"
import type { Database } from "@/integrations/supabase/types"
import { esquemaFiltrosPedidos, FILTROS_PADRAO, type FiltrosPedidos } from "@/lib/catalogo/filtros-pedidos"
import type { ItemExportado } from "@/lib/catalogo/exportar-pedidos"

const LIMITE_LISTA = 500

interface LinhaPedido {
  id: string
  number: number
  created_at: string
  customer_name: string
  customer_whatsapp: string
  pieces: number
  total: number
  discount: number
  discount_percent: number
  status: string
}

function paraResumo(p: LinhaPedido): PedidoResumo {
  return {
    id: p.id,
    numero: p.number,
    criadoEm: p.created_at,
    cliente: { nome: p.customer_name, whatsapp: p.customer_whatsapp },
    pecas: p.pieces,
    total: Number(p.total),
    desconto: Number(p.discount) > 0 ? { percent: Number(p.discount_percent), valor: Number(p.discount) } : null,
    situacao: p.status as SituacaoPedido,
  }
}

const COLUNAS_RESUMO = "id, number, created_at, customer_name, customer_whatsapp, pieces, total, discount, discount_percent, status"

export async function listarPedidos(): Promise<PedidoResumo[]> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return []
  const { data } = await supabase
    .from("catalog_orders")
    .select(COLUNAS_RESUMO)
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTA)
  return ((data ?? []) as LinhaPedido[]).map(paraResumo)
}

type Funcoes = Database["public"]["Functions"]

/** B39-01: produto que aparece no filtro; o apagado vem só pelo nome. */
export type ProdutoDoFiltro = { id: string | null; nome: string; apagado: boolean }

/**
 * B39-01: uma página dos pedidos com os filtros aplicados no banco, sobre todos os
 * pedidos da empresa, e o total do resultado.
 */
export async function filtrarPedidos(
  filtros: FiltrosPedidos = FILTROS_PADRAO,
  offset = 0
): Promise<{ pedidos: PedidoResumo[]; total: number } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { pedidos: [], total: 0 }
  const validado = esquemaFiltrosPedidos.safeParse(filtros)
  if (!validado.success) return { erro: "Não foi possível aplicar os filtros." }

  const { data, error } = await supabase.rpc("filtrar_pedidos", {
    p_filtros: validado.data,
    p_limite: LIMITE_LISTA,
    p_offset: Math.max(0, offset),
  })
  if (error) return { erro: "Não foi possível aplicar os filtros." }
  const linhas = (data ?? []) as Funcoes["filtrar_pedidos"]["Returns"]
  return {
    pedidos: linhas.map((l) => paraResumo(l as unknown as LinhaPedido)),
    total: linhas.length > 0 ? Number(linhas[0].total_resultado) : offset,
  }
}

/**
 * B39-02: pedidos para exportar, com os itens. Com filtros, os mesmos da tela; sem
 * (null), todos os pedidos da empresa. Junta todas as páginas de `filtrar_pedidos`.
 */
export async function pedidosParaExportar(
  filtros: FiltrosPedidos | null
): Promise<{ pedidos: PedidoResumo[]; itens: ItemExportado[] } | { erro: string; status: number }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: "Sessão expirada.", status: 401 }
  const usados = filtros ?? { ...FILTROS_PADRAO, periodo: "tudo" as const }
  const validado = esquemaFiltrosPedidos.safeParse(usados)
  if (!validado.success) return { erro: "Período inválido.", status: 400 }

  const pedidos: PedidoResumo[] = []
  for (let pagina = 0; pagina < 200; pagina++) {
    const { data, error } = await supabase.rpc("filtrar_pedidos", {
      p_filtros: validado.data,
      p_limite: LIMITE_LISTA,
      p_offset: pagina * LIMITE_LISTA,
    })
    if (error) return { erro: "Não foi possível exportar.", status: 500 }
    const linhas = (data ?? []) as Funcoes["filtrar_pedidos"]["Returns"]
    pedidos.push(...linhas.map((l) => paraResumo(l as unknown as LinhaPedido)))
    if (linhas.length < LIMITE_LISTA) break
  }

  // Itens em lotes, para a lista de ids não estourar o tamanho do pedido ao banco.
  const porId = new Map(pedidos.map((p) => [p.id, p]))
  const itens: ItemExportado[] = []
  const ids = [...porId.keys()]
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from("catalog_order_items")
      .select("order_id, product_name, combination, quantity, unit_price, position")
      .in("order_id", ids.slice(i, i + 150))
    if (error) return { erro: "Não foi possível exportar.", status: 500 }
    for (const item of data ?? []) {
      const p = porId.get(item.order_id)!
      itens.push({
        numero: p.numero,
        criadoEm: p.criadoEm,
        cliente: p.cliente.nome,
        produto: item.product_name,
        variacao: item.combination ?? "",
        quantidade: item.quantity,
        precoUnitario: Number(item.unit_price),
        posicao: item.position,
      })
    }
  }
  // Na ordem da aba Pedidos, e dentro do pedido na ordem em que a cliente pôs no carrinho.
  const ordem = new Map(pedidos.map((p, i) => [p.numero, i]))
  itens.sort((a, b) => ordem.get(a.numero)! - ordem.get(b.numero)! || a.posicao - b.posicao)
  return { pedidos, itens }
}

/** B39-01: opções dos filtros de produto (com os apagados) e de atendente da cliente. */
export async function opcoesDosFiltros(): Promise<{ produtos: ProdutoDoFiltro[]; atendentes: Array<{ id: string; nome: string }> }> {
  const { supabase, perfil } = await sessaoAtual()
  if (!perfil) return { produtos: [], atendentes: [] }
  const [{ data: produtos }, atendentes] = await Promise.all([supabase.rpc("produtos_dos_pedidos"), listarAtendentesAtivos()])
  return {
    produtos: ((produtos ?? []) as Funcoes["produtos_dos_pedidos"]["Returns"]).map((p) => ({ id: p.id, nome: p.nome, apagado: p.apagado })),
    atendentes,
  }
}

export async function listarPedidosDoContato(contatoId: string): Promise<PedidoResumo[]> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return []
  const { data } = await supabase
    .from("catalog_orders")
    .select(COLUNAS_RESUMO)
    .eq("workspace_id", perfil.workspace_id)
    .eq("contact_id", contatoId)
    .order("created_at", { ascending: false })
  return ((data ?? []) as LinhaPedido[]).map(paraResumo)
}

/** Quantos pedidos Novos a empresa tem (contador do menu). */
export async function contarPedidosNovos(): Promise<number> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return 0
  const { count } = await supabase
    .from("catalog_orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "novo")
  return count ?? 0
}

export async function carregarPedido(id: string): Promise<PedidoDetalhe | null> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data: p } = await supabase
    .from("catalog_orders")
    .select(`${COLUNAS_RESUMO}, contact_id, catalog_order_items(product_id, product_name, combination, quantity, unit_price, photo_path, position), catalog_order_events(from_status, to_status, created_at, profiles(name))`)
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  if (!p) return null

  const itens = ((p.catalog_order_items as { product_id: string | null; product_name: string; combination: string; quantity: number; unit_price: number; photo_path: string | null; position: number }[]) ?? [])
    .sort((a, b) => a.position - b.position)

  // Estoque atual de cada item (o aviso de estoque insuficiente ao fechar).
  const produtos = [...new Set(itens.map((i) => i.product_id).filter((x): x is string => !!x))]
  const { data: estoques } = produtos.length
    ? await supabase.from("catalog_stock").select("product_id, combination, quantity").in("product_id", produtos)
    : { data: [] as { product_id: string; combination: string; quantity: number }[] }
  const estoqueDe = (produtoId: string | null, combinacao: string) =>
    produtoId === null ? null : (estoques ?? []).find((e) => e.product_id === produtoId && e.combination === combinacao)?.quantity ?? 0

  const { data: conversa } = p.contact_id
    ? await supabase.from("conversations").select("id").eq("contact_id", p.contact_id).order("last_message_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null }

  const eventos = ((p.catalog_order_events as unknown as { from_status: string | null; to_status: string; created_at: string; profiles: { name: string } | null }[]) ?? [])
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  return {
    ...paraResumo(p as LinhaPedido),
    itens: itens.map((i) => ({
      nome: i.product_name,
      variacao: i.combination,
      quantidade: i.quantity,
      precoUnitario: Number(i.unit_price),
      fotoUrl: i.photo_path ? urlPublicaImagem(i.photo_path) : null,
      estoqueAtual: estoqueDe(i.product_id, i.combination),
    })),
    historico: eventos.map((e) => ({
      de: (e.from_status as SituacaoPedido | null) ?? null,
      para: e.to_status as SituacaoPedido,
      por: e.profiles?.name ?? (e.from_status === null ? "Loja" : "—"),
      em: e.created_at,
    })),
    hrefContato: p.contact_id ? `/contatos/${p.contact_id}` : null,
    hrefConversa: conversa ? `/chat?conversa=${conversa.id}` : null,
  }
}

const ERROS_DA_FUNCAO: Record<string, string> = {
  "22023": "Essa mudança de situação não é permitida.",
  P0002: "Pedido não encontrado.",
  "42501": "Sessão expirada. Entre de novo.",
}

export async function mudarSituacaoPedido(id: string, para: SituacaoPedido): Promise<{ erro?: string; pedido?: PedidoDetalhe }> {
  const { supabase, user } = await sessaoAtual()
  if (!user) return { erro: "Sessão expirada. Entre de novo." }
  const { error } = await supabase.rpc("mudar_situacao_pedido_catalogo", { p_pedido: id, p_para: para })
  if (error) return { erro: ERROS_DA_FUNCAO[error.code ?? ""] ?? "Não deu para mudar a situação. Tente de novo." }
  return { pedido: (await carregarPedido(id)) ?? undefined }
}
