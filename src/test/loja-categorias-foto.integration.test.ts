// @vitest-environment node
// B61-02 — Foto da categoria: enviar, recusar, trocar e remover, e a foto que a loja
// pública entrega para cada círculo. Bate no Supabase real (banco de teste). Mockado só
// @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { listarCatalogo, prepararEnvioFotoCategoria, salvarFotoCategoria } from "@/app/(auth)/catalogo/actions"
import { carregarVitrine, urlPublicaImagem } from "@/lib/catalogo/loja-publica"
import { BUCKET_CATALOGO } from "@/lib/catalogo/regras"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const email = `loja-cat-admin-${ts}@catalogo-test.com`
const MB = 1024 * 1024

let ws = ""
let wsOutra = ""
let userId = ""
let logado: SupabaseClient
const cat = { blusas: "", calcas: "", acessorios: "", inverno: "", deOutraEmpresa: "" }

async function criarCategoria(empresa: string, nome: string, posicao: number) {
  const { data, error } = await service.from("catalog_categories").insert({ workspace_id: empresa, name: nome, position: posicao }).select("id").single()
  if (error) throw new Error(error.message)
  return data.id as string
}
async function criarProduto(categoria: string, nome: string, posicao: number, visivel: boolean, foto: string | null) {
  const { error } = await service
    .from("catalog_products")
    .insert({ workspace_id: ws, category_id: categoria, name: nome, price: 10, position: posicao, visible: visivel, photos: foto ? [`${ws}/produtos/${foto}`] : [] })
  if (error) throw new Error(error.message)
}
const fotoDeProduto = (arquivo: string) => urlPublicaImagem(`${ws}/produtos/${arquivo}`)

async function fotoNoBanco(categoria: string) {
  const { data } = await service.from("catalog_categories").select("photo_path").eq("id", categoria).single()
  return data!.photo_path
}
async function fotoNaLoja(nome: string) {
  const { categorias } = await carregarVitrine(ws)
  const categoria = categorias.find((c) => c.nome === nome)
  expect(categoria, `a loja devolve a categoria ${nome}`).toBeDefined()
  return categoria!.fotoUrl
}
/** Pela lista da pasta, não pelo download: o download de arquivo recém-apagado ainda pode vir do cache. */
async function existeNoArmazenamento(caminho: string) {
  const [pasta, nome] = [caminho.slice(0, caminho.lastIndexOf("/")), caminho.slice(caminho.lastIndexOf("/") + 1)]
  const { data, error } = await service.storage.from(BUCKET_CATALOGO).list(pasta, { search: nome })
  if (error) throw new Error(error.message)
  return (data ?? []).some((a) => a.name === nome)
}
/** O caminho que o lojista percorre: pede a URL assinada, manda o arquivo e grava a foto. */
async function enviarFoto(categoria: string, conteudo: string) {
  const preparo = await prepararEnvioFotoCategoria(categoria, { tipo: "image/jpeg", tamanho: 1 * MB })
  if (preparo.erro !== undefined) throw new Error(preparo.erro)
  const envio = await logado.storage.from(BUCKET_CATALOGO).uploadToSignedUrl(preparo.caminho, preparo.token, new Blob([conteudo], { type: "image/jpeg" }), { contentType: "image/jpeg" })
  if (envio.error) throw new Error(envio.error.message)
  return { caminho: preparo.caminho, resultado: await salvarFotoCategoria(categoria, preparo.caminho) }
}

