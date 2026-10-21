// @vitest-environment node
// B35-03: distribuir os sem vendedor em rodízio e reprocessar pela última venda. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { distribuirSemVendedor, removerCarteira, reprocessarPelaUltimaVenda } from "@/app/(auth)/relatorios/actions"
import { hojeNoFuso, deslocarMeses } from "@/lib/relatorios/visao-geral"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", anaId = "", brunoId = ""
const ids: string[] = []
let comDono = "", cardId = ""
const navegadores: Record<string, SupabaseClient> = {}
const hoje = hojeNoFuso()

async function criarUsuario(nome: string, role: string) {
  const email = `b35-03-${nome.toLowerCase()}-${ts}@teste.com`
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
const dono = async (id: string) => (await service.from("contacts").select("atendente_id").eq("id", id).single()).data!.atendente_id
const historico = async (motivo: string) => (await service.from("carteira_historico").select("contact_id, de_atendente_id, para_atendente_id").eq("workspace_id", ws).eq("motivo", motivo)).data!

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B35-03 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")
  // 5 sem vendedor na ordem de cadastro: c1, c2, c3 com compra; c4, c5 leads. c6 já tem dono (Ana).
  for (let i = 1; i <= 5; i++) {
    const id = (await service.from("contacts").insert({ workspace_id: ws, name: `Contato ${i}`, phone_number: `55119000035${30 + i}`, created_at: new Date(ts + i * 1000).toISOString() }).select("id").single()).data!.id
    ids.push(id)
  }
  comDono = (await service.from("contacts").insert({ workspace_id: ws, name: "Com dono", phone_number: "5511900003540", atendente_id: anaId }).select("id").single()).data!.id
  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: ids[0], data: hoje, valor: 100, origem: "manual", atendente_id: brunoId },
    { workspace_id: ws, contact_id: ids[0], data: deslocarMeses(hoje, -1), valor: 100, origem: "manual", atendente_id: anaId },
    { workspace_id: ws, contact_id: ids[1], data: hoje, valor: 100, origem: "manual", atendente_id: null },
    { workspace_id: ws, contact_id: ids[2], data: hoje, valor: 100, origem: "manual", atendente_id: null },
  ])
  cardId = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: ids[0], funil: "recompra", etapa: "ativos" }).select("id").single()).data!.id
}, 90_000)

afterAll(async () => {
  await service.from("carteira_historico").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B35-03 — distribuir e reprocessar", { timeout: 60_000 }, () => {
  it("CA-B35-10: reprocessar pela última venda: só o contato com última venda do Bruno passa a ser dele, card incluído", async () => {
    entrarComo(anaId)
    expect((await reprocessarPelaUltimaVenda()).erro).toBe("Sem permissão")
    entrarComo(adminId)
    expect(await reprocessarPelaUltimaVenda()).toEqual({ quantidade: 1 })
    expect(await dono(ids[0])).toBe(brunoId) // última venda (hoje) é do Bruno, não da Ana (mês passado)
    expect(await dono(ids[1])).toBeNull() // vendas sem atendente
    expect(await dono(ids[3])).toBeNull() // lead
    expect((await service.from("pipeline_cards").select("atendente_id").eq("id", cardId).single()).data?.atendente_id).toBe(brunoId)
    const h = await historico("ultima_venda")
    expect(h).toEqual([{ contact_id: ids[0], de_atendente_id: null, para_atendente_id: brunoId }])
    // Volta o contato para "sem vendedor" para os testes seguintes.
    await service.from("contacts").update({ atendente_id: null }).eq("id", ids[0])
    await service.from("pipeline_cards").update({ atendente_id: null }).eq("id", cardId)
  })

  it("CA-B35-09: 'só com compra' dá vendedor aos 3 com compra e deixa os 2 leads sem", async () => {
    entrarComo(adminId)
    expect(await distribuirSemVendedor([anaId, brunoId], true)).toEqual({ quantidade: 3 })
    expect([await dono(ids[0]), await dono(ids[1]), await dono(ids[2])]).toEqual([anaId, brunoId, anaId])
    expect(await dono(ids[3])).toBeNull()
    expect(await dono(ids[4])).toBeNull()
    expect(await historico("distribuicao")).toHaveLength(3)
    // Desfaz para o teste do rodízio completo.
    expect((await removerCarteira(anaId)).quantidade).toBe(3) // Com dono + ids[0] + ids[2]
    expect((await removerCarteira(brunoId)).quantidade).toBe(1)
    await service.from("contacts").update({ atendente_id: anaId }).eq("id", comDono)
    await service.from("carteira_historico").delete().eq("workspace_id", ws).eq("motivo", "distribuicao")
  })

  it("CA-B35-08: 5 sem vendedor entre Ana e Bruno: 3 e 2 em rodízio pela ordem de cadastro, quem tinha dono não muda", async () => {
    entrarComo(adminId)
    expect((await distribuirSemVendedor([], false)).erro).toBe("Escolha ao menos um vendedor.")
    expect((await distribuirSemVendedor([anaId, "00000000-0000-0000-0000-000000000000"], false)).erro).toBe("Vendedor não encontrado")
    expect(await distribuirSemVendedor([anaId, brunoId], false)).toEqual({ quantidade: 5 })
    const donos = await Promise.all(ids.map(dono))
    expect(donos).toEqual([anaId, brunoId, anaId, brunoId, anaId])
    expect(await dono(comDono)).toBe(anaId)
    const h = await historico("distribuicao")
    expect(h).toHaveLength(5)
    expect(h.every((l) => l.de_atendente_id === null && [anaId, brunoId].includes(l.para_atendente_id!))).toBe(true)
    expect(h.some((l) => l.contact_id === comDono)).toBe(false)
    // Nada mais a distribuir.
    expect(await distribuirSemVendedor([anaId], false)).toEqual({ quantidade: 0 })
  })
})
