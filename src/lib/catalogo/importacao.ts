// Importação de produtos por planilha (B18), só no servidor: lê o arquivo e compara a
// planilha com o catálogo da empresa para montar a prévia.

import { randomUUID } from "node:crypto"
import * as XLSX from "xlsx"
import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizarTexto, type ErroPlanilha, type ProdutoPlanilha } from "./planilha"
import { chaveCombinacao, type TipoVariacao } from "./combinacoes"
import { createServiceClient } from "@/integrations/supabase/service"
import { baixarFoto } from "./baixar-foto"
import { BUCKET_CATALOGO } from "./regras"

const formatarPreco = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** Matriz de células da primeira aba. CSV é lido como texto (sem converter números à moda americana). */
export function lerArquivoPlanilha(nome: string, bytes: ArrayBuffer): unknown[][] {
  const csv = nome.toLowerCase().endsWith(".csv")
  const livro = csv
    ? XLSX.read(new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, ""), { type: "string", raw: true })
    : XLSX.read(new Uint8Array(bytes), { type: "array" })
  const aba = livro.Sheets[livro.SheetNames[0]]
  if (!aba) return []
  return XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true, defval: null, blankrows: true })
}

export interface ProdutoExistente {
  id: string
  codigo: string
  nome: string
  preco: number
  precoDe: number | null
  descricao: string
  categoriaId: string | null
  visivel: boolean
  tipos: TipoVariacao[]
  estoque: Record<string, number>
  totalFotos: number
  /** Caminhos das fotos no armazenamento, na ordem. */
  fotos: string[]
}

export interface ItemPrevia {
  codigo: string
  nome: string
  situacao: "novo" | "atualiza"
  combinacoes: number
  estoqueTotal: number
  fotos: number
  /** O que muda num produto existente (ex.: "Preço R$ 79,90 → R$ 89,90"). */
  mudancas: string[]
}

export interface PreviaImportacao {
  itens: ItemPrevia[]
  novos: number
  atualizados: number
  /** Produtos (códigos) com erro; linhas sem código contam uma vez cada. */
  comErro: number
  erros: ErroPlanilha[]
}

/** Produtos da empresa com estes códigos, agrupados pelo código normalizado. */
export async function buscarExistentes(supabase: SupabaseClient, workspaceId: string, codigos: string[]) {
  const porCodigo = new Map<string, ProdutoExistente[]>()
  if (codigos.length === 0) return porCodigo
  const { data } = await supabase
    .from("catalog_products")
    .select("id, sku, name, price, compare_at_price, description, category_id, visible, photos, variant_types, catalog_stock(combination, quantity)")
    .eq("workspace_id", workspaceId)
    .in("sku", codigos)
  for (const p of data ?? []) {
    const existente: ProdutoExistente = {
      id: p.id,
      codigo: p.sku,
      nome: p.name,
      preco: Number(p.price),
      precoDe: p.compare_at_price === null ? null : Number(p.compare_at_price),
      descricao: p.description ?? "",
      categoriaId: p.category_id,
      visivel: p.visible,
      tipos: (p.variant_types as TipoVariacao[] | null) ?? [],
      estoque: Object.fromEntries(((p.catalog_stock as { combination: string; quantity: number }[] | null) ?? []).map((e) => [e.combination, e.quantity])),
      totalFotos: ((p.photos as unknown[] | null) ?? []).length,
      fotos: (p.photos as string[] | null) ?? [],
    }
    const chave = normalizarTexto(p.sku)
    porCodigo.set(chave, [...(porCodigo.get(chave) ?? []), existente])
  }
  return porCodigo
}

/** Os nomes das variações da planilha batem com os do produto (mesma ordem, sem diferenciar acento). */
export function variacoesBatem(planilha: ProdutoPlanilha, existente: ProdutoExistente): boolean {
  const deles = existente.tipos.filter((t) => t.opcoes.length > 0).map((t) => normalizarTexto(t.nome))
  const nossos = planilha.tipos.map((t) => normalizarTexto(t.nome))
  return deles.length === nossos.length && deles.every((n, i) => n === nossos[i])
}

