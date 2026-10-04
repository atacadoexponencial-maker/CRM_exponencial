// @vitest-environment node
// B16-07 — configurações do catálogo e leitura da loja pública. Batem no Supabase real.
// Mockado só @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarConfiguracoes, salvarConfiguracoes, verificarEndereco } from "@/app/(auth)/catalogo/configuracoes/actions"
import { salvarProduto } from "@/app/(auth)/catalogo/actions"
import { carregarLojaPublica, carregarProdutoPublico, carregarVitrine } from "@/lib/catalogo/loja-publica"
import type { ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const criados = { workspaceIds: [] as string[], userIds: [] as string[], conexaoIds: [] as string[] }
const ts = Date.now()
const slugA = `loja-a-${ts}`

async function criarEmpresa(nome: string) {
  const { data } = await service.from("workspaces").insert({ name: nome }).select().single()
  criados.workspaceIds.push(data!.id)
  return data!.id as string
}
async function criarUsuario(ws: string, email: string, role: string) {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: role, role, status: "active" })
  criados.userIds.push(data.user!.id)
}
async function criarNumero(ws: string, status = "connected") {
  const { data } = await service
    .from("whatsapp_connections")
    .insert({ workspace_id: ws, canal: "gateway", status, phone_number: "5521900001111", instance_id: `inst_cat_${ts}_${Math.random()}`, instance_token: "t" })
    .select("id")
    .single()
  criados.conexaoIds.push(data!.id)
  return data!.id as string
}
async function entrarComo(email: string) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(c as never)
}
function config(parcial: Partial<ConfigCatalogo>): ConfigCatalogo {
  return { endereco: "", conexaoId: null, minimo: { tipo: "nenhum", valor: null }, mensagemFechamento: "", publicado: false, ...parcial }
}

const emailA = `loja-admin-a-${ts}@catalogo-test.com`
const emailAtendA = `loja-atend-a-${ts}@catalogo-test.com`
const emailB = `loja-admin-b-${ts}@catalogo-test.com`
let wsA = "", numeroA = "", numeroB = ""

beforeAll(async () => {
  wsA = await criarEmpresa(`Loja A ${ts}`)
  const wsB = await criarEmpresa(`Loja B ${ts}`)
  await criarUsuario(wsA, emailA, "admin")
  await criarUsuario(wsA, emailAtendA, "atendente")
  await criarUsuario(wsB, emailB, "admin")
  numeroA = await criarNumero(wsA)
  numeroB = await criarNumero(wsB)
}, 60_000)

afterAll(async () => {
  await service.from("catalog_settings").delete().in("workspace_id", criados.workspaceIds)
  if (criados.conexaoIds.length) await service.from("whatsapp_connections").delete().in("id", criados.conexaoIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length) await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B16-07 — Configurações do catálogo e vitrine pública", { timeout: 30_000 }, () => {
  it("só publica com endereço e número; despublicada, a loja não abre", async () => {
    await entrarComo(emailA)
    expect((await salvarConfiguracoes(config({ endereco: slugA, publicado: true }))).erro).toMatch(/Para publicar/)
    expect((await salvarConfiguracoes(config({ endereco: slugA, conexaoId: numeroA, publicado: false }))).erro).toBeUndefined()
    expect(await carregarLojaPublica(slugA)).toBeNull()
  })

  it("publicada, a loja abre com o nome da empresa, o mínimo e o WhatsApp", async () => {
    await entrarComo(emailA)
    await salvarConfiguracoes(config({ endereco: slugA, conexaoId: numeroA, minimo: { tipo: "pecas", valor: 12 }, mensagemFechamento: "Pix", publicado: true }))
    const loja = await carregarLojaPublica(slugA.toUpperCase())
    expect(loja).toMatchObject({ endereco: slugA, minimo: { tipo: "pecas", valor: 12 }, mensagemFechamento: "Pix", whatsapp: "5521900001111" })
    expect(loja?.tema.nomeLoja).toBe(`Loja A ${ts}`)
    expect((await carregarConfiguracoes())?.config).toMatchObject({ endereco: slugA, publicado: true })
  })

  it("endereço é único entre empresas e os reservados são recusados", async () => {
    await entrarComo(emailB)
    expect(await verificarEndereco(slugA)).toBe("em_uso")
    expect((await salvarConfiguracoes(config({ endereco: slugA, conexaoId: numeroB }))).erro).toMatch(/outra loja/)
    expect((await salvarConfiguracoes(config({ endereco: "prototipo" }))).erro).toMatch(/Endereço inválido/)
    expect((await salvarConfiguracoes(config({ endereco: "-ruim" }))).erro).toMatch(/Endereço inválido/)
    await entrarComo(emailA)
    expect(await verificarEndereco(slugA)).toBe("disponivel")
  })

  it("empresa B não usa o número da empresa A", async () => {
    await entrarComo(emailB)
    expect((await salvarConfiguracoes(config({ endereco: `loja-b-${ts}`, conexaoId: numeroA }))).erro).toMatch(/não está mais conectado/)
  })

  it("atendente não salva configurações", async () => {
    await entrarComo(emailAtendA)
    expect((await salvarConfiguracoes(config({ endereco: slugA }))).erro).toMatch(/Admin e Gerente/)
  })

  it("a vitrine só mostra produtos visíveis, e produto oculto não abre", async () => {
    await entrarComo(emailA)
    const base = { descricao: "", precoDe: null, codigo: "", categoriaId: null, destaque: false, fotos: [], tipos: [], estoque: { "": 3 } }
    const visivel = (await salvarProduto({ ...base, id: null, nome: "Visível", preco: 10, visivel: true })) as { id: string }
    const oculto = (await salvarProduto({ ...base, id: null, nome: "Oculto", preco: 10, visivel: false })) as { id: string }
    const { produtos } = await carregarVitrine(wsA)
    expect(produtos.map((p) => p.nome)).toEqual(["Visível"])
    expect(await carregarProdutoPublico(wsA, visivel.id)).toMatchObject({ nome: "Visível", estoque: { "": 3 } })
    expect(await carregarProdutoPublico(wsA, oculto.id)).toBeNull()
  })

  it("número removido tira a loja do ar", async () => {
    await service.from("whatsapp_connections").update({ status: "removed" }).eq("id", numeroA)
    expect(await carregarLojaPublica(slugA)).toBeNull()
    await service.from("whatsapp_connections").update({ status: "connected" }).eq("id", numeroA)
  })
})
