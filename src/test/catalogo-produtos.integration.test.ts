// @vitest-environment node
// B16-05 — catálogo no CRM: produtos e categorias. Batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  alternarVisivel,
  carregarProduto,
  criarCategoria,
  excluirCategoria,
  listarCatalogo,
  prepararEnvioFoto,
  reordenarCategoria,
  reordenarProduto,
  salvarProduto,
} from "@/app/(auth)/catalogo/actions"
import type { ProdutoEditavel } from "@/app/(auth)/catalogo/components/editor-produto"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const ts = Date.now()

async function criarUsuario(workspaceId: string, email: string, role: "admin" | "gerente" | "atendente") {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  if (!data.user) throw new Error(`Falha ao criar ${email}`)
  await service.from("profiles").insert({ id: data.user.id, workspace_id: workspaceId, name: role, role, status: "active" })
  criados.userIds.push(data.user.id)
}

async function criarEmpresa(nome: string) {
  const { data } = await service.from("workspaces").insert({ name: nome }).select().single()
  if (!data) throw new Error(`Falha ao criar ${nome}`)
  criados.workspaceIds.push(data.id)
  return data.id as string
}

async function entrarComo(email: string) {
  const client = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao entrar como ${email}: ${error.message}`)
  mockSsr.mockResolvedValue(client as never)
}

function produto(parcial: Partial<ProdutoEditavel>): ProdutoEditavel {
  return {
    id: null, nome: "Produto", descricao: "", preco: 10, precoDe: null, codigo: "", categoriaId: null,
    faixas: [], minimo: null, grade: null, visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 }, ...parcial,
  }
}

const emailA = `cat-admin-a-${ts}@catalogo-test.com`
const emailGerenteA = `cat-gerente-a-${ts}@catalogo-test.com`
const emailAtendA = `cat-atend-a-${ts}@catalogo-test.com`
const emailB = `cat-admin-b-${ts}@catalogo-test.com`
let wsA = ""

beforeAll(async () => {
  wsA = await criarEmpresa(`Catálogo A ${ts}`)
  const wsB = await criarEmpresa(`Catálogo B ${ts}`)
  await criarUsuario(wsA, emailA, "admin")
  await criarUsuario(wsA, emailGerenteA, "gerente")
  await criarUsuario(wsA, emailAtendA, "atendente")
  await criarUsuario(wsB, emailB, "admin")
})

afterAll(async () => {
  // Produtos e categorias saem junto com a empresa (on delete cascade).
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length) await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B16-05 — Cadastrar produtos e organizar categorias", { timeout: 30_000 }, () => {
  it("admin cria categoria e produto, e o produto volta salvo", async () => {
    await entrarComo(emailA)
    const r = await criarCategoria("Vestidos")
    expect(r.erro).toBeUndefined()
    const vestidos = (await listarCatalogo()).categorias.find((c) => c.nome === "Vestidos")!
    const salvo = await salvarProduto(produto({ nome: "Vestido Midi", preco: 89.9, precoDe: 119.9, categoriaId: vestidos.id }))
    expect(salvo.erro).toBeUndefined()
    const carregado = await carregarProduto((salvo as { id: string }).id)
    expect(carregado).toMatchObject({ nome: "Vestido Midi", preco: 89.9, precoDe: 119.9, categoriaId: vestidos.id, visivel: true })
  })

  it("gerente também grava; atendente não", async () => {
    await entrarComo(emailGerenteA)
    expect((await salvarProduto(produto({ nome: "Do gerente" }))).erro).toBeUndefined()
    await entrarComo(emailAtendA)
    expect((await salvarProduto(produto({ nome: "Da atendente" }))).erro).toMatch(/Admin e Gerente/)
    expect((await criarCategoria("Proibida")).erro).toMatch(/Admin e Gerente/)
    expect((await listarCatalogo()).produtos).toHaveLength(0)
  })

  it("empresa B não vê nem edita os produtos da empresa A", async () => {
    await entrarComo(emailA)
    const idA = (await listarCatalogo()).produtos[0].id
    await entrarComo(emailB)
    expect((await listarCatalogo()).produtos).toHaveLength(0)
    expect(await carregarProduto(idA)).toBeNull()
    expect((await salvarProduto(produto({ id: idA, nome: "Invasão" }))).erro).toBe("Produto não encontrado.")
    expect((await alternarVisivel(idA)).erro).toBe("Produto não encontrado.")
  })

  it("rejeita preço zero, preço \"de\" menor e foto de outra empresa", async () => {
    await entrarComo(emailA)
    expect((await salvarProduto(produto({ preco: 0 }))).erro).toMatch(/preço maior que zero/)
    expect((await salvarProduto(produto({ preco: 50, precoDe: 40 }))).erro).toMatch(/preço "de"/)
    expect((await salvarProduto(produto({ fotos: [{ id: "outra-empresa/produtos/x.jpg", url: "" }] }))).erro).toMatch(/Foto inválida/)
  })

  it("não deixa criar duas categorias com o mesmo nome (sem diferenciar maiúscula)", async () => {
    await entrarComo(emailA)
    expect((await criarCategoria("vestidos")).erro).toBe("Já existe uma categoria com esse nome.")
  })

  it("excluir a categoria leva os produtos para Sem categoria", async () => {
    await entrarComo(emailA)
    await criarCategoria("Temporária")
    const temp = (await listarCatalogo()).categorias.find((c) => c.nome === "Temporária")!
    const { id } = (await salvarProduto(produto({ nome: "Fica sem categoria", categoriaId: temp.id }))) as { id: string }
    expect((await excluirCategoria(temp.id)).erro).toBeUndefined()
    expect((await carregarProduto(id))?.categoriaId).toBeNull()
  })

  it("ocultar e reordenar gravam", async () => {
    await entrarComo(emailA)
    await criarCategoria("Blusas")
    const antes = await listarCatalogo()
    const [c1, c2] = [antes.categorias[0], antes.categorias[antes.categorias.length - 1]]
    const reord = await reordenarCategoria(c2.id, c1.id)
    expect(reord.erro).toBeUndefined()
    expect((await listarCatalogo()).categorias[0].id).toBe(c2.id)

    const p1 = (await salvarProduto(produto({ nome: "Primeiro" }))) as { id: string }
    const p2 = (await salvarProduto(produto({ nome: "Segundo" }))) as { id: string }
    await reordenarProduto(p2.id, p1.id)
    const semCategoria = (await listarCatalogo()).produtos.filter((p) => p.categoriaId === null).map((p) => p.id)
    expect(semCategoria.indexOf(p2.id)).toBeLessThan(semCategoria.indexOf(p1.id))

    const oculto = await alternarVisivel(p1.id)
    expect(oculto.erro).toBeUndefined()
    expect((await carregarProduto(p1.id))?.visivel).toBe(false)
  })

  it("prepara envio de foto só para JPG/PNG/WebP até 5 MB, na pasta da empresa", async () => {
    await entrarComo(emailA)
    expect((await prepararEnvioFoto({ tipo: "image/gif", tamanho: 1000 })).erro).toMatch(/JPG, PNG ou WebP/)
    expect((await prepararEnvioFoto({ tipo: "image/png", tamanho: 6 * 1024 * 1024 })).erro).toMatch(/5 MB/)
    const ok = await prepararEnvioFoto({ tipo: "image/png", tamanho: 1000 })
    expect(ok.erro).toBeUndefined()
    expect((ok as { caminho: string }).caminho.startsWith(`${wsA}/produtos/`)).toBe(true)
  })
})

describe("B16-06 — Variações e grade de estoque", { timeout: 30_000 }, () => {
  const tipos = [
    { id: "t1", nome: "Tamanho", opcoes: ["P", "M", "G"] },
    { id: "t2", nome: "Cor", opcoes: ["Azul", "Preto"] },
  ]

  it("grava tipos e estoque por combinação e devolve igual", async () => {
    await entrarComo(emailA)
    const estoque = { "P / Azul": 1, "P / Preto": 2, "M / Azul": 3, "M / Preto": 0, "G / Azul": 5, "G / Preto": 4 }
    const r = (await salvarProduto(produto({ nome: "Com grade", tipos, estoque }))) as { id: string }
    const salvo = await carregarProduto(r.id)
    expect(salvo?.tipos.map((t) => t.opcoes)).toEqual([["P", "M", "G"], ["Azul", "Preto"]])
    expect(salvo?.estoque).toEqual(estoque)
    expect((await listarCatalogo()).produtos.find((p) => p.id === r.id)?.estoqueTotal).toBe(15)
  })

  it("remover uma opção apaga as combinações dela do banco", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Encolhe", tipos, estoque: { "P / Azul": 1, "G / Azul": 9 } }))) as { id: string }
    const sem = [{ ...tipos[0], opcoes: ["P", "M"] }, tipos[1]]
    await salvarProduto(produto({ id: r.id, nome: "Encolhe", tipos: sem, estoque: { "P / Azul": 1, "G / Azul": 9 } }))
    const { data } = await service.from("catalog_stock").select("combination").eq("product_id", r.id)
    expect((data ?? []).map((d) => d.combination).sort()).toEqual(["M / Azul", "M / Preto", "P / Azul", "P / Preto"])
  })

  it("QA A8 — salvar com a tela aberta não desfaz a baixa de estoque feita por um pedido", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Tela aberta", tipos: [], estoque: { "": 10 } }))) as { id: string }
    // Um pedido fechou enquanto a tela estava aberta: 10 → 8
    await service.from("catalog_stock").update({ quantity: 8 }).eq("product_id", r.id).eq("combination", "")
    // O editor manda só o que a pessoa mexeu: nada no estoque, só a descrição
    expect((await salvarProduto(produto({ id: r.id, nome: "Tela aberta", descricao: "nova", tipos: [], estoque: {} }))).erro).toBeUndefined()
    const { data: depois } = await service.from("catalog_stock").select("quantity").eq("product_id", r.id).eq("combination", "").single()
    expect(depois?.quantity).toBe(8)
    // Mexeu no estoque: o valor novo vale
    await salvarProduto(produto({ id: r.id, nome: "Tela aberta", tipos: [], estoque: { "": 3 } }))
    const { data: mexido } = await service.from("catalog_stock").select("quantity").eq("product_id", r.id).eq("combination", "").single()
    expect(mexido?.quantity).toBe(3)
  })

  it("sem variação usa um estoque único; zerado aparece esgotado (estoque 0)", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Único", tipos: [], estoque: { "": 0 } }))) as { id: string }
    expect((await listarCatalogo()).produtos.find((p) => p.id === r.id)?.estoqueTotal).toBe(0)
  })

  it("rejeita opção repetida, estoque negativo e mais de 2 tipos", async () => {
    await entrarComo(emailA)
    expect((await salvarProduto(produto({ tipos: [{ id: "x", nome: "Cor", opcoes: ["Azul", "azul"] }] }))).erro).toMatch(/repetidas/)
    expect((await salvarProduto(produto({ tipos: [], estoque: { "": -1 } }))).erro).toMatch(/inteiro de 0/)
    const tres = [...tipos, { id: "t3", nome: "Tecido", opcoes: ["Linho"] }]
    expect((await salvarProduto(produto({ tipos: tres }))).erro).toMatch(/até 2 tipos/)
  })

  it("atendente não grava estoque nem pela função do banco", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Protegido", tipos: [], estoque: { "": 5 } }))) as { id: string }
    const atend = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    await atend.auth.signInWithPassword({ email: emailAtendA, password: SENHA })
    await atend.rpc("salvar_estoque_produto", { p_produto: r.id, p_tipos: [], p_estoque: { "": 999 } })
    const { data } = await service.from("catalog_stock").select("quantity").eq("product_id", r.id).single()
    expect(data?.quantity).toBe(5)
  })
})

describe("B31-01 — Regras de venda do produto", { timeout: 30_000 }, () => {
  it("CA-B31-01: salva duas faixas de preço e recusa faixa acima do preço base ou que não desce", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Com faixas", preco: 29.9, faixas: [{ min: 48, preco: 21.9 }, { min: 12, preco: 24.9 }] }))) as { id: string }
    expect((r as { erro?: string }).erro).toBeUndefined()
    expect((await carregarProduto(r.id))?.faixas).toEqual([{ min: 12, preco: 24.9 }, { min: 48, preco: 21.9 }])
    expect((await salvarProduto(produto({ preco: 29.9, faixas: [{ min: 12, preco: 31 }] }))).erro).toMatch(/menor que o preço do produto/)
    expect((await salvarProduto(produto({ preco: 29.9, faixas: [{ min: 12, preco: 24.9 }, { min: 48, preco: 25 }] }))).erro).toMatch(/menor que o da faixa anterior/)
    expect((await salvarProduto(produto({ preco: 29.9, faixas: [{ min: 1, preco: 20 }] }))).erro).toMatch(/a partir de 2/)
  })

  it("CA-B31-02: salva mínimo 6; recusa 0 e texto; vazio volta a sem mínimo", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Com mínimo", minimo: 6 }))) as { id: string }
    expect((await carregarProduto(r.id))?.minimo).toBe(6)
    expect((await salvarProduto(produto({ minimo: 0 }))).erro).toMatch(/inteiro a partir de 1/)
    expect((await salvarProduto(produto({ minimo: Number.NaN }))).erro).toMatch(/inteiro a partir de 1/)
    expect((await salvarProduto(produto({ id: r.id, nome: "Com mínimo", minimo: null }))).erro).toBeUndefined()
    expect((await carregarProduto(r.id))?.minimo).toBeNull()
  })
})

describe("B31-03 — Grade fechada no editor", { timeout: 30_000 }, () => {
  const tipos = [
    { id: "t1", nome: "Tamanho", opcoes: ["P", "M", "G", "GG"] },
    { id: "t2", nome: "Cor", opcoes: ["Azul", "Preto"] },
  ]

  it("CA-B31-03: grade P1 M2 G2 GG1 salva e devolvida; produto sem variação não aceita; toda zero é recusada", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Com grade", tipos, grade: { quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: null } }))) as { id: string }
    expect((r as { erro?: string }).erro).toBeUndefined()
    expect((await carregarProduto(r.id))?.grade).toEqual({ quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: null })
    expect((await salvarProduto(produto({ tipos: [], grade: { quantidades: {}, preco: null } }))).erro).toMatch(/precisa ter variação/)
    expect((await salvarProduto(produto({ tipos, grade: { quantidades: { P: 0, M: 0, G: 0, GG: 0 }, preco: null } }))).erro).toMatch(/ao menos uma quantidade/)
    expect((await salvarProduto(produto({ id: r.id, nome: "Com grade", tipos, grade: null }))).erro).toBeUndefined()
    expect((await carregarProduto(r.id))?.grade).toBeNull()
  })

  it("CA-B31-15: preço da grade 150 salvo; zero e negativo recusados", async () => {
    await entrarComo(emailA)
    const r = (await salvarProduto(produto({ nome: "Grade com preço", preco: 29.9, tipos, grade: { quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: 150 } }))) as { id: string }
    expect((await carregarProduto(r.id))?.grade).toEqual({ quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: 150 })
    expect((await salvarProduto(produto({ tipos, grade: { quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: 0 } }))).erro).toMatch(/Preço da grade/)
    expect((await salvarProduto(produto({ tipos, grade: { quantidades: { P: 1, M: 2, G: 2, GG: 1 }, preco: -5 } }))).erro).toMatch(/Preço da grade/)
  })
})
