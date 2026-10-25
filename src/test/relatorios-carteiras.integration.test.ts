// @vitest-environment node
// B35-01: o histórico de carteira gravado pelo card e lido pela aba. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { atribuirAtendente } from "@/app/(auth)/pipeline/actions"
import { buscarCarteiras, buscarHistoricoDeCarteira } from "@/app/(auth)/relatorios/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", anaId = "", cardId = "", contatoId = ""
const navegadores: Record<string, SupabaseClient> = {}

async function criarUsuario(nome: string, role: string) {
  const email = `b35-01-${nome.toLowerCase()}-${ts}@teste.com`
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
  ws = (await service.from("workspaces").insert({ name: `B35-01 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  contatoId = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja da Ana", phone_number: "5511900003501" }).select("id").single()).data!.id
  cardId = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatoId, funil: "entrada", etapa: "lead" }).select("id").single()).data!.id
}, 90_000)

afterAll(async () => {
  await service.from("carteira_historico").delete().in("workspace_id", criados.workspaceIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B35-01 — histórico de carteira", { timeout: 60_000 }, () => {
  it("CA-B35-12: atribuir o card à Ana grava 'ninguém → Ana · pelo card' e o contato passa a ser dela", async () => {
    entrarComo(adminId)
    await atribuirAtendente(cardId, anaId)
    const { data } = await service.from("carteira_historico").select("de_atendente_id, para_atendente_id, motivo, alterado_por, contact_id").eq("workspace_id", ws)
    expect(data).toEqual([{ de_atendente_id: null, para_atendente_id: anaId, motivo: "pelo_card", alterado_por: adminId, contact_id: contatoId }])
    expect((await service.from("contacts").select("atendente_id").eq("id", contatoId).single()).data?.atendente_id).toBe(anaId)
    // Atribuir de novo à mesma pessoa não grava outra linha.
    await atribuirAtendente(cardId, anaId)
    expect((await service.from("carteira_historico").select("id", { count: "exact", head: true }).eq("workspace_id", ws)).count).toBe(1)
  })

  it("CA-B35-11: buscarCarteiras traz a linha com quando, contato, de, para, motivo e quem fez, e os números da Ana", async () => {
    entrarComo(adminId)
    const r = await buscarCarteiras()
    expect(r?.papel).toBe("admin")
    expect(r?.historico).toHaveLength(1)
    const h = r!.historico![0]
    expect(h).toMatchObject({ contato: "Loja da Ana", de: null, para: "Ana", motivo: "pelo_card", por: "Admin" })
    expect(new Date(h.quando).getTime()).toBeGreaterThan(ts)
    expect(r!.painel.vendedores.find((v) => v.id === anaId)).toMatchObject({ total: 1, leads: 1, base: 0 })
    expect(r!.painel.semVendedor.total).toBe(0)

    // A Ana (Atendente) vê só o próprio cartão e nenhum histórico.
    entrarComo(anaId)
    const dela = await buscarCarteiras()
    expect(dela?.papel).toBe("atendente")
    expect(dela?.historico).toBeNull()
    expect(dela?.painel.vendedores.map((v) => v.id)).toEqual([anaId])
    expect(dela?.painel.vendedores[0].total).toBe(1)
  })
})

describe("Histórico de carteira paginado (ajuste de 25/10/2026)", { timeout: 60_000 }, () => {
  it("10 por página, a mais recente primeiro; as páginas seguintes trazem as que sobram; o Atendente não lê", async () => {
    // Mais 24 linhas, mais antigas que a do card: 25 no total.
    const base = Date.now() - 86_400_000
    await service.from("carteira_historico").insert(Array.from({ length: 24 }, (_, i) => ({
      workspace_id: ws, contact_id: contatoId, de_atendente_id: null, para_atendente_id: anaId,
      motivo: "distribuicao", alterado_por: adminId, created_at: new Date(base - i * 60_000).toISOString(),
    })))
    entrarComo(adminId)
    const r = await buscarCarteiras()
    expect(r?.historico).toHaveLength(10)
    expect(r?.historicoTotal).toBe(25)
    expect(r!.historico![0].motivo).toBe("pelo_card")

    const p1 = await buscarHistoricoDeCarteira(1)
    expect(p1?.total).toBe(25)
    expect(p1?.linhas).toHaveLength(10)
    const p2 = await buscarHistoricoDeCarteira(2)
    expect(p2?.linhas).toHaveLength(5)
    const ids = [...r!.historico!, ...p1!.linhas, ...p2!.linhas].map((h) => h.id)
    expect(new Set(ids).size).toBe(25)
    expect(await buscarHistoricoDeCarteira(-1)).toBeNull()

    entrarComo(anaId)
    expect(await buscarHistoricoDeCarteira(0)).toBeNull()
  })
})
