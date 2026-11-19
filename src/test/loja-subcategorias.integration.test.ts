// @vitest-environment node
// B61-03 — Subcategorias: criar, renomear, reordenar e apagar, a subcategoria do produto,
// o que a loja pública entrega e o isolamento entre empresas. Bate no Supabase real
// (banco de teste). Mockado só @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  carregarProduto,
  criarSubcategoria,
  excluirCategoria,
  excluirSubcategoria,
  listarCatalogo,
  prepararEnvioFotoCategoria,
  renomearSubcategoria,
  reordenarSubcategoria,
  salvarFotoCategoria,
  salvarProduto,
} from "@/app/(auth)/catalogo/actions"
import { carregarVitrine } from "@/lib/catalogo/loja-publica"
import type { ProdutoEditavel } from "@/app/(auth)/catalogo/components/editor-produto"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const email = `loja-sub-admin-${ts}@catalogo-test.com`

let ws = ""
let wsOutra = ""
let userId = ""
let logado: SupabaseClient

async function criarCategoria(empresa: string, nome: string) {
  const { data, error } = await service.from("catalog_categories").insert({ workspace_id: empresa, name: nome }).select("id").single()
  if (error) throw new Error(error.message)
  return data.id as string
}
/** Subcategoria gravada direto, para montar o cenário (as ações são o que se testa). */
async function montarSubcategoria(empresa: string, categoria: string, nome: string, posicao = 0) {
  const { data, error } = await service.from("catalog_subcategories").insert({ workspace_id: empresa, category_id: categoria, name: nome, position: posicao }).select("id").single()
  if (error) throw new Error(error.message)
  return data.id as string
}
async function montarProduto(empresa: string, nome: string, categoria: string | null, subcategoria: string | null, visivel = true) {
  const { data, error } = await service
    .from("catalog_products")
    .insert({ workspace_id: empresa, name: nome, price: 10, category_id: categoria, subcategory_id: subcategoria, visible: visivel })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}
async function subcategoriasNoBanco(categoria: string) {
  const { data } = await service.from("catalog_subcategories").select("id, name, workspace_id").eq("category_id", categoria).order("position").order("created_at")
  return data ?? []
}
async function produtoNoBanco(id: string) {
  const { data } = await service.from("catalog_products").select("category_id, subcategory_id").eq("id", id).single()
  return data
}
/** A subcategoria criada pela ação, pelo nome, dentro da categoria. */
async function criar(categoria: string, nome: string) {
  const r = await criarSubcategoria(categoria, nome)
  expect(r.erro, `criar ${nome}`).toBeUndefined()
  return (await subcategoriasNoBanco(categoria)).find((s) => s.name === nome)!.id as string
}
async function naLoja(nomeDaCategoria: string) {
  const { categorias } = await carregarVitrine(ws)
  return categorias.find((c) => c.nome === nomeDaCategoria)
}
function produto(parcial: Partial<ProdutoEditavel>): ProdutoEditavel {
  return { id: null, nome: "Produto", descricao: "", preco: 10, precoDe: null, codigo: "", faixas: [], minimo: null, grade: null, categoriaId: null, subcategoriaId: null, visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 3 }, ...parcial }
}

beforeAll(async () => {
  const { data: empresa } = await service.from("workspaces").insert({ name: `Loja Sub ${ts}` }).select().single()
  ws = empresa!.id
  const { data: outra } = await service.from("workspaces").insert({ name: `Loja Sub Outra ${ts}` }).select().single()
  wsOutra = outra!.id
  const { data: conta } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = conta.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "admin", role: "admin", status: "active" })

  logado = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const entrada = await logado.auth.signInWithPassword({ email, password: SENHA })
  if (entrada.error) throw new Error(entrada.error.message)
  mockSsr.mockResolvedValue(logado as never)
}, 60_000)

afterAll(async () => {
  for (const empresa of [ws, wsOutra]) {
    if (!empresa) continue
    await service.from("catalog_products").delete().eq("workspace_id", empresa)
    await service.from("catalog_categories").delete().eq("workspace_id", empresa)
  }
  if (userId) {
    await service.from("profiles").delete().eq("id", userId)
    await service.auth.admin.deleteUser(userId)
  }
  if (ws) await service.from("workspaces").delete().eq("id", ws)
  if (wsOutra) await service.from("workspaces").delete().eq("id", wsOutra)
})

