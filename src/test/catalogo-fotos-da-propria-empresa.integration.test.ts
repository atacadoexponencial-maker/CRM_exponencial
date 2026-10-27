// @vitest-environment node
// B44-07 — trocar ou apagar foto, produto, logo ou banner só apaga arquivo da própria
// empresa, e o catálogo não aceita SVG (auditoria de 27/10/2026). Bate no Supabase
// real; o Gerente grava o banco direto pelo próprio navegador, como faria um ataque.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import { excluirProduto, prepararEnvioFoto, salvarProduto } from "@/app/(auth)/catalogo/actions"
import { prepararEnvioImagemLoja, salvarAparencia } from "@/app/(auth)/catalogo/aparencia/actions"
import type { ProdutoEditavel } from "@/app/(auth)/catalogo/components/editor-produto"
import { TEMA_PADRAO } from "@/app/loja/components/tema"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const BUCKET = "catalog-images"
const ts = Date.now()
const SENHA = "senha-segura-123"
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))
let empresaA = "", empresaB = "", gerenteA = ""
let navegadorA: SupabaseClient
const guardados: string[] = []

async function guardarImagem(caminho: string) {
  const { error } = await service.storage.from(BUCKET).upload(caminho, PNG, { contentType: "image/png" })
  if (error) throw new Error(`upload ${caminho}: ${error.message}`)
  guardados.push(caminho)
  return caminho
}
async function existe(caminho: string) {
  const pasta = caminho.slice(0, caminho.lastIndexOf("/"))
  const nome = caminho.slice(caminho.lastIndexOf("/") + 1)
  const { data } = await service.storage.from(BUCKET).list(pasta, { search: nome })
  return (data ?? []).some((a) => a.name === nome)
}
const produto = (parcial: Partial<ProdutoEditavel>): ProdutoEditavel => ({
  id: null, nome: `[TESTE] B44-07 ${randomUUID().slice(0, 6)}`, descricao: "", preco: 10, precoDe: null, codigo: "", categoriaId: null,
  faixas: [], minimo: null, grade: null, visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 }, ...parcial,
})
const foto = (caminho: string) => ({ id: caminho, url: `${URL}/storage/v1/object/public/${BUCKET}/${caminho}` })

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-07 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-07 B ${ts}` }).select("id").single()).data!.id
  const email = `b44-07-gerente-${ts}@teste.com`
  gerenteA = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: gerenteA, workspace_id: empresaA, name: "Gerente A", role: "gerente" })
  navegadorA = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegadorA.auth.signInWithPassword({ email, password: SENHA })
  clienteDaVez = navegadorA
}, 60_000)

afterAll(async () => {
  const restantes = []
  for (const c of guardados) if (await existe(c)) restantes.push(c)
  if (restantes.length) await service.storage.from(BUCKET).remove(restantes)
  await service.from("catalog_settings").delete().eq("workspace_id", empresaA)
  const { data: produtos } = await service.from("catalog_products").select("id").eq("workspace_id", empresaA)
  for (const p of produtos ?? []) await service.from("catalog_stock").delete().eq("product_id", p.id)
  await service.from("catalog_products").delete().eq("workspace_id", empresaA)
  await service.from("profiles").delete().eq("id", gerenteA)
  await service.auth.admin.deleteUser(gerenteA)
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

describe("B44-07 — Fotos e logo do catálogo só da própria empresa", { timeout: 30_000 }, () => {
  it("CA-B44-26: should not apagar imagem de outra empresa ao trocar a foto nem ao apagar o produto", async () => {
    const deB = await guardarImagem(`${empresaB}/produtos/${randomUUID()}.png`)
    const criado = await salvarProduto(produto({}))
    if (!("id" in criado)) throw new Error(criado.erro)

    // O Gerente de A grava, direto pelo banco, o caminho da imagem de B no produto dele.
    expect((await navegadorA.from("catalog_products").update({ photos: [deB] }).eq("id", criado.id)).error).toBeNull()
    expect(await salvarProduto(produto({ id: criado.id, fotos: [] }))).toEqual({ id: criado.id })
    expect(await existe(deB)).toBe(true)

    expect((await navegadorA.from("catalog_products").update({ photos: [deB] }).eq("id", criado.id)).error).toBeNull()
    expect(await excluirProduto(criado.id)).toEqual({})
    expect(await existe(deB)).toBe(true)
  })

  it("CA-B44-27: should not apagar imagem de outra empresa ao trocar a logo ou o banner", async () => {
    const logoDeB = await guardarImagem(`${empresaB}/marca/logo-${randomUUID()}.png`)
    const bannerDeB = await guardarImagem(`${empresaB}/marca/banner-${randomUUID()}.png`)
    const { error } = await navegadorA.from("catalog_settings").upsert({ workspace_id: empresaA, logo_path: logoDeB, banner_path: bannerDeB })
    expect(error).toBeNull()

    expect(await salvarAparencia({ ...TEMA_PADRAO, logoUrl: null, bannerUrl: null })).toEqual({ aviso: "Salvo. A loja já abre com a aparência nova." })
    expect(await existe(logoDeB)).toBe(true)
    expect(await existe(bannerDeB)).toBe(true)
  })

  it("CA-B44-28: should apagar a foto antiga da própria empresa ao trocar", async () => {
    const antiga = await guardarImagem(`${empresaA}/produtos/${randomUUID()}.png`)
    const nova = await guardarImagem(`${empresaA}/produtos/${randomUUID()}.png`)
    const criado = await salvarProduto(produto({ fotos: [foto(antiga)] }))
    if (!("id" in criado)) throw new Error(criado.erro)

    expect(await salvarProduto(produto({ id: criado.id, fotos: [foto(nova)] }))).toEqual({ id: criado.id })

    const { data } = await service.from("catalog_products").select("photos").eq("id", criado.id).single()
    expect(data?.photos).toEqual([nova])
    expect(await existe(antiga)).toBe(false)
    expect(await existe(nova)).toBe(true)
  })

  it("CA-B44-32: should recusar foto e logo em SVG, sem criar endereço de envio", async () => {
    expect(await prepararEnvioFoto({ tipo: "image/svg+xml", tamanho: 100 })).toEqual({ erro: "Use fotos JPG, PNG ou WebP." })
    expect(await prepararEnvioImagemLoja("logo", { tipo: "image/svg+xml", tamanho: 100 })).toEqual({ erro: "Use PNG, JPG ou WebP." })
    // E o armazenamento também recusa, para quem tentar mandar direto.
    const { error } = await service.storage.from(BUCKET).upload(`${empresaA}/marca/logo-${randomUUID()}.svg`, "<svg/>", { contentType: "image/svg+xml" })
    expect(error).not.toBeNull()
  })
})