/** Chave da combinação do produto existente que corresponde à da planilha (sem diferenciar acento). */
export function chaveExistente(existente: ProdutoExistente, chave: string): string | null {
  return Object.keys(existente.estoque).find((k) => normalizarTexto(k) === normalizarTexto(chave)) ?? null
}

export async function montarPrevia(supabase: SupabaseClient, workspaceId: string, produtos: ProdutoPlanilha[], errosDaPlanilha: ErroPlanilha[]): Promise<PreviaImportacao> {
  const [existentes, { data: cats }] = await Promise.all([
    buscarExistentes(supabase, workspaceId, produtos.map((p) => p.codigo)),
    supabase.from("catalog_categories").select("id, name").eq("workspace_id", workspaceId),
  ])
  const nomeCategoria = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]))
  const erros = [...errosDaPlanilha]
  const itens: ItemPrevia[] = []

  for (const p of produtos) {
    const iguais = existentes.get(normalizarTexto(p.codigo)) ?? []
    const combinacoes = Object.keys(p.estoque).length
    const fotos = p.fotos?.length ?? 0
    if (iguais.length > 1) {
      erros.push({ linhas: p.linhas, codigo: p.codigo, texto: `${p.codigo}: há ${iguais.length} produtos com esse código no catálogo. Dê códigos diferentes a eles no CRM.` })
      continue
    }
    if (iguais.length === 0) {
      itens.push({ codigo: p.codigo, nome: p.nome, situacao: "novo", combinacoes, estoqueTotal: Object.values(p.estoque).reduce<number>((s, q) => s + (q ?? 0), 0), fotos, mudancas: [] })
      continue
    }
    const e = iguais[0]
    if (!variacoesBatem(p, e)) {
      const deles = e.tipos.filter((t) => t.opcoes.length > 0).map((t) => t.nome).join(" e ") || "sem variação"
      erros.push({ linhas: p.linhas, codigo: p.codigo, texto: `${p.codigo}: as variações não batem com as do produto (${deles}). Edite o produto no CRM.` })
      continue
    }

    const precoDeFinal = p.precoDe ?? e.precoDe
    if (precoDeFinal !== null && precoDeFinal <= p.preco) {
      erros.push({ linhas: p.linhas, codigo: p.codigo, texto: `${p.codigo}: o "Preço de" (${formatarPreco(precoDeFinal)}) precisa ser maior que o preço novo (${formatarPreco(p.preco)}). Informe outro "Preço de" na planilha.` })
      continue
    }

    const mudancas: string[] = []
    if (p.nome !== e.nome) mudancas.push(`Nome "${e.nome}" → "${p.nome}"`)
    if (p.preco !== e.preco) mudancas.push(`Preço ${formatarPreco(e.preco)} → ${formatarPreco(p.preco)}`)
    if (p.precoDe !== null && p.precoDe !== e.precoDe) mudancas.push(`Preço de ${e.precoDe === null ? "—" : formatarPreco(e.precoDe)} → ${formatarPreco(p.precoDe)}`)
    if (p.categoria !== null) {
      const atual = e.categoriaId ? nomeCategoria.get(e.categoriaId) ?? null : null
      if (!atual || normalizarTexto(atual) !== normalizarTexto(p.categoria)) mudancas.push(`Categoria ${atual ?? "Sem categoria"} → ${p.categoria}`)
    }
    if (p.descricao !== null && p.descricao !== e.descricao) mudancas.push("Descrição muda")
    if (p.visivel !== null && p.visivel !== e.visivel) mudancas.push(p.visivel ? "Passa a aparecer na loja" : "Sai da loja (oculto)")

    let estoqueDepois = 0
    let novasCombinacoes = 0
    const estoqueAntes = Object.values(e.estoque).reduce((s, q) => s + q, 0)
    const usadas = new Set<string>()
    for (const [chave, q] of Object.entries(p.estoque)) {
      const k = chaveExistente(e, chave)
      if (k === null) novasCombinacoes++
      else usadas.add(k)
      estoqueDepois += q ?? (k === null ? 0 : e.estoque[k])
    }
    for (const [k, q] of Object.entries(e.estoque)) if (!usadas.has(k)) estoqueDepois += q
    if (estoqueDepois !== estoqueAntes) mudancas.push(`Estoque ${estoqueAntes} → ${estoqueDepois}`)
    if (novasCombinacoes > 0) mudancas.push(`${novasCombinacoes} ${novasCombinacoes === 1 ? "combinação nova" : "combinações novas"}`)
    if (p.fotos !== null) mudancas.push(`Fotos substituídas (${fotos})`)

    itens.push({ codigo: p.codigo, nome: p.nome, situacao: "atualiza", combinacoes: Object.keys(e.estoque).length + novasCombinacoes, estoqueTotal: estoqueDepois, fotos: p.fotos === null ? e.totalFotos : fotos, mudancas })
  }

  const comErro = new Set(erros.map((x) => x.codigo ?? `linha-${x.linhas[0]}`)).size
  return {
    itens,
    novos: itens.filter((i) => i.situacao === "novo").length,
    atualizados: itens.filter((i) => i.situacao === "atualiza").length,
    comErro,
    erros,
  }
}

