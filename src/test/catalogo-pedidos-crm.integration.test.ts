// @vitest-environment node
// B16-10 — pedidos do catálogo no CRM e no perfil do contato. Batem no Supabase real.
// Mockado só @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarPedido, contarPedidosNovos, listarPedidos, mudarSituacaoPedido } from "@/app/(auth)/catalogo/pedidos/actions"
import { buscarDadosContato } from "@/app/(auth)/contatos/actions"
import { registrarPedido } from "@/lib/catalogo/pedidos"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const slug = `pedidos-crm-${ts}`
const criados = { workspaceIds: [] as string[], userIds: [] as string[], conexaoIds: [] as string[] }
const emailAtend = `ped-atend-${ts}@catalogo-test.com`
const emailB = `ped-admin-b-${ts}@catalogo-test.com`
let ws = "", pedidoId = "", contatoId = ""

async function criarUsuario(workspace: string, email: string, role: string, nome: string) {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: workspace, name: nome, role, status: "active" })
  criados.userIds.push(data.user!.id)
}
async function entrarComo(email: string) {
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(c as never)
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Pedidos CRM ${ts}` }).select().single()).data!.id
  const wsB = (await service.from("workspaces").insert({ name: `Pedidos CRM B ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws, wsB)
  await criarUsuario(ws, emailAtend, "atendente", "Fernanda")
  await criarUsuario(wsB, emailB, "admin", "Outra")
  const conexao = (await service.from("whatsapp_connections").insert({ workspace_id: ws, canal: "gateway", status: "connected", phone_number: "5511900000000", instance_id: `inst_pcrm_${ts}`, instance_token: "t" }).select("id").single()).data!.id
  criados.conexaoIds.push(conexao)
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, whatsapp_connection_id: conexao, published: true })
  const produto = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 25 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produto, combination: "", quantity: 1 })
  const r = await registrarPedido(slug, { nome: "Ana Souza", whatsapp: "21988880001" }, [{ produtoId: produto, combinacao: "", quantidade: 1 }])
  if (!r.ok) throw new Error(r.erro)
  const { data } = await service.from("catalog_orders").select("id, contact_id").eq("workspace_id", ws).single()
  pedidoId = data!.id
  contatoId = data!.contact_id
}, 60_000)

afterAll(async () => {
  await service.from("catalog_orders").delete().in("workspace_id", criados.workspaceIds)
  await service.from("catalog_settings").delete().in("workspace_id", criados.workspaceIds)
  await service.from("catalog_products").delete().in("workspace_id", criados.workspaceIds)
  await service.from("whatsapp_connections").delete().in("id", criados.conexaoIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B16-10 — Pedidos no CRM e no perfil do contato", { timeout: 30_000 }, () => {
  it("atendente vê o pedido na lista, no contador e no detalhe", async () => {
    await entrarComo(emailAtend)
    const lista = await listarPedidos()
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ numero: 1001, situacao: "novo", pecas: 1, total: 25, cliente: { nome: "Ana Souza" } })
    expect(await contarPedidosNovos()).toBe(1)
    const detalhe = await carregarPedido(pedidoId)
    expect(detalhe?.itens).toEqual([expect.objectContaining({ nome: "Camisa", quantidade: 1, precoUnitario: 25, estoqueAtual: 1 })])
    expect(detalhe?.hrefContato).toBe(`/contatos/${contatoId}`)
    expect(detalhe?.historico).toEqual([expect.objectContaining({ de: null, para: "novo", por: "Loja" })])
  })

  it("muda a situação pelo caminho permitido e o histórico guarda quem mudou", async () => {
    await entrarComo(emailAtend)
    const r = await mudarSituacaoPedido(pedidoId, "em_atendimento")
    expect(r.erro).toBeUndefined()
    expect(r.pedido?.situacao).toBe("em_atendimento")
    expect(r.pedido?.historico.at(-1)).toMatchObject({ de: "novo", para: "em_atendimento", por: "Fernanda" })
    expect(await contarPedidosNovos()).toBe(0)
  })

  it("recusa mudança não permitida", async () => {
    await entrarComo(emailAtend)
    expect((await mudarSituacaoPedido(pedidoId, "novo")).erro).toMatch(/não é permitida/)
  })

  it("outra empresa não vê nem muda o pedido", async () => {
    await entrarComo(emailB)
    expect(await listarPedidos()).toEqual([])
    expect(await carregarPedido(pedidoId)).toBeNull()
    expect((await mudarSituacaoPedido(pedidoId, "cancelado")).erro).toBe("Pedido não encontrado.")
  })

  it("o perfil do contato traz os pedidos e o evento na linha do tempo", async () => {
    await entrarComo(emailAtend)
    const perfil = await buscarDadosContato(contatoId)
    expect(perfil?.pedidosCatalogo).toEqual([expect.objectContaining({ numero: 1001, situacao: "em_atendimento" })])
    expect(perfil?.timeline.some((e) => e.tipo === "pedido_catalogo" && e.descricao.startsWith("Pedido #1001"))).toBe(true)
  })

  it("cancelado não muda mais", async () => {
    await entrarComo(emailAtend)
    expect((await mudarSituacaoPedido(pedidoId, "cancelado")).erro).toBeUndefined()
    expect((await mudarSituacaoPedido(pedidoId, "fechado")).erro).toMatch(/não é permitida/)
  })
})

