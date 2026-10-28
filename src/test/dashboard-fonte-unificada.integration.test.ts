// @vitest-environment node
// B30-03: dashboard e performance por vendedor leem todas as compras (manuais e do
// catálogo) e atribuem cada uma ao atendente da venda. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarMetricasDashboard, buscarPerformanceVendedores } from "@/app/(auth)/dashboard/actions"
import { mudarSituacaoPedido } from "@/app/(auth)/catalogo/pedidos/actions"
import { registrarCompra } from "@/app/(auth)/contatos/actions"
import { registrarPedido } from "@/lib/catalogo/pedidos"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const slug = `b30-03-${ts}`
const criados = { workspaceIds: [] as string[], userIds: [] as string[], conexaoIds: [] as string[] }
let ws = "", adminId = "", anaId = "", brunoId = "", contatoId = ""
const navegadores: Record<string, SupabaseClient> = {}
const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) // yyyy-mm-dd

async function criarUsuario(nome: string, role: string) {
  const email = `b30-03-${nome.toLowerCase()}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: nome, role, status: "active" })
  criados.userIds.push(data.user!.id)
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[data.user!.id] = c
  return data.user!.id
}
const entrarComo = (id: string) => mockSsr.mockResolvedValue(navegadores[id] as never)
const filtro = { periodo: "30d" as const, atendenteId: null }

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B30-03 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")

  // Loja do catálogo com um produto de R$ 250, e um pedido de 1 peça feito pela cliente.
  const conexao = (await service.from("whatsapp_connections").insert({ workspace_id: ws, canal: "gateway", status: "connected", phone_number: "5511900000003", instance_id: `inst_b3003_${ts}`, instance_token: "t" }).select("id").single()).data!.id
  criados.conexaoIds.push(conexao)
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000003", published: true })
  const produto = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Kit", price: 250 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: produto, combination: "", quantity: 100 })
  const r = await registrarPedido(slug, { nome: "Cliente Dash", whatsapp: "21988880301" }, [{ produtoId: produto, combinacao: "", quantidade: 1 }])
  if (!r.ok) throw new Error(r.erro)
  const pedido = (await service.from("catalog_orders").select("id, contact_id").eq("workspace_id", ws).eq("number", r.numero).single()).data!
  contatoId = pedido.contact_id!

  // O card do contato no funil de recompra é da Ana. B45-02: ela é a dona do contato.
  await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatoId, funil: "recompra", etapa: "ativos", atendente_id: anaId })
  await service.from("contacts").update({ atendente_id: anaId }).eq("id", contatoId)

  // Admin fecha o pedido (compra do catálogo, R$ 250, atendente = Admin) e registra a manual de R$ 100 com o Bruno.
  entrarComo(adminId)
  const fechado = await mudarSituacaoPedido(pedido.id, "fechado")
  if (fechado.erro) throw new Error(fechado.erro)
  const manual = await registrarCompra(contatoId, { data: hoje, valor: "100", pecas: "", desconto: "", formaPagamento: "", atendenteId: brunoId })
  if (manual.erro) throw new Error(manual.erro)
}, 90_000)

afterAll(async () => {
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

describe("B30-03 — Dashboard e performance na fonte unificada", { timeout: 60_000 }, () => {
  it("CA-B30-16: o dashboard soma a compra manual de R$ 100 e a do catálogo de R$ 250: R$ 350 em 2 compras", async () => {
    entrarComo(adminId)
    const m = await buscarMetricasDashboard(filtro)
    expect(m?.receita.totalCompras).toBe(350)
    expect(m?.receita.quantidadeCompras).toBe(2)

    // B45-04 (PER-B45-06) substituiu a regra da B30-03: o filtro por atendente segue a
    // carteira, não o vendedor da venda. As duas compras são da Ana, dona do cliente.
    expect((await buscarMetricasDashboard({ ...filtro, atendenteId: anaId }))?.receita.totalCompras).toBe(350)
    expect((await buscarMetricasDashboard({ ...filtro, atendenteId: brunoId }))?.receita.totalCompras).toBe(0)
    expect((await buscarMetricasDashboard({ ...filtro, atendenteId: adminId }))?.receita.totalCompras).toBe(0)
  })

  // B45-04 (PER-B45-06) substituiu a regra da B30-03: a compra registrada com o Bruno
  // entra no ticket da Ana, dona do cliente, e não no dele.
  it("CA-B30-17: a compra registrada com o Bruno entra no ticket da Ana, dona do cliente, e não no dele", async () => {
    entrarComo(adminId)
    const linhas = (await buscarPerformanceVendedores(filtro))!
    const bruno = linhas.find((l) => l.atendenteId === brunoId)!
    const ana = linhas.find((l) => l.atendenteId === anaId)!
    expect(ana.ticketMedio).toBe(175)
    expect(bruno.ticketMedio).toBeNull()
  })

  it("CA-B30-18: a compra sem atendente conta para a Ana, dona do cliente", async () => {
    // Compra antiga, sem atendente (inserida direto, como as de antes da B30-01).
    const { data: antiga } = await service.from("contact_purchases").insert({ contact_id: contatoId, workspace_id: ws, data: hoje, valor: 80 }).select("id").single()
    try {
      entrarComo(adminId)
      const linhas = (await buscarPerformanceVendedores(filtro))!
      const ana = linhas.find((l) => l.atendenteId === anaId)!
      const bruno = linhas.find((l) => l.atendenteId === brunoId)!
      // B45-04: as três compras do cliente dela (100 + 250 + 80) entram no ticket da Ana
      expect(ana.ticketMedio).toBeCloseTo(430 / 3, 2)
      expect(bruno.ticketMedio).toBeNull()
      // E no dashboard filtrado pela Ana ela aparece.
      expect((await buscarMetricasDashboard({ ...filtro, atendenteId: anaId }))?.receita.totalCompras).toBe(430)
    } finally {
      await service.from("contact_purchases").delete().eq("id", antiga!.id)
    }
  })
})
