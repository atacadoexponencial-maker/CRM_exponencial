// @vitest-environment node
// B43-01 — perfil RFV do contato na lista de contatos, no perfil do contato e no painel
// do chat, no banco de verdade. O perfil tem de bater com a aba RFV dos Relatórios sem
// filtro de atendente (buscarRfv). Única coisa mockada: @/integrations/supabase/server,
// para injetar um cliente autenticado de verdade.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarDadosContato, filtrarContatos, registrarCompra } from "@/app/(auth)/contatos/actions"
import { buscarInfoContato } from "@/app/(auth)/chat/actions"
import { buscarRfv } from "@/app/(auth)/relatorios/actions"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const hoje = hojeNoFuso()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const navegadores: Record<string, SupabaseClient> = {}
let ws = ""
let adminId = ""
let atendenteId = ""
let conversaEmRisco = ""
const ids: Record<string, string> = {}

async function criarUsuario(nome: string, role: "admin" | "atendente") {
  const email = `b43-01-${nome.toLowerCase()}-${ts}@teste.com`
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

/** Compras do contato: `n` compras de `valor`, a última há `mesesDaUltima` meses, uma por mês para trás. */
function compras(contato: string, n: number, valor: number, mesesDaUltima = 0) {
  return Array.from({ length: n }, (_, i) => ({
    workspace_id: ws, contact_id: ids[contato], data: deslocarMeses(hoje, -(mesesDaUltima + i)), valor, origem: "manual",
  }))
}

/** Perfil de cada contato na aba RFV dos Relatórios, sem filtro de atendente. */
async function perfisDaAbaRfv() {
  entrarComo(adminId)
  const rfv = await buscarRfv({})
  return Object.fromEntries(rfv!.clientes.map((c) => [c.contatoId, c.perfil]))
}

async function daLista(comoQuem: string) {
  entrarComo(comoQuem)
  const r = await filtrarContatos({ limite: 200 })
  if ("erro" in r) throw new Error(r.erro)
  return r.contatos
}

// Base de 16 clientes com compra nos 12 meses. "Fiel" compra como o 3º do topo, mas a
// última compra foi há 2 meses: Clientes Fiéis. "Em Risco" comprou bem, há 7 meses.
beforeAll(async () => {
  const { data } = await service.from("workspaces").insert({ name: `B43-01 Perfil RFV ${ts}` }).select().single()
  ws = data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  atendenteId = await criarUsuario("Carla", "atendente")

  const nomes = ["A", "A2", "Outro Top", "Fiel", "Em Risco", "Perdido", "Nunca", ...Array.from({ length: 10 }, (_, i) => `Medio ${i}`)]
  const { data: contatos, error } = await service
    .from("contacts")
    .insert(nomes.map((name, i) => ({ workspace_id: ws, name, phone_number: `5511${ts % 1e7}${String(i).padStart(2, "0")}` })))
    .select("id, name")
  if (error || !contatos) throw new Error(error?.message)
  for (const c of contatos) ids[c.name as string] = c.id as string

  // A e A2 são da carteira da Carla. B45-03: os outros são do Admin; sem dono, a Carla
  // também os veria (fila aberta).
  await service.from("contacts").update({ atendente_id: adminId }).eq("workspace_id", ws)
  await service.from("contacts").update({ atendente_id: atendenteId }).in("id", [ids["A"], ids["A2"]])
  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: ids["A"], funil: "entrada", etapa: "lead", atendente_id: atendenteId },
    { workspace_id: ws, contact_id: ids["A2"], funil: "entrada", etapa: "lead", atendente_id: atendenteId },
  ])

  const { error: erroCompras } = await service.from("contact_purchases").insert([
    ...compras("A2", 6, 1000),
    ...compras("Outro Top", 6, 1000),
    ...compras("A", 5, 900),
    ...compras("Fiel", 5, 900, 2),
    ...compras("Em Risco", 4, 800, 7),
    ...compras("Perdido", 1, 10, 11),
    ...Array.from({ length: 10 }, (_, i) => compras(`Medio ${i}`, 2, 100, 1)).flat(),
  ])
  if (erroCompras) throw new Error(erroCompras.message)

  conversaEmRisco = (await service.from("conversations").insert({ workspace_id: ws, contact_id: ids["Em Risco"], status: "em_atendimento" }).select("id").single()).data!.id
}, 90_000)

afterAll(async () => {
  await service.from("conversations").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
}, 60_000)

describe("B43-01 — perfil RFV no contato, na lista e no chat", { timeout: 30_000 }, () => {
  it("CA-B43-01: should trazer na lista de contatos o mesmo perfil que a aba RFV dá a cada contato", async () => {
    const daAba = await perfisDaAbaRfv()
    const lista = await daLista(adminId)

    expect(lista).toHaveLength(17)
    for (const c of lista) expect(c.perfilRfv, c.nome).toBe(daAba[c.id] ?? null)
    // A base tem perfis diferentes, não um só repetido.
    expect(new Set(lista.map((c) => c.perfilRfv)).size).toBeGreaterThan(3)
  })

  it("CA-B43-02: should trazer sem perfil o contato que nunca comprou", async () => {
    const lista = await daLista(adminId)
    expect(lista.find((c) => c.id === ids["Nunca"])?.perfilRfv).toBeNull()

    entrarComo(adminId)
    expect((await buscarDadosContato(ids["Nunca"]))?.perfilRfv).toBeNull()
  })

  it("CA-B43-03: should trazer Clientes Fiéis no perfil do contato fiel", async () => {
    const daAba = await perfisDaAbaRfv()
    expect(daAba[ids["Fiel"]]).toBe("fieis")

    entrarComo(adminId)
    expect((await buscarDadosContato(ids["Fiel"]))?.perfilRfv).toBe("fieis")
  })

  it("CA-B43-04: should trazer Em Risco no painel do contato da conversa", async () => {
    const daAba = await perfisDaAbaRfv()
    expect(daAba[ids["Em Risco"]]).toBe("em_risco")

    entrarComo(adminId)
    const info = await buscarInfoContato(conversaEmRisco)
    expect(info.cadastro.perfilRfv).toBe("em_risco")
  })

  it("CA-B43-06: should dar ao Atendente o mesmo perfil que o Admin vê, só nos contatos dele", async () => {
    const doAdmin = Object.fromEntries((await daLista(adminId)).map((c) => [c.id, c.perfilRfv]))
    const doAtendente = await daLista(atendenteId)

    expect(doAtendente.map((c) => c.id).sort()).toEqual([ids["A"], ids["A2"]].sort())
    for (const c of doAtendente) expect(c.perfilRfv, c.nome).toBe(doAdmin[c.id])
    expect(doAtendente.find((c) => c.id === ids["A"])?.perfilRfv).toBe("campeao")
  })

  // Por último: a compra muda a base dos outros testes.
  it("CA-B43-05: should mostrar o perfil novo logo depois de registrar uma compra hoje", async () => {
    entrarComo(adminId)
    expect((await buscarDadosContato(ids["Em Risco"]))?.perfilRfv).toBe("em_risco")

    entrarComo(adminId)
    expect((await registrarCompra(ids["Em Risco"], { data: hoje, valor: "800" } as never)).erro).toBeUndefined()

    const daAba = await perfisDaAbaRfv()
    entrarComo(adminId)
    const depois = (await buscarDadosContato(ids["Em Risco"]))?.perfilRfv
    expect(depois).not.toBe("em_risco")
    expect(depois).toBe(daAba[ids["Em Risco"]])
  })
})
