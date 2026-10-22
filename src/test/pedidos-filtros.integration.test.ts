// @vitest-environment node
// B39-01 — filtros da tela Pedidos no banco de verdade (função filtrar_pedidos).
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { filtrarPedidos, opcoesDosFiltros } from "@/app/(auth)/catalogo/pedidos/actions"
import { FILTROS_PADRAO, type FiltrosPedidos } from "@/lib/catalogo/filtros-pedidos"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const ts = Date.now()
const email = (quem: string) => `${quem}-${ts}@pedidos-filtros-test.com`
const tel = (n: number) => `5585${String(ts % 1e5).padStart(5, "0")}${String(n).padStart(4, "0")}`

async function criarWorkspace(nome: string) {
  const { data: ws } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}`)
  criados.workspaceIds.push(ws.id)
  return ws.id as string
}

async function criarUsuario(workspaceId: string, quem: string, role: "admin" | "atendente") {
  const { data: authData } = await serviceClient.auth.admin.createUser({ email: email(quem), password: SENHA, email_confirm: true })
  if (!authData.user) throw new Error(`Falha ao criar user ${quem}`)
  await serviceClient.from("profiles").insert({ id: authData.user.id, workspace_id: workspaceId, name: quem, role, status: "active" })
  criados.userIds.push(authData.user.id)
  return authData.user.id
}

const clientes: Record<string, SupabaseClient> = {}
async function entrarComo(quem: string) {
  if (!clientes[quem]) {
    const client = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await client.auth.signInWithPassword({ email: email(quem), password: SENHA })
    if (error) throw new Error(`Falha ao autenticar ${quem}: ${error.message}`)
    clientes[quem] = client
  }
  mockSsrCreateClient.mockResolvedValue(clientes[quem] as never)
}

type Pedido = {
  nome: string
  criadoEm: string
  total: number
  status?: string
  contato?: string | null
}

let numero = 0
async function criarPedidos(workspaceId: string, pedidos: Pedido[]) {
  const { data, error } = await serviceClient
    .from("catalog_orders")
    .insert(
      pedidos.map((p, i) => ({
        workspace_id: workspaceId,
        number: ++numero,
        customer_name: p.nome,
        customer_whatsapp: tel(numero + i),
        pieces: 1,
        total: p.total,
        status: p.status ?? "novo",
        contact_id: p.contato ?? null,
        created_at: p.criadoEm,
      }))
    )
    .select("id, customer_name")
  if (error || !data) throw new Error(`Falha ao criar pedidos: ${error?.message}`)
  return Object.fromEntries(data.map((p) => [p.customer_name as string, p.id as string]))
}

async function filtrar(parcial: Partial<FiltrosPedidos>) {
  const r = await filtrarPedidos({ ...FILTROS_PADRAO, periodo: "tudo", ...parcial })
  if ("erro" in r) throw new Error(r.erro)
  return { ids: r.pedidos.map((p) => p.id), total: r.total }
}

const doCenario = (ids: string[], cenario: string[]) => ids.filter((id) => cenario.includes(id)).sort()
const ordenados = (ids: string[]) => [...ids].sort()
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

let P: Record<string, string>
let blusaLisa: string
let ana: string

beforeAll(async () => {
  const ws = await criarWorkspace("Empresa Pedidos A")
  await criarUsuario(ws, "admin-a", "admin")
  ana = await criarUsuario(ws, "ana", "atendente")
  const bruno = await criarUsuario(ws, "bruno", "atendente")

  const { data: contatos } = await serviceClient
    .from("contacts")
    .insert([
      { workspace_id: ws, phone_number: tel(9001), name: "Cli Antiga", atendente_id: ana },
      { workspace_id: ws, phone_number: tel(9002), name: "Cli Nova", atendente_id: bruno },
      { workspace_id: ws, phone_number: tel(9003), name: "Cli Sem Atendente" },
    ])
    .select("id, name")
  const contato = (nome: string) => contatos!.find((c) => c.name === nome)!.id as string
  await serviceClient.from("contact_purchases").insert({ workspace_id: ws, contact_id: contato("Cli Antiga"), valor: 100, data: diasAtras(60).slice(0, 10) })

  P = await criarPedidos(ws, [
    { nome: "Dia 01", criadoEm: "2026-10-01T15:00:00Z", total: 50 },
    { nome: "Dia 10", criadoEm: "2026-10-10T15:00:00Z", total: 50 },
    { nome: "Dia 15 23h", criadoEm: "2026-10-16T02:00:00Z", total: 50 },
    { nome: "Dia 16 0h30", criadoEm: "2026-10-16T03:30:00Z", total: 50 },
    { nome: "Dia 20", criadoEm: "2026-10-20T15:00:00Z", total: 50 },
    { nome: "Hoje", criadoEm: new Date(Date.now() - 60_000).toISOString(), total: 60 },
    { nome: "Ha 5 dias", criadoEm: diasAtras(5), total: 60 },
    { nome: "Ha 20 dias", criadoEm: diasAtras(20), total: 60 },
    { nome: "Valor 300", criadoEm: diasAtras(2), total: 300 },
    { nome: "Valor 800", criadoEm: diasAtras(2), total: 800 },
    { nome: "Valor 1500", criadoEm: diasAtras(2), total: 1500 },
    { nome: "Com Blusa", criadoEm: diasAtras(3), total: 70 },
    { nome: "Sem Blusa", criadoEm: diasAtras(3), total: 70 },
    { nome: "Com Saia Antiga", criadoEm: diasAtras(90), total: 70 },
    { nome: "Pedido Antiga", criadoEm: diasAtras(1), total: 900, status: "fechado", contato: contato("Cli Antiga") },
    { nome: "Pedido Nova", criadoEm: diasAtras(1), total: 600, status: "fechado", contato: contato("Cli Nova") },
    { nome: "Pedido Sem Atendente", criadoEm: diasAtras(1), total: 400, contato: contato("Cli Sem Atendente") },
  ])

  const { data: blusa } = await serviceClient.from("catalog_products").insert({ workspace_id: ws, name: `Blusa Lisa ${ts}`, price: 70 }).select("id").single()
  blusaLisa = blusa!.id
  await serviceClient.from("catalog_order_items").insert([
    { order_id: P["Com Blusa"], product_id: blusaLisa, product_name: `Blusa Lisa ${ts}`, quantity: 1, unit_price: 70 },
    { order_id: P["Sem Blusa"], product_name: "Outra coisa", quantity: 1, unit_price: 70 },
    { order_id: P["Com Saia Antiga"], product_id: null, product_name: `Saia Antiga ${ts}`, quantity: 1, unit_price: 70 },
  ])
}, 90_000)

afterAll(async () => {
  if (criados.workspaceIds.length > 0) {
    await serviceClient.from("catalog_orders").delete().in("workspace_id", criados.workspaceIds)
    await serviceClient.from("catalog_products").delete().in("workspace_id", criados.workspaceIds)
    await serviceClient.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
    await serviceClient.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  }
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await serviceClient.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length > 0) await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
}, 90_000)

describe("B39-01 — filtros da tela Pedidos no banco", { timeout: 60_000 }, () => {
  it("CA-B39-01: should trazer só os pedidos do período personalizado, com os dias inteiros em Brasília", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ periodo: "personalizado", de: "2026-10-05", ate: "2026-10-15" })
    const cenario = [P["Dia 01"], P["Dia 10"], P["Dia 15 23h"], P["Dia 16 0h30"], P["Dia 20"]]
    expect(doCenario(r.ids, cenario)).toEqual(ordenados([P["Dia 10"], P["Dia 15 23h"]]))
  })

  it("CA-B39-03: should manter os atalhos Hoje e Últimos 7 dias", async () => {
    await entrarComo("admin-a")
    const cenario = [P["Hoje"], P["Ha 5 dias"], P["Ha 20 dias"]]
    const hoje = await filtrar({ periodo: "hoje" })
    expect(doCenario(hoje.ids, cenario)).toEqual([P["Hoje"]])
    const sete = await filtrar({ periodo: "7" })
    expect(doCenario(sete.ids, cenario)).toEqual(ordenados([P["Hoje"], P["Ha 5 dias"]]))
  })

  it("CA-B39-04: should filtrar pelo valor mínimo e máximo do pedido", async () => {
    await entrarComo("admin-a")
    const cenario = [P["Valor 300"], P["Valor 800"], P["Valor 1500"]]
    const minimo = await filtrar({ valorMin: "500" })
    expect(doCenario(minimo.ids, cenario)).toEqual(ordenados([P["Valor 800"], P["Valor 1500"]]))
    const faixa = await filtrar({ valorMin: "500", valorMax: "1000" })
    expect(doCenario(faixa.ids, cenario)).toEqual([P["Valor 800"]])
  })

  it("CA-B39-05: should trazer só os pedidos que têm o produto escolhido", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ produtoId: blusaLisa })
    expect(r.ids).toEqual([P["Com Blusa"]])
  })

  it("CA-B39-19: should manter o produto apagado nas opções e achar o pedido antigo por ele", async () => {
    await entrarComo("admin-a")
    const { produtos } = await opcoesDosFiltros()
    expect(produtos).toContainEqual({ id: null, nome: `Saia Antiga ${ts}`, apagado: true })
    expect(produtos).toContainEqual({ id: blusaLisa, nome: `Blusa Lisa ${ts}`, apagado: false })

    const r = await filtrar({ produtoNome: `Saia Antiga ${ts}` })
    expect(r.ids).toEqual([P["Com Saia Antiga"]])
  })

  it("CA-B39-06: should separar cliente nova de cliente antiga", async () => {
    await entrarComo("admin-a")
    const cenario = [P["Pedido Antiga"], P["Pedido Nova"]]
    const nova = await filtrar({ cliente: "nova" })
    expect(doCenario(nova.ids, cenario)).toEqual([P["Pedido Nova"]])
    const antiga = await filtrar({ cliente: "antiga" })
    expect(doCenario(antiga.ids, cenario)).toEqual([P["Pedido Antiga"]])
  })

  it("CA-B39-07: should filtrar pelo atendente da cliente e por sem atendente", async () => {
    await entrarComo("admin-a")
    const cenario = [P["Pedido Antiga"], P["Pedido Nova"], P["Pedido Sem Atendente"]]
    const daAna = await filtrar({ atendente: ana })
    expect(daAna.ids).toEqual([P["Pedido Antiga"]])
    const sem = await filtrar({ atendente: "sem" })
    expect(doCenario(sem.ids, cenario)).toEqual([P["Pedido Sem Atendente"]])
  })

  it("CA-B39-08: should valer todos os filtros juntos", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ situacao: "fechado", valorMin: "500", cliente: "nova" })
    expect(r.ids).toEqual([P["Pedido Nova"]])
  })

  it("CA-B39-09: should achar o pedido mais antigo de uma empresa com mais de 500 pedidos", async () => {
    const wsB = await criarWorkspace("Empresa Pedidos B")
    await criarUsuario(wsB, "admin-b", "admin")
    const pedidos: Pedido[] = Array.from({ length: 501 }, (_, i) => ({
      nome: `B ${i}`,
      criadoEm: diasAtras(i + 1),
      total: i === 500 ? 777.77 : 100,
    }))
    const B = await criarPedidos(wsB, pedidos)

    await entrarComo("admin-b")
    const tudo = await filtrar({})
    expect(tudo.total).toBe(501)
    expect(tudo.ids).toHaveLength(500)
    expect(tudo.ids).not.toContain(B["B 500"])

    const r = await filtrar({ valorMin: "777", valorMax: "778" })
    expect(r.ids).toEqual([B["B 500"]])
    expect(r.total).toBe(1)
  })
})