describe("B61-03 — subcategorias no painel", { timeout: 60_000 }, () => {
  it("CA-B61-57: criar 'Manga curta' em 'Blusas' grava a subcategoria e o catálogo do painel e do editor passa a trazê-la", async () => {
    const blusas = await criarCategoria(ws, "Blusas 57")
    expect((await listarCatalogo()).categorias.find((c) => c.id === blusas)?.subcategorias).toEqual([])

    const r = await criarSubcategoria(blusas, "  Manga curta ")
    expect(r.erro).toBeUndefined()
    // O painel recebe o catálogo devolvido pela ação; o editor de produto lê o mesmo catálogo.
    const devolvida = "catalogo" in r ? r.catalogo.categorias.find((c) => c.id === blusas)?.subcategorias : undefined
    expect(devolvida?.map((s) => s.nome)).toEqual(["Manga curta"])
    expect((await listarCatalogo()).categorias.find((c) => c.id === blusas)?.subcategorias.map((s) => s.nome)).toEqual(["Manga curta"])

    const gravadas = await subcategoriasNoBanco(blusas)
    expect(gravadas).toHaveLength(1)
    expect(gravadas[0]).toMatchObject({ name: "Manga curta", workspace_id: ws })
  })

  it("CA-B61-58: nome repetido ou vazio na mesma categoria é recusado pelo servidor e nada é criado", async () => {
    const blusas = await criarCategoria(ws, "Blusas 58")
    await criar(blusas, "Manga curta")
    const outra = await criar(blusas, "Manga longa")

    for (const repetido of ["manga curta", "  MANGA CURTA  ", "Manga curta"]) {
      expect((await criarSubcategoria(blusas, repetido)).erro, repetido).toBe("Já existe uma subcategoria com esse nome.")
    }
    for (const vazio of ["", "   ", undefined as never]) {
      expect((await criarSubcategoria(blusas, vazio)).erro).toBe("Dê um nome à subcategoria.")
    }
    expect((await criarSubcategoria(blusas, "a".repeat(61))).erro).toBe("O nome passa de 60 caracteres.")
    // Renomear para um nome que já existe, ou para vazio, também é recusado.
    expect((await renomearSubcategoria(outra, "manga curta")).erro).toBe("Já existe uma subcategoria com esse nome.")
    expect((await renomearSubcategoria(outra, " ")).erro).toBe("Dê um nome à subcategoria.")

    expect((await subcategoriasNoBanco(blusas)).map((s) => s.name)).toEqual(["Manga curta", "Manga longa"])
  })

  it("CA-B61-59: o mesmo nome vale em categorias diferentes", async () => {
    const blusas = await criarCategoria(ws, "Blusas 59")
    const calcas = await criarCategoria(ws, "Calças 59")
    await criar(blusas, "Básicas")

    const r = await criarSubcategoria(calcas, "Básicas")
    expect(r.erro).toBeUndefined()
    expect((await subcategoriasNoBanco(calcas)).map((s) => s.name)).toEqual(["Básicas"])
    expect((await subcategoriasNoBanco(blusas)).map((s) => s.name)).toEqual(["Básicas"])
  })

  it("CA-B61-60: renomear e reordenar mudam os chips da loja pública para 'Manga longa' e 'Curta', nessa ordem", async () => {
    const blusas = await criarCategoria(ws, "Blusas 60")
    const curta = await criar(blusas, "Manga curta")
    const longa = await criar(blusas, "Manga longa")
    await montarProduto(ws, "Blusa curta 60", blusas, curta)
    await montarProduto(ws, "Blusa longa 60", blusas, longa)
    expect((await naLoja("Blusas 60"))?.subcategorias?.map((s) => s.nome)).toEqual(["Manga curta", "Manga longa"])

    expect((await renomearSubcategoria(curta, "Curta")).erro).toBeUndefined()
    // Arrastar "Curta" para o lugar de "Manga longa" a deixa depois dela.
    expect((await reordenarSubcategoria(curta, longa)).erro).toBeUndefined()

    expect((await naLoja("Blusas 60"))?.subcategorias?.map((s) => s.nome)).toEqual(["Manga longa", "Curta"])
    expect((await listarCatalogo()).categorias.find((c) => c.id === blusas)?.subcategorias.map((s) => s.nome)).toEqual(["Manga longa", "Curta"])
  })

  it("CA-B61-61: apagar a subcategoria mantém os 3 produtos dela em 'Blusas', sem subcategoria", async () => {
    const blusas = await criarCategoria(ws, "Blusas 61")
    const curta = await criar(blusas, "Manga curta")
    const produtos = [await montarProduto(ws, "Blusa 61 A", blusas, curta), await montarProduto(ws, "Blusa 61 B", blusas, curta), await montarProduto(ws, "Blusa 61 C", blusas, curta)]
    // O painel conta os produtos da subcategoria pelo catálogo (é o número do aviso de apagar).
    const antes = await listarCatalogo()
    expect(antes.produtos.filter((p) => p.subcategoriaId === curta)).toHaveLength(3)

    const r = await excluirSubcategoria(curta)
    expect(r.erro).toBeUndefined()

    expect(await subcategoriasNoBanco(blusas)).toEqual([])
    for (const id of produtos) expect(await produtoNoBanco(id)).toEqual({ category_id: blusas, subcategory_id: null })
  })

  it("CA-B61-62: apagar a categoria apaga as subcategorias dela e os 5 produtos ficam sem categoria e sem subcategoria", async () => {
    const blusas = await criarCategoria(ws, "Blusas 62")
    const curta = await criar(blusas, "Manga curta")
    const longa = await criar(blusas, "Manga longa")
    const produtos = [
      await montarProduto(ws, "Blusa 62 A", blusas, curta),
      await montarProduto(ws, "Blusa 62 B", blusas, curta),
      await montarProduto(ws, "Blusa 62 C", blusas, longa),
      await montarProduto(ws, "Blusa 62 D", blusas, null),
      await montarProduto(ws, "Blusa 62 E", blusas, null),
    ]
    expect(await subcategoriasNoBanco(blusas)).toHaveLength(2)
    expect((await produtoNoBanco(produtos[0]))?.subcategory_id).toBe(curta)

    const r = await excluirCategoria(blusas)
    expect(r.erro).toBeUndefined()

    expect((await service.from("catalog_categories").select("id").eq("id", blusas)).data).toEqual([])
    expect((await service.from("catalog_subcategories").select("id").in("id", [curta, longa])).data).toEqual([])
    for (const id of produtos) expect(await produtoNoBanco(id)).toEqual({ category_id: null, subcategory_id: null })
  })
})

