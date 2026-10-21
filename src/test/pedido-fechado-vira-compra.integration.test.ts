// @vitest-environment node
// B30-02: pedido do catálogo fechado vira compra do contato. Bate no Supabase real.
// Única coisa mockada: @/integrations/supabase/server (cliente autenticado de verdade).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { carregarPedido, mudarSituacaoPedido } from "@/app/(auth)/catalogo/pedidos/actions"
import { buscarDadosContato, registrarCompra } from "@/app/(auth)/contatos/actions"
import { buscarMetricasDashboard } from "@/app/(auth)/dashboard/actions"
import { registrarPedido } from "@/lib/catalogo/pedidos"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const slug = `b30-02-${ts}`
const criados = { workspaceIds: [] as string[], userIds: [] as string[], conexaoIds: [] as string[] }
const emailAdmin = `b30-02-admin-${ts}@teste.com`
const emailAtend = `b30-02-atend-${ts}@teste.com`
let ws = "", adminId = "", atendenteId = "", produtoId = ""
const navegadores: Record<string, SupabaseClient> = {}

function hojeEmBrasilia() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

async function criarUsuario(email: string, role: string, nome: string) {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: nome, role, status: "active" })
  criados.userIds.push(data.user!.id)
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[email] = c
  return data.user!.id
}
function entrarComo(email: string) {
  mockSsr.mockResolvedValue(navegadores[email] as never)
}

/** Pedido pela loja: 7 peças de R$ 50 = R$ 350. O contato nasce (ou é reaproveitado) pelo telefone. */
async function pedidoNovo(fone: string, quantidade = 7) {
  const r = await registrarPedido(slug, { nome: `Cliente ${fone}`, whatsapp: fone }, [{ produtoId, combinacao: "", quantidade }])
  if (!r.ok) throw new Error(r.erro)
  const { data } = await service.from("catalog_orders").select("id, number, contact_id").eq("workspace_id", ws).eq("number", r.numero).single()
  return data!
}
const comprasDoPedido = async (pedidoId: string) =>
  (await service.from("contact_purchases").select("*").eq("catalog_order_id", pedidoId)).data ?? []

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B30-02 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario(emailAdmin, "admin", "Admin Dona")
  atendenteId = await criarUsuario(emailAtend, "atendente", "Fernanda Atendente")
  const conexao = (await service.from("whatsapp_connections").insert({ workspace_id: ws, canal: "gateway", status: "connected", phone_number: "5511900000002", instance_id: `inst_b3002_${ts}`, instance_token: "t" }).select("id").single()).data!.id
  criados.conexaoIds.push(conexao)
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000002", published: true })
  produtoId = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Blusa", price: 50 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produtoId, combination: "", quantity: 1000 })
}, 60_000)

