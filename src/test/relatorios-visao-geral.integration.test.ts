// @vitest-environment node
// B32-03: a ação da Visão Geral com a regra do atendente (a mesma do Dashboard, B30-03).
// Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarVisaoGeral } from "@/app/(auth)/relatorios/actions"
import { hojeNoFuso, periodoPadrao } from "@/lib/relatorios/visao-geral"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", anaId = "", brunoId = ""
const navegadores: Record<string, SupabaseClient> = {}
const hoje = hojeNoFuso()
const periodo = periodoPadrao(hoje)

async function criarUsuario(nome: string, role: string) {
  const email = `b32-03-${nome.toLowerCase()}-${ts}@teste.com`
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

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B32-03 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")

  const contato = async (tel: string) =>
    (await service.from("contacts").insert({ workspace_id: ws, phone_number: tel, name: `Contato ${tel}` }).select("id").single()).data!.id
  const c1 = await contato("5511900003201")
  const c2 = await contato("5511900003202")
  const c3 = await contato("5511900003203")
  // c1 e c3 são contatos da Ana (cards dela): o Atendente só enxerga compras dos
  // próprios contatos (RLS da B20). A compra de c3 não tem atendente.
  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: c1, funil: "entrada", etapa: "ganho", atendente_id: anaId },
    { workspace_id: ws, contact_id: c3, funil: "recompra", etapa: "ativos", atendente_id: anaId },
  ])

  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: c1, data: hoje, valor: 100, atendente_id: anaId, origem: "manual" },
    { workspace_id: ws, contact_id: c2, data: hoje, valor: 250, atendente_id: brunoId, origem: "manual" },
    { workspace_id: ws, contact_id: c3, data: hoje, valor: 40, atendente_id: null, origem: "manual" },
  ])
}, 90_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B32-03 — buscarVisaoGeral e o atendente", { timeout: 60_000 }, () => {
  it("CA-B32-05: logada como Atendente, a Ana só vê as vendas dela, mesmo pedindo o Bruno", async () => {
    entrarComo(anaId)
    const r = await buscarVisaoGeral({ periodo, atendenteId: brunoId })
    expect(r?.atendenteId).toBe(anaId)
    // R$ 100 com atendente Ana + R$ 40 do contato cujo card é dela.
    expect(r?.resumo.faturamentoLiquido).toBe(140)
    expect(r?.resumo.quantidadeVendas).toBe(2)
  })

  it("CA-B32-06: o Admin sem filtro vê tudo e, filtrando o Bruno, só as vendas dele", async () => {
    entrarComo(adminId)
    const tudo = await buscarVisaoGeral({ periodo, atendenteId: null })
    expect(tudo?.resumo.faturamentoLiquido).toBe(390)
    expect(tudo?.resumo.clientesPositivados).toBe(3)

    const bruno = await buscarVisaoGeral({ periodo, atendenteId: brunoId })
    expect(bruno?.atendenteId).toBe(brunoId)
    expect(bruno?.resumo.faturamentoLiquido).toBe(250)
    expect(bruno?.resumo.quantidadeVendas).toBe(1)
  })
})