describe("B16-11 — Estoque baixa ao fechar e volta ao cancelar", { timeout: 30_000 }, () => {
  let produto = ""
  const estoque = async () => (await service.from("catalog_stock").select("quantity").eq("product_id", produto).eq("combination", "M").single()).data!.quantity
  async function pedidoNovo(quantidade: number, fone: string) {
    const r = await registrarPedido(slug, { nome: "Cliente", whatsapp: fone }, [{ produtoId: produto, combinacao: "M", quantidade }])
    if (!r.ok) throw new Error(r.erro)
    return (await service.from("catalog_orders").select("id").eq("workspace_id", ws).eq("number", r.numero).single()).data!.id as string
  }

  beforeAll(async () => {
    produto = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Vestido", price: 50, variant_types: [{ id: "t", nome: "Tamanho", opcoes: ["M"] }] }).select("id").single()).data!.id
    await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produto, combination: "M", quantity: 5 })
  })

  it("fechar baixa o estoque e cancelar o fechado devolve", async () => {
    const id = await pedidoNovo(3, "31977770001")
    await entrarComo(emailAtend)
    expect((await mudarSituacaoPedido(id, "fechado")).erro).toBeUndefined()
    expect(await estoque()).toBe(2)
    expect((await mudarSituacaoPedido(id, "cancelado")).erro).toBeUndefined()
    expect(await estoque()).toBe(5)
  })

  it("estoque insuficiente vai a zero e o cancelamento devolve só o que saiu", async () => {
    const a = await pedidoNovo(4, "31977770002")
    const b = await pedidoNovo(4, "31977770003")
    await entrarComo(emailAtend)
    await mudarSituacaoPedido(a, "fechado")
    expect(await estoque()).toBe(1)
    // Na hora de fechar o segundo, só há 1: vai a zero, nunca negativo.
    await mudarSituacaoPedido(b, "fechado")
    expect(await estoque()).toBe(0)
    const { data: vitrine } = await service.from("catalog_stock").select("quantity").eq("product_id", produto)
    expect(vitrine?.[0].quantity).toBe(0)
    await mudarSituacaoPedido(b, "cancelado")
    expect(await estoque()).toBe(1)
    await mudarSituacaoPedido(a, "cancelado")
    expect(await estoque()).toBe(5)
  })

  it("cancelar um pedido que não estava fechado não mexe no estoque", async () => {
    const id = await pedidoNovo(2, "31977770004")
    await entrarComo(emailAtend)
    await mudarSituacaoPedido(id, "cancelado")
    expect(await estoque()).toBe(5)
  })
})