export interface ResultadoGravacao {
  novos: number
  atualizados: number
  falhas: { codigo: string; texto: string }[]
  /** Fotos que não deu para baixar (o produto entrou sem elas). */
  avisos: { codigo: string; texto: string }[]
}

/** Baixa e guarda as fotos dos links, na ordem. Devolve os caminhos guardados e um aviso por link que falhou. */
async function guardarFotos(workspaceId: string, codigo: string, links: string[]) {
  const armazenamento = createServiceClient().storage.from(BUCKET_CATALOGO)
  const baixadas = await Promise.all(links.map((l) => baixarFoto(l)))
  const caminhos: string[] = []
  const avisos: { codigo: string; texto: string }[] = []
  for (const [i, foto] of baixadas.entries()) {
    if (!foto.ok) {
      avisos.push({ codigo, texto: `a foto ${i + 1} ${foto.motivo}.` })
      continue
    }
    const caminho = `${workspaceId}/produtos/${randomUUID()}.${foto.extensao}`
    const { error } = await armazenamento.upload(caminho, foto.bytes, { contentType: foto.tipo })
    if (error) avisos.push({ codigo, texto: `a foto ${i + 1} não pôde ser guardada.` })
    else caminhos.push(caminho)
  }
  return { caminhos, avisos }
}

/** Categoria de cada nome da planilha (sem diferenciar maiúscula e acento); cria as que faltam. */
async function resolverCategorias(supabase: SupabaseClient, workspaceId: string, nomes: string[]) {
  const { data } = await supabase.from("catalog_categories").select("id, name, position").eq("workspace_id", workspaceId)
  const porNome = new Map((data ?? []).map((c) => [normalizarTexto(c.name), c.id as string]))
  let posicao = Math.max(-1, ...(data ?? []).map((c) => c.position as number)) + 1
  for (const nome of nomes) {
    const chave = normalizarTexto(nome)
    if (porNome.has(chave)) continue
    const { data: nova } = await supabase.from("catalog_categories").insert({ workspace_id: workspaceId, name: nome, position: posicao++ }).select("id").single()
    if (nova) porNome.set(chave, nova.id)
  }
  return porNome
}

/** Junta as variações da planilha às do produto: opções novas entram no fim, com a grafia da planilha. */
function juntarTipos(planilha: ProdutoPlanilha, existente: ProdutoExistente | null): TipoVariacao[] {
  const base: TipoVariacao[] = existente
    ? existente.tipos.filter((t) => t.opcoes.length > 0).map((t) => ({ ...t, opcoes: [...t.opcoes] }))
    : planilha.tipos.map((t) => ({ id: randomUUID(), nome: t.nome, opcoes: [] }))
  planilha.tipos.forEach((t, i) => {
    for (const o of t.opcoes) {
      if (!base[i].opcoes.some((x) => normalizarTexto(x) === normalizarTexto(o))) base[i].opcoes.push(o)
    }
  })
  return base
}

