"use server"

// Catálogo no CRM (B16-05): produtos, fotos e categorias. Toda escrita confere sessão e
// papel aqui no servidor (Admin e Gerente); o RLS do banco repete a regra.

import { randomUUID } from "node:crypto"
import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import type { CategoriaCatalogo, ProdutoResumo } from "./components/lista-produtos"
import type { FotoProduto, ProdutoEditavel } from "./components/editor-produto"
import { BUCKET_CATALOGO, ESTOQUE_MAXIMO, FORMATOS_FOTO, MAX_FOTOS, MAX_OPCOES_POR_TIPO, TAMANHO_MAX_FOTO } from "@/lib/catalogo/regras"
import { chaveCombinacao, combinacoes, MAX_TIPOS_VARIACAO, type TipoVariacao } from "@/lib/catalogo/combinacoes"

export interface Catalogo {
  categorias: CategoriaCatalogo[]
  produtos: ProdutoResumo[]
}

type Resultado<T = object> = ({ erro?: undefined } & T) | { erro: string }

function urlPublica(caminho: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_CATALOGO}/${caminho}`
}

function fotoDoCaminho(caminho: string): FotoProduto {
  return { id: caminho, url: urlPublica(caminho) }
}

/** Sessão de Admin ou Gerente; senão, o erro para devolver. */
async function exigirGestor() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { ok: false as const, erro: "Sessão expirada. Entre de novo." }
  if (perfil.role !== "admin" && perfil.role !== "gerente") return { ok: false as const, erro: "Só Admin e Gerente mexem no catálogo." }
  return { ok: true as const, supabase, perfil }
}

export async function listarCatalogo(): Promise<Catalogo> {
  const s = await exigirGestor()
  if (!s.ok) return { categorias: [], produtos: [] }
  const { supabase, perfil } = s

  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from("catalog_categories").select("id, name").eq("workspace_id", perfil.workspace_id).order("position").order("created_at"),
    supabase
      .from("catalog_products")
      .select("id, name, category_id, price, visible, photos, catalog_stock(quantity)")
      .eq("workspace_id", perfil.workspace_id)
      .order("position")
      .order("created_at"),
  ])

  return {
    categorias: (cats ?? []).map((c) => ({ id: c.id, nome: c.name })),
    produtos: (prods ?? []).map((p) => ({
      id: p.id,
      nome: p.name,
      categoriaId: p.category_id,
      preco: Number(p.price),
      // As combinações que saíram da grade são apagadas ao salvar: somar todas as linhas basta.
      estoqueTotal: ((p.catalog_stock as { quantity: number }[] | null) ?? []).reduce((s, e) => s + e.quantity, 0),
      visivel: p.visible,
      fotoUrl: Array.isArray(p.photos) && p.photos[0] ? urlPublica(p.photos[0] as string) : null,
    })),
  }
}

export async function carregarProduto(id: string): Promise<ProdutoEditavel | null> {
  const s = await exigirGestor()
  if (!s.ok) return null
  const { data } = await s.supabase
    .from("catalog_products")
    .select("id, name, description, price, compare_at_price, sku, category_id, visible, featured, photos, variant_types, catalog_stock(combination, quantity)")
    .eq("id", id)
    .eq("workspace_id", s.perfil.workspace_id)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    nome: data.name,
    descricao: data.description,
    preco: Number(data.price),
    precoDe: data.compare_at_price === null ? null : Number(data.compare_at_price),
    codigo: data.sku,
    categoriaId: data.category_id,
    visivel: data.visible,
    destaque: data.featured,
    fotos: ((data.photos as string[]) ?? []).map(fotoDoCaminho),
    tipos: (data.variant_types as TipoVariacao[]) ?? [],
    estoque: Object.fromEntries(((data.catalog_stock as { combination: string; quantity: number }[] | null) ?? []).map((e) => [e.combination, e.quantity])),
  }
}

/** Confere tipos e estoque; devolve o erro ou o estoque só das combinações que existem. */
function validarVariacoes(tipos: TipoVariacao[], estoque: Record<string, number>): { erro: string } | { tipos: TipoVariacao[]; estoque: Record<string, number> } {
  if (tipos.length > MAX_TIPOS_VARIACAO) return { erro: `O produto aceita até ${MAX_TIPOS_VARIACAO} tipos de variação.` }
  const limpos: TipoVariacao[] = []
  for (const tipo of tipos) {
    const nome = tipo.nome.trim()
    if (!nome) return { erro: "Dê um nome a cada tipo de variação (ex.: Tamanho)." }
    const opcoes = tipo.opcoes.map((o) => o.trim()).filter(Boolean)
    if (opcoes.length > MAX_OPCOES_POR_TIPO) return { erro: `${nome}: até ${MAX_OPCOES_POR_TIPO} opções.` }
    if (new Set(opcoes.map((o) => o.toLowerCase())).size !== opcoes.length) return { erro: `${nome}: há opções repetidas.` }
    if (opcoes.some((o) => o.includes(" / "))) return { erro: `${nome}: a opção não pode ter " / ".` }
    limpos.push({ id: tipo.id, nome, opcoes })
  }
  const grade: Record<string, number> = {}
  for (const c of combinacoes(limpos)) {
    const chave = chaveCombinacao(c)
    const qtd = estoque[chave] ?? 0
    if (!Number.isInteger(qtd) || qtd < 0 || qtd > ESTOQUE_MAXIMO) return { erro: `Estoque de ${chave || "produto"}: use um número inteiro de 0 a ${ESTOQUE_MAXIMO.toLocaleString("pt-BR")}.` }
    grade[chave] = qtd
  }
  return { tipos: limpos, estoque: grade }
}

async function gravarEstoque(supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"], produtoId: string, tipos: TipoVariacao[], estoque: Record<string, number>) {
  const { error } = await supabase.rpc("salvar_estoque_produto", { p_produto: produtoId, p_tipos: tipos, p_estoque: estoque })
  return !error
}

/** URL assinada para o navegador mandar a foto direto ao armazenamento (sem passar pela Vercel). */
export async function prepararEnvioFoto(arquivo: { tipo: string; tamanho: number }): Promise<Resultado<{ caminho: string; token: string; url: string }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const extensao = FORMATOS_FOTO[arquivo.tipo]
  if (!extensao) return { erro: "Use fotos JPG, PNG ou WebP." }
  if (arquivo.tamanho > TAMANHO_MAX_FOTO) return { erro: "A foto passa de 5 MB." }

  const caminho = `${s.perfil.workspace_id}/produtos/${randomUUID()}.${extensao}`
  const { data, error } = await createServiceClient().storage.from(BUCKET_CATALOGO).createSignedUploadUrl(caminho)
  if (error || !data) return { erro: "Não deu para preparar o envio da foto. Tente de novo." }
  return { caminho, token: data.token, url: urlPublica(caminho) }
}

async function categoriaDaEmpresa(supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"], workspaceId: string, categoriaId: string | null) {
  if (!categoriaId) return true
  const { data } = await supabase.from("catalog_categories").select("id").eq("id", categoriaId).eq("workspace_id", workspaceId).maybeSingle()
  return !!data
}

async function proximaPosicao(supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"], workspaceId: string, categoriaId: string | null) {
  let q = supabase.from("catalog_products").select("position").eq("workspace_id", workspaceId).order("position", { ascending: false }).limit(1)
  q = categoriaId ? q.eq("category_id", categoriaId) : q.is("category_id", null)
  const { data } = await q
  return (data?.[0]?.position ?? -1) + 1
}

export async function salvarProduto(produto: ProdutoEditavel): Promise<Resultado<{ id: string }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { supabase, perfil } = s

  const nome = produto.nome.trim()
  if (!nome) return { erro: "Dê um nome ao produto." }
  if (nome.length > 120) return { erro: "O nome passa de 120 caracteres." }
  if (produto.preco === null || !(produto.preco > 0)) return { erro: "Informe um preço maior que zero." }
  if (produto.precoDe !== null && !(produto.precoDe > produto.preco)) return { erro: "O preço \"de\" precisa ser maior que o preço." }
  const caminhos = produto.fotos.map((f) => f.id)
  if (caminhos.length > MAX_FOTOS) return { erro: `O produto aceita até ${MAX_FOTOS} fotos.` }
  if (caminhos.some((c) => !c.startsWith(`${perfil.workspace_id}/produtos/`))) return { erro: "Foto inválida. Envie de novo." }
  if (!(await categoriaDaEmpresa(supabase, perfil.workspace_id, produto.categoriaId))) return { erro: "Categoria não encontrada." }
  const variacoes = validarVariacoes(produto.tipos, produto.estoque)
  if ("erro" in variacoes) return { erro: variacoes.erro }

  const campos = {
    name: nome,
    description: produto.descricao.trim(),
    price: produto.preco,
    compare_at_price: produto.precoDe,
    sku: produto.codigo.trim(),
    category_id: produto.categoriaId,
    visible: produto.visivel,
    featured: produto.destaque,
    photos: caminhos,
    updated_at: new Date().toISOString(),
  }

  if (!produto.id) {
    const { data, error } = await supabase
      .from("catalog_products")
      .insert({ ...campos, workspace_id: perfil.workspace_id, position: await proximaPosicao(supabase, perfil.workspace_id, produto.categoriaId) })
      .select("id")
      .single()
    if (error || !data) return { erro: "Não deu para salvar o produto. Tente de novo." }
    if (!(await gravarEstoque(supabase, data.id, variacoes.tipos, variacoes.estoque))) return { erro: "O produto foi salvo, mas o estoque não. Abra e salve de novo." }
    return { id: data.id }
  }

  const { data: antes } = await supabase
    .from("catalog_products")
    .select("category_id, photos")
    .eq("id", produto.id)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  if (!antes) return { erro: "Produto não encontrado." }

  const mudouCategoria = antes.category_id !== produto.categoriaId
  const { error } = await supabase
    .from("catalog_products")
    .update(mudouCategoria ? { ...campos, position: await proximaPosicao(supabase, perfil.workspace_id, produto.categoriaId) } : campos)
    .eq("id", produto.id)
    .eq("workspace_id", perfil.workspace_id)
  if (error) return { erro: "Não deu para salvar o produto. Tente de novo." }
  if (!(await gravarEstoque(supabase, produto.id, variacoes.tipos, variacoes.estoque))) return { erro: "Não deu para salvar o estoque. Tente de novo." }

  const removidas = ((antes.photos as string[]) ?? []).filter((c) => !caminhos.includes(c))
  if (removidas.length) await createServiceClient().storage.from(BUCKET_CATALOGO).remove(removidas).catch(() => {})
  return { id: produto.id }
}

export async function excluirProduto(id: string): Promise<Resultado> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { data } = await s.supabase
    .from("catalog_products")
    .delete()
    .eq("id", id)
    .eq("workspace_id", s.perfil.workspace_id)
    .select("photos")
    .maybeSingle()
  if (!data) return { erro: "Produto não encontrado." }
  const fotos = (data.photos as string[]) ?? []
  if (fotos.length) await createServiceClient().storage.from(BUCKET_CATALOGO).remove(fotos).catch(() => {})
  return {}
}

export async function alternarVisivel(id: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { data } = await s.supabase.from("catalog_products").select("visible").eq("id", id).eq("workspace_id", s.perfil.workspace_id).maybeSingle()
  if (!data) return { erro: "Produto não encontrado." }
  const { error } = await s.supabase.from("catalog_products").update({ visible: !data.visible }).eq("id", id).eq("workspace_id", s.perfil.workspace_id)
  if (error) return { erro: "Não deu para mudar a visibilidade." }
  return { catalogo: await listarCatalogo() }
}

/** Move `idArrastado` para o lugar de `idAlvo` e regrava as posições. */
function reordenar<T extends { id: string }>(lista: T[], idArrastado: string, idAlvo: string): T[] | null {
  const de = lista.findIndex((x) => x.id === idArrastado)
  const para = lista.findIndex((x) => x.id === idAlvo)
  if (de < 0 || para < 0) return null
  const copia = [...lista]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}

export async function reordenarProduto(idArrastado: string, idAlvo: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { supabase, perfil } = s
  const { data: par } = await supabase.from("catalog_products").select("id, category_id").in("id", [idArrastado, idAlvo]).eq("workspace_id", perfil.workspace_id)
  if (!par || par.length !== 2 || par[0].category_id !== par[1].category_id) return { erro: "Só dá para reordenar dentro da mesma categoria." }
  const categoriaId = par[0].category_id
  let q = supabase.from("catalog_products").select("id").eq("workspace_id", perfil.workspace_id).order("position").order("created_at")
  q = categoriaId ? q.eq("category_id", categoriaId) : q.is("category_id", null)
  const { data: lista } = await q
  const nova = reordenar(lista ?? [], idArrastado, idAlvo)
  if (!nova) return { erro: "Produto não encontrado." }
  await Promise.all(nova.map((p, i) => supabase.from("catalog_products").update({ position: i }).eq("id", p.id).eq("workspace_id", perfil.workspace_id)))
  return { catalogo: await listarCatalogo() }
}

function nomeCategoriaValido(nome: string): string | null {
  const limpo = nome.trim()
  if (!limpo) return "Dê um nome à categoria."
  if (limpo.length > 60) return "O nome passa de 60 caracteres."
  return null
}

export async function criarCategoria(nome: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const problema = nomeCategoriaValido(nome)
  if (problema) return { erro: problema }
  const { data: ultima } = await s.supabase.from("catalog_categories").select("position").eq("workspace_id", s.perfil.workspace_id).order("position", { ascending: false }).limit(1)
  const { error } = await s.supabase
    .from("catalog_categories")
    .insert({ workspace_id: s.perfil.workspace_id, name: nome.trim(), position: (ultima?.[0]?.position ?? -1) + 1 })
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não deu para criar a categoria." }
  return { catalogo: await listarCatalogo() }
}

export async function renomearCategoria(id: string, nome: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const problema = nomeCategoriaValido(nome)
  if (problema) return { erro: problema }
  const { error, data } = await s.supabase.from("catalog_categories").update({ name: nome.trim() }).eq("id", id).eq("workspace_id", s.perfil.workspace_id).select("id")
  if (error) return { erro: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não deu para renomear." }
  if (!data?.length) return { erro: "Categoria não encontrada." }
  return { catalogo: await listarCatalogo() }
}

/** Os produtos da categoria vão para "Sem categoria" (o banco faz isso com on delete set null). */
export async function excluirCategoria(id: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { error, data } = await s.supabase.from("catalog_categories").delete().eq("id", id).eq("workspace_id", s.perfil.workspace_id).select("id")
  if (error) return { erro: "Não deu para excluir a categoria." }
  if (!data?.length) return { erro: "Categoria não encontrada." }
  return { catalogo: await listarCatalogo() }
}

export async function reordenarCategoria(idArrastado: string, idAlvo: string): Promise<Resultado<{ catalogo: Catalogo }>> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { data: lista } = await s.supabase.from("catalog_categories").select("id").eq("workspace_id", s.perfil.workspace_id).order("position").order("created_at")
  const nova = reordenar(lista ?? [], idArrastado, idAlvo)
  if (!nova) return { erro: "Categoria não encontrada." }
  await Promise.all(nova.map((c, i) => s.supabase.from("catalog_categories").update({ position: i }).eq("id", c.id).eq("workspace_id", s.perfil.workspace_id)))
  return { catalogo: await listarCatalogo() }
}