describe("B61-03 — subcategoria do produto e loja pública", { timeout: 60_000 }, () => {
  it("CA-B61-64: o servidor recusa subcategoria que não é da categoria do produto; salvo em 'Calças', o produto fica sem subcategoria", async () => {
    const blusas = await criarCategoria(ws, "Blusas 64")
    const calcas = await criarCategoria(ws, "Calças 64")
    const curta = await criar(blusas, "Manga curta")
    const criado = await salvarProduto(produto({ nome: "Blusa 64", categoriaId: blusas, subcategoriaId: curta }))
    expect(criado.erro).toBeUndefined()
    const id = (criado as { id: string }).id
    expect(await produtoNoBanco(id)).toEqual({ category_id: blusas, subcategory_id: curta })
    expect((await carregarProduto(id))?.subcategoriaId).toBe(curta)

    // Subcategoria de "Blusas" em produto de "Calças", ou em produto sem categoria: recusado, nada muda.
    expect((await salvarProduto(produto({ id, nome: "Blusa 64", categoriaId: calcas, subcategoriaId: curta }))).erro).toBe("Subcategoria não encontrada.")
    expect((await salvarProduto(produto({ id, nome: "Blusa 64", categoriaId: null, subcategoriaId: curta }))).erro).toBe("Subcategoria não encontrada.")
    expect((await salvarProduto(produto({ id, nome: "Blusa 64", categoriaId: blusas, subcategoriaId: "00000000-0000-0000-0000-000000000000" }))).erro).toBe("Subcategoria não encontrada.")
    expect(await produtoNoBanco(id)).toEqual({ category_id: blusas, subcategory_id: curta })

    // O editor manda a categoria nova sem subcategoria.
    expect((await salvarProduto(produto({ id, nome: "Blusa 64", categoriaId: calcas, subcategoriaId: null }))).erro).toBeUndefined()
    expect(await produtoNoBanco(id)).toEqual({ category_id: calcas, subcategory_id: null })

    // O banco repete a regra para quem troca a categoria por outro caminho.
    const outro = await montarProduto(ws, "Blusa 64 B", blusas, curta)
    await service.from("catalog_products").update({ category_id: calcas }).eq("id", outro)
    expect(await produtoNoBanco(outro)).toEqual({ category_id: calcas, subcategory_id: null })
  })

  it("CA-B61-15: a loja pública entrega as subcategorias com produto visível, na ordem do lojista, e a subcategoria de cada produto", async () => {
    const blusas = await criarCategoria(ws, "Blusas 15")
    const curta = await criar(blusas, "Manga curta")
    const longa = await criar(blusas, "Manga longa")
    const regata = await criar(blusas, "Regata")
    await montarProduto(ws, "Blusa curta 15", blusas, curta)
    await montarProduto(ws, "Blusa longa 15", blusas, longa)
    await montarProduto(ws, "Blusa direta 15", blusas, null)
    // "Regata" existe, mas o único produto dela está oculto.
    await montarProduto(ws, "Regata oculta 15", blusas, regata, false)
    expect((await subcategoriasNoBanco(blusas)).map((s) => s.name)).toEqual(["Manga curta", "Manga longa", "Regata"])

    const { categorias, produtos } = await carregarVitrine(ws)
    const categoria = categorias.find((c) => c.nome === "Blusas 15")
    expect(categoria?.subcategorias).toEqual([{ id: curta, nome: "Manga curta" }, { id: longa, nome: "Manga longa" }])
    const daCategoria = produtos.filter((p) => p.categoriaId === blusas)
    expect(daCategoria.map((p) => [p.nome, p.subcategoriaId]).sort()).toEqual([["Blusa curta 15", curta], ["Blusa direta 15", null], ["Blusa longa 15", longa]])
  })
})