/** Grava os produtos já conferidos. Cada um entra inteiro (função do banco) ou vira falha. */
export async function gravarImportacao(supabase: SupabaseClient, workspaceId: string, produtos: ProdutoPlanilha[]): Promise<ResultadoGravacao> {
  const resultado: ResultadoGravacao = { novos: 0, atualizados: 0, falhas: [], avisos: [] }
  if (produtos.length === 0) return resultado
  const existentes = await buscarExistentes(supabase, workspaceId, produtos.map((p) => p.codigo))
  const categorias = await resolverCategorias(supabase, workspaceId, [...new Set(produtos.map((p) => p.categoria).filter((c): c is string => !!c))])

  for (const p of produtos) {
    const iguais = existentes.get(normalizarTexto(p.codigo)) ?? []
    const e = iguais[0] ?? null
    if (iguais.length > 1 || (e && !variacoesBatem(p, e))) {
      resultado.falhas.push({ codigo: p.codigo, texto: "O produto mudou no catálogo depois da prévia. Envie a planilha de novo." })
      continue
    }
    const tipos = juntarTipos(p, e)
    // Grafia final de cada opção (a do produto, quando já existe).
    const grafia = (i: number, o: string) => tipos[i]?.opcoes.find((x) => normalizarTexto(x) === normalizarTexto(o)) ?? o
    const estoque: Record<string, number> = {}
    for (const [chave, q] of Object.entries(p.estoque)) {
      const final = tipos.length === 0 ? "" : chaveCombinacao(chave.split(" / ").map((o, i) => grafia(i, o)))
      const jaTem = e !== null && chaveExistente(e, final) !== null
      if (q === null && jaTem) continue // vazio na planilha: mantém o estoque atual
      estoque[jaTem ? chaveExistente(e!, final)! : final] = q ?? 0
    }
    // Fotos: só quando a coluna veio preenchida. Se nenhuma baixar, o produto existente mantém as dele.
    let fotos: string[] | null = null
    if (p.fotos !== null && p.fotos.length > 0) {
      const g = await guardarFotos(workspaceId, p.codigo, p.fotos)
      resultado.avisos.push(...g.avisos)
      if (g.caminhos.length > 0 || !e) fotos = g.caminhos
    }
    const dados = {
      ...(fotos !== null ? { photos: fotos } : {}),
      sku: p.codigo,
      name: p.nome,
      price: p.preco,
      compare_at_price: p.precoDe ?? e?.precoDe ?? null,
      description: p.descricao ?? e?.descricao ?? "",
      category_id: p.categoria ? categorias.get(normalizarTexto(p.categoria)) ?? null : e?.categoriaId ?? null,
      visible: p.visivel ?? e?.visivel ?? true,
      variant_types: tipos,
    }
    const { error } = await supabase.rpc("importar_produto_catalogo", { p_produto: e?.id ?? null, p_dados: dados, p_estoque: estoque })
    const armazenamento = createServiceClient().storage.from(BUCKET_CATALOGO)
    if (error) {
      if (fotos?.length) await armazenamento.remove(fotos).catch(() => {})
      resultado.falhas.push({ codigo: p.codigo, texto: "Não deu para gravar este produto. Tente de novo." })
      continue
    }
    // Fotos substituídas saem do armazenamento, como no editor.
    if (e && fotos !== null) {
      const antigas = e.fotos.filter((c) => !fotos.includes(c))
      if (antigas.length) await armazenamento.remove(antigas).catch(() => {})
    }
    if (e) resultado.atualizados++
    else resultado.novos++
  }
  return resultado
}