afterAll(async () => {
  // As compras do catálogo saem junto com o pedido (on delete cascade). As manuais, pelo contato.
  await service.from("catalog_orders").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("catalog_settings").delete().in("workspace_id", criados.workspaceIds)
  await service.from("catalog_products").delete().in("workspace_id", criados.workspaceIds)
  await service.from("whatsapp_connections").delete().in("id", criados.conexaoIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B30-02 — Pedido do catálogo fechado vira compra do contato", { timeout: 60_000 }, () => {
  it("CA-B30-01: fechar o pedido registra a compra no contato com data, valor, peças, origem, pedido e quem fechou", async () => {
    const pedido = await pedidoNovo("21988880101")
    entrarComo(emailAtend)
    expect((await mudarSituacaoPedido(pedido.id, "em_atendimento")).erro).toBeUndefined()
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()

    const compras = await comprasDoPedido(pedido.id)
    expect(compras).toHaveLength(1)
    expect(compras[0]).toMatchObject({
      contact_id: pedido.contact_id,
      valor: 350,
      pecas: 7,
      origem: "catalogo",
      catalog_order_id: pedido.id,
      atendente_id: atendenteId,
    })
    expect(new Date(compras[0].data + "T00:00:00").toLocaleDateString("pt-BR")).toBe(hojeEmBrasilia())

    // E o perfil mostra a compra do catálogo com o número do pedido e quem fechou.
    entrarComo(emailAdmin)
    const perfil = await buscarDadosContato(pedido.contact_id!)
    expect(perfil?.compras).toEqual([
      expect.objectContaining({ valor: 350, pecas: 7, origem: "catalogo", pedidoNumero: pedido.number, atendente: "Fernanda Atendente" }),
    ])
  })

  it("CA-B30-02: voltar para Em atendimento ou cancelar desfaz a compra, no perfil e no dashboard", async () => {
    entrarComo(emailAdmin)
    const faturamentoAntes = (await buscarMetricasDashboard({ periodo: "30d", atendenteId: null }))!.receita.totalCompras

    // Reabrir
    const a = await pedidoNovo("21988880102")
    expect((await mudarSituacaoPedido(a.id, "fechado")).erro).toBeUndefined()
    expect(await comprasDoPedido(a.id)).toHaveLength(1)
    expect((await buscarMetricasDashboard({ periodo: "30d", atendenteId: null }))!.receita.totalCompras).toBe(faturamentoAntes + 350)
    expect((await mudarSituacaoPedido(a.id, "em_atendimento")).erro).toBeUndefined()
    expect(await comprasDoPedido(a.id)).toHaveLength(0)
    expect((await buscarDadosContato(a.contact_id!))?.compras).toEqual([])
    expect((await buscarMetricasDashboard({ periodo: "30d", atendenteId: null }))!.receita.totalCompras).toBe(faturamentoAntes)

    // Cancelar
    const b = await pedidoNovo("21988880103")
    expect((await mudarSituacaoPedido(b.id, "fechado")).erro).toBeUndefined()
    expect(await comprasDoPedido(b.id)).toHaveLength(1)
    expect((await mudarSituacaoPedido(b.id, "cancelado")).erro).toBeUndefined()
    expect(await comprasDoPedido(b.id)).toHaveLength(0)
    expect((await buscarDadosContato(b.contact_id!))?.compras).toEqual([])
  })

  it("CA-B30-03: fechar, reabrir e fechar de novo deixa exatamente uma compra ligada ao pedido", async () => {
    const pedido = await pedidoNovo("21988880104")
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    expect((await mudarSituacaoPedido(pedido.id, "em_atendimento")).erro).toBeUndefined()
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    expect(await comprasDoPedido(pedido.id)).toHaveLength(1)
    const perfil = await buscarDadosContato(pedido.contact_id!)
    expect(perfil?.compras.filter((c) => c.pedidoId === pedido.id)).toHaveLength(1)
  })

  it("CA-B30-04: pedido sem contato fecha sem gerar compra", async () => {
    const pedido = await pedidoNovo("21988880105")
    await service.from("catalog_orders").update({ contact_id: null }).eq("id", pedido.id)
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    expect((await carregarPedido(pedido.id))?.situacao).toBe("fechado")
    expect(await comprasDoPedido(pedido.id)).toHaveLength(0)
  })

  it("CA-B30-21: pedidos fechados antes da mudança ganham compra uma vez só, com a data do fechamento e sem atendente", async () => {
    // Simula um pedido fechado "na época": sem compra, com o evento de fechamento no histórico.
    const pedido = await pedidoNovo("21988880106")
    const fechouEm = "2026-09-15T18:30:00-03:00"
    await service.from("catalog_orders").update({ status: "fechado" }).eq("id", pedido.id)
    await service.from("catalog_order_events").insert({ order_id: pedido.id, from_status: "novo", to_status: "fechado", changed_by: adminId, created_at: fechouEm })
    expect(await comprasDoPedido(pedido.id)).toHaveLength(0)

    const primeira = await service.rpc("gerar_compras_de_pedidos_fechados")
    expect(primeira.error).toBeNull()
    expect(primeira.data).toBeGreaterThanOrEqual(1)
    const compras = await comprasDoPedido(pedido.id)
    expect(compras).toHaveLength(1)
    expect(compras[0]).toMatchObject({ data: "2026-09-15", valor: 350, pecas: 7, origem: "catalogo", atendente_id: null })

    const segunda = await service.rpc("gerar_compras_de_pedidos_fechados")
    expect(segunda.error).toBeNull()
    expect(segunda.data).toBe(0)
    expect(await comprasDoPedido(pedido.id)).toHaveLength(1)
  })

  it("CA-B30-05: compra do catálogo não se apaga nem se edita por fora do pedido", async () => {
    const pedido = await pedidoNovo("21988880107")
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    const [compra] = await comprasDoPedido(pedido.id)

    // Pela chave de serviço (passa pelo RLS): o gatilho recusa.
    const upd = await service.from("contact_purchases").update({ valor: 1 }).eq("id", compra.id)
    expect(upd.error?.message).toMatch(/só muda pelo pedido/)
    const del = await service.from("contact_purchases").delete().eq("id", compra.id)
    expect(del.error?.message).toMatch(/só muda pelo pedido/)

    // Pelo usuário logado: nada muda.
    await navegadores[emailAdmin].from("contact_purchases").update({ valor: 1 }).eq("id", compra.id)
    await navegadores[emailAdmin].from("contact_purchases").delete().eq("id", compra.id)

    const depois = await comprasDoPedido(pedido.id)
    expect(depois).toHaveLength(1)
    expect(Number(depois[0].valor)).toBe(350)

    // O jeito de desfazer continua sendo pelo pedido.
    expect((await mudarSituacaoPedido(pedido.id, "cancelado")).erro).toBeUndefined()
    expect(await comprasDoPedido(pedido.id)).toHaveLength(0)
  })

  it("CA-B30-11: o histórico mostra a compra manual e a do catálogo lado a lado, e o total soma as duas", async () => {
    const pedido = await pedidoNovo("21988880108")
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    const manual = await registrarCompra(pedido.contact_id!, { data: "2026-10-01", valor: "120", pecas: "3", desconto: "", formaPagamento: "pix", atendenteId: adminId })
    expect(manual.erro).toBeUndefined()

    const perfil = await buscarDadosContato(pedido.contact_id!)
    expect(perfil?.compras).toHaveLength(2)
    expect(perfil?.compras).toEqual(expect.arrayContaining([
      expect.objectContaining({ valor: 120, pecas: 3, formaPagamento: "pix", atendente: "Admin Dona", origem: "manual", pedidoId: null }),
      expect.objectContaining({ valor: 350, pecas: 7, formaPagamento: null, atendente: "Admin Dona", origem: "catalogo", pedidoNumero: pedido.number }),
    ]))
    expect(perfil!.compras.reduce((s, c) => s + c.valor, 0)).toBe(470)
  })

  it("CA-B30-12: o número do pedido na compra leva ao pedido do catálogo", async () => {
    const pedido = await pedidoNovo("21988880109")
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    const perfil = await buscarDadosContato(pedido.contact_id!)
    const compra = perfil!.compras.find((c) => c.origem === "catalogo")!
    expect(compra.pedidoId).toBe(pedido.id)
    expect(compra.pedidoNumero).toBe(pedido.number)
    // O link vai para /catalogo/pedidos?pedido=<id>, que abre este pedido.
    const detalhe = await carregarPedido(compra.pedidoId!)
    expect(detalhe).toMatchObject({ id: pedido.id, numero: pedido.number, situacao: "fechado" })
  })

  it("CA-B30-15: a compra do catálogo aparece uma vez na timeline, com o número do pedido, junto do evento do pedido", async () => {
    const pedido = await pedidoNovo("21988880110")
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    const perfil = await buscarDadosContato(pedido.contact_id!)
    const compras = perfil!.timeline.filter((e) => e.tipo === "compra_registrada")
    expect(compras).toHaveLength(1)
    expect(compras[0].descricao).toContain(`Pedido #${pedido.number}`)
    expect(perfil!.timeline.filter((e) => e.tipo === "pedido_catalogo" && e.descricao.startsWith(`Pedido #${pedido.number}`))).toHaveLength(1)
  })
})

describe("B31-02 — desconto do pedido na compra do contato", { timeout: 60_000 }, () => {
  it("CA-B31-17: pedido com desconto fechado no CRM gera compra com valor já com desconto e o desconto em reais", async () => {
    await service.from("catalog_settings").update({ order_discounts: [{ min: 50, percent: 10 }] }).eq("workspace_id", ws)
    // 50 peças de R$ 50 = R$ 2.500,00; 10% = R$ 250,00; total R$ 2.250,00
    const pedido = await pedidoNovo("21977770031", 50)
    await service.from("catalog_settings").update({ order_discounts: [] }).eq("workspace_id", ws)
    entrarComo(emailAdmin)
    expect((await mudarSituacaoPedido(pedido.id, "fechado")).erro).toBeUndefined()
    const [compra] = await comprasDoPedido(pedido.id)
    expect(compra).toMatchObject({ valor: 2250, pecas: 50, desconto: 250, origem: "catalogo" })
  })
})
