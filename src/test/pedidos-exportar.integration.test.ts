// @vitest-environment node
// B39-02 — exportação da tela Pedidos (rota /catalogo/pedidos/exportar) no banco de verdade.
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/catalogo/pedidos/exportar/route"
import { COLUNAS_ITENS, COLUNAS_PEDIDOS } from "@/lib/catalogo/exportar-pedidos"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL_SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL_SUPA, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const ts = Date.now()
const email = (quem: string) => `${quem}-${ts}@pedidos-exportar-test.com`
const tel = (n: number) => `5585${String(ts % 1e5).padStart(5, "0")}${String(n).padStart(4, "0")}`

async function criarWorkspace(nome: string) {
  const { data: ws } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  criados.workspaceIds.push(ws!.id)
  return ws!.id as string
}

async function criarUsuario(workspaceId: string, quem: string, role: "admin" | "atendente") {
  const { data } = await serviceClient.auth.admin.createUser({ email: email(quem), password: SENHA, email_confirm: true })
  await serviceClient.from("profiles").insert({ id: data.user!.id, workspace_id: workspaceId, name: quem, role, status: "active" })
  criados.userIds.push(data.user!.id)
}

const clientes: Record<string, SupabaseClient> = {}
async function entrarComo(quem: string) {
  if (!clientes[quem]) {
    const client = createClient(URL_SUPA, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await client.auth.signInWithPassword({ email: email(quem), password: SENHA })
    if (error) throw new Error(error.message)
    clientes[quem] = client
  }
  mockSsrCreateClient.mockResolvedValue(clientes[quem] as never)
}

async function baixar(params: Record<string, string>) {
  const resposta = await GET(new Request(`http://localhost/catalogo/pedidos/exportar?${new URLSearchParams(params)}`))
  expect(resposta.status).toBe(200)
  return resposta
}

async function abas(params: Record<string, string>) {
  const resposta = await baixar({ formato: "xlsx", ...params })
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array", cellDates: true })
  const linhas = (nome: string) => XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets[nome], { header: 1, raw: true })
  return { nomes: livro.SheetNames, pedidos: linhas("Pedidos"), itens: linhas("Itens") }
}

const OUTUBRO = { escopo: "filtrados", periodo: "personalizado", de: "2026-10-05", ate: "2026-10-15" }
let numero = 0

beforeAll(async () => {
  const wsA = await criarWorkspace("Empresa Exportar A")
  const wsB = await criarWorkspace("Empresa Exportar B")
  await criarUsuario(wsA, "admin-a", "admin")
  await criarUsuario(wsA, "atendente-a", "atendente")

  const pedido = (ws: string, nome: string, total: number, status: string, criadoEm: string) => ({
    workspace_id: ws, number: ++numero, customer_name: nome, customer_whatsapp: tel(numero), pieces: 1, total, status, created_at: criadoEm,
  })
  const { data } = await serviceClient
    .from("catalog_orders")
    .insert([
      pedido(wsA, "Conceição", 1234.5, "fechado", "2026-10-10T15:00:00Z"),
      pedido(wsA, "Bruna", 200, "novo", "2026-10-12T15:00:00Z"),
      pedido(wsA, "Carla", 99, "cancelado", "2026-10-20T15:00:00Z"),
      pedido(wsB, "Empresa B", 50, "novo", "2026-10-11T15:00:00Z"),
    ])
    .select("id, customer_name")
  const id = (nome: string) => data!.find((p) => p.customer_name === nome)!.id
  await serviceClient.from("catalog_order_items").insert([
    { order_id: id("Conceição"), product_name: "Blusa", combination: "P / Azul", quantity: 2, unit_price: 300, position: 0 },
    { order_id: id("Conceição"), product_name: "Saia", combination: "", quantity: 1, unit_price: 634.5, position: 1 },
    { order_id: id("Bruna"), product_name: "Bermuda", combination: "M", quantity: 1, unit_price: 200, position: 0 },
    { order_id: id("Empresa B"), product_name: "De outra empresa", combination: "", quantity: 1, unit_price: 50, position: 0 },
  ])
}, 60_000)

afterAll(async () => {
  await serviceClient.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await serviceClient.from("catalog_orders").delete().in("workspace_id", criados.workspaceIds)
  await serviceClient.from("profiles").delete().in("id", criados.userIds)
  for (const u of criados.userIds) await serviceClient.auth.admin.deleteUser(u)
  await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
}, 60_000)

