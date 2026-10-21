// @vitest-environment node
// B35-02: transferir e remover carteira no servidor, com cards e histórico. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarCarteiras, removerCarteira, transferirCarteira } from "@/app/(auth)/relatorios/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", anaId = "", brunoId = "", cardId = ""
const navegadores: Record<string, SupabaseClient> = {}

async function criarUsuario(nome: string, role: string) {
  const email = `b35-02-${nome.toLowerCase()}-${ts}@teste.com`
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
const donos = async () => (await service.from("contacts").select("atendente_id").eq("workspace_id", ws)).data!.map((c) => c.atendente_id)
const historico = async () => (await service.from("carteira_historico").select("de_atendente_id, para_atendente_id, motivo, alterado_por").eq("workspace_id", ws).order("created_at")).data!

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B35-02 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")
  const contato = async (nome: string, tel: string, atendente: string | null) =>
    (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: tel, atendente_id: atendente }).select("id").single()).data!.id
  const a1 = await contato("Ana 1", "5511900003521", anaId)
  await contato("Ana 2", "5511900003522", anaId)
  await contato("Ana 3", "5511900003523", anaId)
  await contato("Bruno 1", "5511900003524", brunoId)
  cardId = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: a1, funil: "recompra", etapa: "ativos", atendente_id: anaId }).select("id").single()).data!.id
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

describe("B35-02 — transferir e remover carteira", { timeout: 60_000 }, () => {
  it("CA-B35-04: o Atendente é recusado com 'Sem permissão'", async () => {
    entrarComo(anaId)
    expect((await transferirCarteira(anaId, brunoId)).erro).toBe("Sem permissão")
    expect((await removerCarteira(anaId)).erro).toBe("Sem permissão")
    expect((await donos()).filter((d) => d === anaId)).toHaveLength(3)
  })

  it("CA-B35-05: Ana (3) → Bruno: contatos e card com o Bruno, Ana 0, Bruno 4, 3 linhas de transferência", async () => {
    entrarComo(adminId)
    expect(await transferirCarteira(anaId, brunoId)).toEqual({ quantidade: 3 })
    expect((await donos()).filter((d) => d === brunoId)).toHaveLength(4)
    expect((await service.from("pipeline_cards").select("atendente_id").eq("id", cardId).single()).data?.atendente_id).toBe(brunoId)
    const h = await historico()
    expect(h).toHaveLength(3)
    expect(h.every((l) => l.de_atendente_id === anaId && l.para_atendente_id === brunoId && l.motivo === "transferencia" && l.alterado_por === adminId)).toBe(true)
    const r = await buscarCarteiras()
    expect(r!.painel.vendedores.find((v) => v.id === anaId)?.total).toBe(0)
    expect(r!.painel.vendedores.find((v) => v.id === brunoId)?.total).toBe(4)
    expect(r!.historico![0]).toMatchObject({ de: "Ana", para: "Bruno", motivo: "transferencia", por: "Admin" })
    // Para si mesmo ou para alguém de fora: recusado.
    expect((await transferirCarteira(brunoId, brunoId)).erro).toBe("Escolha outro vendedor.")
    expect((await transferirCarteira(brunoId, "00000000-0000-0000-0000-000000000000")).erro).toBe("Vendedor não encontrado")
  })

  it("CA-B35-06: remover a carteira do Bruno: contatos e cards sem atendente, sem-vendedor sobe 4, 4 linhas de remoção", async () => {
    entrarComo(adminId)
    const antes = (await buscarCarteiras())!.painel.semVendedor.total
    expect(await removerCarteira(brunoId)).toEqual({ quantidade: 4 })
    expect((await donos()).every((d) => d === null)).toBe(true)
    expect((await service.from("pipeline_cards").select("atendente_id").eq("id", cardId).single()).data?.atendente_id).toBeNull()
    const h = (await historico()).filter((l) => l.motivo === "remocao")
    expect(h).toHaveLength(4)
    expect(h.every((l) => l.de_atendente_id === brunoId && l.para_atendente_id === null)).toBe(true)
    const r = await buscarCarteiras()
    expect(r!.painel.semVendedor.total).toBe(antes + 4)
    expect(r!.historico![0]).toMatchObject({ de: "Bruno", para: null, motivo: "remocao" })
    // Carteira já vazia: nada a fazer.
    expect(await removerCarteira(brunoId)).toEqual({ quantidade: 0 })
  })
})
