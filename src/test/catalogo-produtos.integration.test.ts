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
    visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 }, ...parcial,
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