beforeAll(async () => {
  const { data: empresa } = await service.from("workspaces").insert({ name: `Loja Cat ${ts}` }).select().single()
  ws = empresa!.id
  const { data: outra } = await service.from("workspaces").insert({ name: `Loja Cat Outra ${ts}` }).select().single()
  wsOutra = outra!.id
  const { data: conta } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  userId = conta.user!.id
  await service.from("profiles").insert({ id: userId, workspace_id: ws, name: "admin", role: "admin", status: "active" })

  cat.blusas = await criarCategoria(ws, "Blusas", 0)
  cat.calcas = await criarCategoria(ws, "Calças", 1)
  cat.acessorios = await criarCategoria(ws, "Acessórios", 2)
  cat.inverno = await criarCategoria(ws, "Inverno", 3)
  cat.deOutraEmpresa = await criarCategoria(wsOutra, "Blusas", 0)

  // Blusas: o primeiro da ordem está oculto; o primeiro VISÍVEL é a "Blusa A".
  await criarProduto(cat.blusas, "Blusa oculta", 0, false, "blusa-oculta.jpg")
  await criarProduto(cat.blusas, "Blusa A", 1, true, "blusa-a.jpg")
  await criarProduto(cat.blusas, "Blusa B", 2, true, "blusa-b.jpg")
  await criarProduto(cat.calcas, "Calça 1", 0, true, "calca-1.jpg")
  await criarProduto(cat.calcas, "Calça 2", 1, true, "calca-2.jpg")
  await criarProduto(cat.acessorios, "Cinto", 0, true, null)
  await criarProduto(cat.inverno, "Casaco", 0, false, "casaco.jpg")

  logado = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const entrada = await logado.auth.signInWithPassword({ email, password: SENHA })
  if (entrada.error) throw new Error(entrada.error.message)
  mockSsr.mockResolvedValue(logado as never)
}, 60_000)