describe("B61-03 — isolamento entre empresas", { timeout: 60_000 }, () => {
  it("CA-B61-66: uma empresa não vê nem mexe nas subcategorias e fotos de categoria de outra", async () => {
    const fotoMinha = `${ws}/marca/categoria-minha.jpg`
    const fotoDela = `${wsOutra}/marca/categoria-dela.jpg`
    const minha = await criarCategoria(ws, "Blusas 66")
    const minhaSub = await montarSubcategoria(ws, minha, "Minha sub")
    await service.from("catalog_categories").update({ photo_path: fotoMinha }).eq("id", minha)
    const dela = await criarCategoria(wsOutra, "Blusas 66")
    const delaSub = await montarSubcategoria(wsOutra, dela, "Sub dela")
    await service.from("catalog_categories").update({ photo_path: fotoDela }).eq("id", dela)
    await montarProduto(wsOutra, "Produto dela", dela, delaSub)

    const estadoDela = async () => ({
      categoria: (await service.from("catalog_categories").select("name, photo_path").eq("id", dela).single()).data,
      subcategorias: (await subcategoriasNoBanco(dela)).map((s) => [s.id, s.name]),
    })
    // Antes de tudo: os dados das duas empresas existem.
    const antes = await estadoDela()
    expect(antes).toEqual({ categoria: { name: "Blusas 66", photo_path: fotoDela }, subcategorias: [[delaSub, "Sub dela"]] })
    expect((await subcategoriasNoBanco(minha)).map((s) => s.id)).toEqual([minhaSub])

    // Listar: só as da própria empresa.
    const catalogo = await listarCatalogo()
    const ids = catalogo.categorias.flatMap((c) => [c.id, ...c.subcategorias.map((s) => s.id)])
    expect(ids).toContain(minha)
    expect(ids).toContain(minhaSub)
    expect(ids).not.toContain(dela)
    expect(ids).not.toContain(delaSub)
    expect(catalogo.produtos.map((p) => p.nome)).not.toContain("Produto dela")
    // Nem lendo a tabela direto com a sessão dela (RLS).
    expect((await logado.from("catalog_subcategories").select("id").eq("id", delaSub)).data).toEqual([])

    // Mexer usando identificadores da outra empresa.
    expect((await renomearSubcategoria(delaSub, "Invadida")).erro).toBe("Subcategoria não encontrada.")
    expect((await excluirSubcategoria(delaSub)).erro).toBe("Subcategoria não encontrada.")
    expect((await criarSubcategoria(dela, "Nova")).erro).toBe("Categoria não encontrada.")
    expect((await reordenarSubcategoria(minhaSub, delaSub)).erro).toBe("Subcategoria não encontrada.")
    expect((await prepararEnvioFotoCategoria(dela, { tipo: "image/jpeg", tamanho: 1000 })).erro).toBe("Categoria não encontrada.")
    expect((await salvarFotoCategoria(dela, fotoMinha)).erro).toBe("Categoria não encontrada.")
    expect((await salvarFotoCategoria(dela, null)).erro).toBe("Categoria não encontrada.")
    expect((await salvarProduto(produto({ nome: "Intruso", categoriaId: minha, subcategoriaId: delaSub }))).erro).toBe("Subcategoria não encontrada.")
    // Direto na tabela, com a sessão dela: o RLS não deixa alterar nem apagar.
    await logado.from("catalog_subcategories").update({ name: "Invadida" }).eq("id", delaSub)
    await logado.from("catalog_subcategories").delete().eq("id", delaSub)
    await logado.from("catalog_categories").update({ photo_path: null }).eq("id", dela)
    const inserida = await logado.from("catalog_subcategories").insert({ workspace_id: wsOutra, category_id: dela, name: "Plantada" })
    expect(inserida.error).not.toBeNull()

    expect(await estadoDela()).toEqual(antes)
    // E as da própria empresa continuam como estavam.
    expect((await service.from("catalog_categories").select("photo_path").eq("id", minha).single()).data?.photo_path).toBe(fotoMinha)
    expect((await subcategoriasNoBanco(minha)).map((s) => [s.id, s.name])).toEqual([[minhaSub, "Minha sub"]])
  })
})