describe("B39-02 — exportar pedidos", { timeout: 30_000 }, () => {
  it("CA-B39-12: should gerar o Excel com as abas Pedidos e Itens, data como data e valor como número", async () => {
    await entrarComo("admin-a")
    const { nomes, pedidos, itens } = await abas(OUTUBRO)

    expect(nomes).toEqual(["Pedidos", "Itens"])
    expect(pedidos[0]).toEqual(["Número", "Data", "Cliente", "WhatsApp", "Peças", "Desconto", "Total", "Situação"])
    expect(itens[0]).toEqual(["Pedido", "Data", "Cliente", "Produto", "Variação", "Quantidade", "Preço unitário", "Subtotal"])
    expect(pedidos.slice(1)).toHaveLength(2)
    expect(itens.slice(1)).toHaveLength(3)

    const conceicao = pedidos.slice(1).find((l) => l[2] === "Conceição")!
    expect(conceicao[1]).toBeInstanceOf(Date)
    expect(conceicao[6]).toBe(1234.5)
    expect(conceicao[7]).toBe("Fechado")
    const blusa = itens.slice(1).find((l) => l[3] === "Blusa")!
    expect(blusa.slice(4)).toEqual(["P / Azul", 2, 300, 600])
  })

  it("CA-B39-13: should exportar só os pedidos filtrados e os itens deles", async () => {
    await entrarComo("admin-a")
    const { pedidos, itens } = await abas({ ...OUTUBRO, situacao: "fechado" })
    expect(pedidos.slice(1).map((l) => l[2])).toEqual(["Conceição"])
    expect(itens.slice(1).map((l) => l[3])).toEqual(["Blusa", "Saia"])
  })

  it("CA-B39-14: should exportar todos os pedidos mesmo com filtro na tela", async () => {
    await entrarComo("admin-a")
    const { pedidos } = await abas({ escopo: "todos", situacao: "fechado", periodo: "personalizado", de: "2026-10-05", ate: "2026-10-15" })
    expect(pedidos.slice(1).map((l) => l[2]).sort()).toEqual(["Bruna", "Carla", "Conceição"])
  })

  it("CA-B39-15: should gerar o CSV de pedidos no formato do Excel em português", async () => {
    await entrarComo("admin-a")
    const resposta = await baixar({ formato: "csv-pedidos", ...OUTUBRO })
    const texto = new TextDecoder("utf-8", { ignoreBOM: true }).decode(await resposta.arrayBuffer())

    expect(texto.charCodeAt(0)).toBe(0xfeff)
    const linhas = texto.slice(1).trim().split("\r\n")
    expect(linhas[0]).toBe(COLUNAS_PEDIDOS.map((c) => c.titulo).join(";"))
    const conceicao = linhas.find((l) => l.includes("Conceição"))!.split(";")
    expect(conceicao[1]).toBe("10/10/2026")
    expect(conceicao[6]).toBe("1234,50")
  })

  it("CA-B39-16: should gerar o CSV de itens com as colunas da aba Itens", async () => {
    await entrarComo("admin-a")
    const resposta = await baixar({ formato: "csv-itens", ...OUTUBRO })
    const linhas = (await resposta.text()).replace(/^﻿/, "").trim().split("\r\n")
    expect(linhas[0]).toBe(COLUNAS_ITENS.map((c) => c.titulo).join(";"))
    expect(linhas.slice(1)).toHaveLength(3)
    expect(linhas.find((l) => l.includes("Blusa"))!.split(";").slice(4)).toEqual(["P / Azul", "2", "300,00", "600,00"])
  })

  it("CA-B39-17: should deixar o Atendente exportar, só com pedidos da própria empresa", async () => {
    await entrarComo("atendente-a")
    const { pedidos, itens } = await abas({ escopo: "todos" })
    expect(pedidos.slice(1).map((l) => l[2]).sort()).toEqual(["Bruna", "Carla", "Conceição"])
    expect(itens.slice(1).map((l) => l[3])).not.toContain("De outra empresa")
  })

  it("CA-B39-18: should dar ao arquivo um nome que diz o período ou que são todos", async () => {
    await entrarComo("admin-a")
    const nome = async (params: Record<string, string>) =>
      (await baixar(params)).headers.get("Content-Disposition")!.match(/filename="(.+)"/)![1]

    expect(await nome({ formato: "xlsx", ...OUTUBRO })).toBe("pedidos-2026-10-05-a-2026-10-15.xlsx")
    expect(await nome({ formato: "xlsx", escopo: "todos" })).toBe("pedidos-todos.xlsx")
    expect(await nome({ formato: "csv-pedidos", ...OUTUBRO })).toBe("pedidos-2026-10-05-a-2026-10-15.csv")
    expect(await nome({ formato: "csv-itens", ...OUTUBRO })).toBe("pedidos-2026-10-05-a-2026-10-15-itens.csv")
  })
})