afterAll(async () => {
  for (const empresa of [ws, wsOutra]) {
    if (!empresa) continue
    const { data: arquivos } = await service.storage.from(BUCKET_CATALOGO).list(`${empresa}/marca`)
    if (arquivos?.length) await service.storage.from(BUCKET_CATALOGO).remove(arquivos.map((a) => `${empresa}/marca/${a.name}`))
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

describe("B61-02 — foto da categoria", { timeout: 60_000 }, () => {
  it("CA-B61-54: o lojista envia um JPG de 1 MB e o painel e a loja pública passam a usar a foto", async () => {
    expect(await fotoNoBanco(cat.blusas)).toBeNull()
    expect((await listarCatalogo()).categorias.find((c) => c.id === cat.blusas)?.fotoUrl).toBeNull()

    const { caminho, resultado } = await enviarFoto(cat.blusas, "foto das blusas")
    expect(resultado.erro).toBeUndefined()
    expect(caminho.startsWith(`${ws}/marca/categoria-`)).toBe(true)
    expect(caminho.endsWith(".jpg")).toBe(true)

    // A miniatura do painel vem do catálogo que a ação devolve.
    const noPainel = "catalogo" in resultado ? resultado.catalogo.categorias.find((c) => c.id === cat.blusas) : undefined
    expect(noPainel?.fotoUrl).toBe(urlPublicaImagem(caminho))
    expect(await fotoNoBanco(cat.blusas)).toBe(caminho)
    expect(await existeNoArmazenamento(caminho)).toBe(true)
    // A loja pública usa a foto enviada no círculo "Blusas".
    expect(await fotoNaLoja("Blusas")).toBe(urlPublicaImagem(caminho))
  })

  it("CA-B61-11: a loja entrega a foto enviada para 'Blusas' e a do primeiro produto visível para 'Calças'", async () => {
    const { caminho, resultado } = await enviarFoto(cat.blusas, "foto enviada")
    expect(resultado.erro).toBeUndefined()
    expect(await fotoNoBanco(cat.calcas)).toBeNull()

    const { categorias } = await carregarVitrine(ws)
    expect(categorias.map((c) => c.nome)).toEqual(["Blusas", "Calças", "Acessórios"])
    expect(categorias[0].fotoUrl).toBe(urlPublicaImagem(caminho))
    expect(categorias[1].fotoUrl).toBe(fotoDeProduto("calca-1.jpg"))
  })

  it("CA-B61-12: categoria sem foto enviada e com produtos sem foto chega sem foto (a tela mostra a inicial)", async () => {
    // A categoria existe, tem produto visível e nenhum deles tem foto.
    expect(await fotoNoBanco(cat.acessorios)).toBeNull()
    const { data: produtos } = await service.from("catalog_products").select("name, visible, photos").eq("category_id", cat.acessorios)
    expect(produtos).toEqual([{ name: "Cinto", visible: true, photos: [] }])

    expect(await fotoNaLoja("Acessórios")).toBeNull()
  })

  it("CA-B61-13: categoria com todos os produtos ocultos não vem na loja pública", async () => {
    // "Inverno" existe e tem produto, só que oculto: a ausência abaixo não é falha de montagem.
    const { data: inverno } = await service.from("catalog_categories").select("name").eq("id", cat.inverno).single()
    expect(inverno?.name).toBe("Inverno")
    const { data: produtos } = await service.from("catalog_products").select("name, visible").eq("category_id", cat.inverno)
    expect(produtos).toEqual([{ name: "Casaco", visible: false }])

    const { categorias, produtos: naLoja } = await carregarVitrine(ws)
    expect(categorias.map((c) => c.nome)).not.toContain("Inverno")
    expect(categorias.map((c) => c.nome)).toContain("Blusas")
    expect(naLoja.map((p) => p.nome)).not.toContain("Casaco")
    // No painel do lojista ela continua existindo.
    expect((await listarCatalogo()).categorias.map((c) => c.nome)).toContain("Inverno")
  })

  it("CA-B61-55: PDF e imagem acima do limite da logo são recusados pelo servidor e a foto não muda", async () => {
    const { caminho } = await enviarFoto(cat.blusas, "foto que fica")
    expect(await fotoNoBanco(cat.blusas)).toBe(caminho)

    // Os mesmos avisos que a logo mostra.
    expect((await prepararEnvioFotoCategoria(cat.blusas, { tipo: "application/pdf", tamanho: 1 * MB })).erro).toBe("Use PNG, JPG ou WebP.")
    expect((await prepararEnvioFotoCategoria(cat.blusas, { tipo: "image/svg+xml", tamanho: 1000 })).erro).toBe("Use PNG, JPG ou WebP.")
    expect((await prepararEnvioFotoCategoria(cat.blusas, { tipo: "image/png", tamanho: 2 * MB + 1 })).erro).toBe("A imagem passa de 2 MB.")
    // No limite, passa.
    expect((await prepararEnvioFotoCategoria(cat.blusas, { tipo: "image/png", tamanho: 2 * MB })).erro).toBeUndefined()

    // Quem chama o salvamento direto não grava caminho de fora da pasta da empresa.
    for (const invalido of [`${wsOutra}/marca/categoria-x.jpg`, `${ws}/produtos/blusa-a.jpg`, `${ws}/marca/../x.jpg`, "https://exemplo.test/foto.jpg", ""]) {
      expect((await salvarFotoCategoria(cat.blusas, invalido)).erro, invalido).toBe("Imagem inválida. Envie de novo.")
    }
    // Nem mexe em categoria de outra empresa.
    expect((await prepararEnvioFotoCategoria(cat.deOutraEmpresa, { tipo: "image/jpeg", tamanho: 1 * MB })).erro).toBe("Categoria não encontrada.")
    expect((await salvarFotoCategoria(cat.deOutraEmpresa, caminho)).erro).toBe("Categoria não encontrada.")

    expect(await fotoNoBanco(cat.blusas)).toBe(caminho)
    expect(await fotoNoBanco(cat.deOutraEmpresa)).toBeNull()
    expect(await existeNoArmazenamento(caminho)).toBe(true)
    expect(await fotoNaLoja("Blusas")).toBe(urlPublicaImagem(caminho))
  })

  it("CA-B61-56: depois da troca a loja mostra a imagem nova; depois de remover, volta a foto do primeiro produto", async () => {
    const primeira = await enviarFoto(cat.blusas, "primeira foto")
    expect(await fotoNaLoja("Blusas")).toBe(urlPublicaImagem(primeira.caminho))

    const segunda = await enviarFoto(cat.blusas, "segunda foto")
    expect(segunda.resultado.erro).toBeUndefined()
    expect(segunda.caminho).not.toBe(primeira.caminho)
    expect(await fotoNaLoja("Blusas")).toBe(urlPublicaImagem(segunda.caminho))
    // O arquivo trocado não fica guardado.
    expect(await existeNoArmazenamento(primeira.caminho)).toBe(false)
    expect(await existeNoArmazenamento(segunda.caminho)).toBe(true)

    const removida = await salvarFotoCategoria(cat.blusas, null)
    expect(removida.erro).toBeUndefined()
    expect(await fotoNoBanco(cat.blusas)).toBeNull()
    expect(await existeNoArmazenamento(segunda.caminho)).toBe(false)
    // Volta a foto do primeiro produto visível ("Blusa A"), não a do produto oculto que vem antes.
    expect(await fotoNaLoja("Blusas")).toBe(fotoDeProduto("blusa-a.jpg"))
  })
})
