// @vitest-environment node
// B42-01 — campo "Perfil RFV" do filtro de contatos no banco de verdade.
// O perfil vem de perfis_rfv_da_empresa (empresa inteira) e tem de bater com a aba
// RFV dos Relatórios sem filtro de atendente (buscarRfv). Única coisa mockada:
// @/integrations/supabase/server, para injetar um cliente autenticado de verdade.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { filtrarContatos } from "@/app/(auth)/contatos/actions"
import { buscarRfv } from "@/app/(auth)/relatorios/actions"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"
import type { Condicao, Filtro } from "@/lib/filtro-contatos"
import type { PerfilRfv } from "@/lib/relatorios/rfv"

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
const ids: Record<string, string> = {}

async function criarUsuario(nome: string, role: "admin" | "atendente") {
  const email = `b42-01-${nome.toLowerCase()}-${ts}@teste.com`
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

const cond = (comparacao: Condicao["comparacao"], ...valores: string[]): Condicao => ({ campo: "perfil_rfv", comparacao, valores })
const umaCondicao = (c: Condicao): Filtro => ({ juncao: "e", grupos: [{ juncao: "e", condicoes: [c] }] })
const ordenados = (lista: string[]) => [...lista].sort()

async function filtrar(c: Condicao) {
  const r = await filtrarContatos({ filtro: umaCondicao(c), limite: 200 })
  if ("erro" in r) throw new Error(r.erro)
  return ordenados(r.contatos.map((x) => x.id))
}

/** Compras do contato: `n` compras de `valor`, a última há `mesesDaUltima` meses, uma por mês para trás. */
function compras(contato: string, n: number, valor: number, mesesDaUltima = 0) {
  return Array.from({ length: n }, (_, i) => ({
    workspace_id: ws, contact_id: ids[contato], data: deslocarMeses(hoje, -(mesesDaUltima + i)), valor, origem: "manual",
  }))
}

// Base de 15 clientes com compra nos 12 meses: os 3 primeiros em F e V levam nota 5.
// A2 e "Outro Top" empatam no topo; A é o 3º (nota 5 na empresa). Só entre A e A2
// (a carteira do atendente), A é o 2º de 2 e levaria nota 3: Potencial Fiel.
beforeAll(async () => {
  const { data } = await service.from("workspaces").insert({ name: `B42-01 RFV ${ts}` }).select().single()
  ws = data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  atendenteId = await criarUsuario("Carla", "atendente")

  const nomes = ["A", "A2", "Outro Top", "Em Risco", "Perdido", "Nunca", "Na Lixeira", ...Array.from({ length: 10 }, (_, i) => `Medio ${i}`)]
  const { data: contatos, error } = await service
    .from("contacts")
    .insert(nomes.map((name, i) => ({
      workspace_id: ws, name, phone_number: `5511${ts % 1e7}${String(i).padStart(2, "0")}`,
      excluido_em: name === "Na Lixeira" ? new Date().toISOString() : null,
    })))
    .select("id, name")
  if (error || !contatos) throw new Error(error?.message)
  for (const c of contatos) ids[c.name as string] = c.id as string

  // A e A2 são da carteira da Carla.
  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: ids["A"], funil: "entrada", etapa: "lead", atendente_id: atendenteId },
    { workspace_id: ws, contact_id: ids["A2"], funil: "entrada", etapa: "lead", atendente_id: atendenteId },
  ])

  const { error: erroCompras } = await service.from("contact_purchases").insert([
    ...compras("A2", 6, 1000),
    ...compras("Outro Top", 6, 1000),
    ...compras("A", 5, 900),
    ...compras("Em Risco", 4, 800, 7),
    ...compras("Perdido", 1, 10, 11),
    // Se a lixeira contasse, ela tomaria o topo e A cairia para nota 4.
    ...compras("Na Lixeira", 8, 9999),
    ...Array.from({ length: 10 }, (_, i) => compras(`Medio ${i}`, 2, 100, 1)).flat(),
  ])
  if (erroCompras) throw new Error(erroCompras.message)
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
}, 60_000)

/** Contatos que a aba RFV, sem filtro de atendente, põe nos perfis pedidos. */
async function daAbaRfv(...perfis: PerfilRfv[]) {
  entrarComo(adminId)
  const rfv = await buscarRfv({})
  return ordenados(rfv!.clientes.filter((c) => perfis.includes(c.perfil)).map((c) => c.contatoId))
}

describe("B42-01 — Perfil RFV no filtro de contatos", { timeout: 30_000 }, () => {
  it("CA-B42-21: should trazer os mesmos clientes que a aba RFV põe em cada perfil", async () => {
    const campeoes = await daAbaRfv("campeao")
    const emRiscoOuNaoPerder = await daAbaRfv("em_risco", "nao_perder")
    expect(campeoes).toEqual(ordenados([ids["A"], ids["A2"], ids["Outro Top"]]))
    expect(emRiscoOuNaoPerder.length).toBeGreaterThan(0)

    entrarComo(adminId)
    expect(await filtrar(cond("e", "campeao"))).toEqual(campeoes)
    expect(await filtrar(cond("qualquer_de", "em_risco", "nao_perder"))).toEqual(emRiscoOuNaoPerder)

    // E perfil a perfil, toda a base bate com a aba.
    entrarComo(adminId)
    const rfv = await buscarRfv({})
    for (const perfil of new Set(rfv!.clientes.map((c) => c.perfil))) {
      entrarComo(adminId)
      expect(await filtrar(cond("e", perfil)), perfil).toEqual(await daAbaRfv(perfil))
    }
  })

  it("CA-B42-22: should dar ao cliente o perfil da empresa inteira, para o Admin e para o Atendente dele", async () => {
    // Só entre os clientes da Carla (o que a aba RFV mostra a ela), A não seria Campeão.
    entrarComo(atendenteId)
    const daCarteira = await buscarRfv({})
    expect(daCarteira!.clientes.find((c) => c.contatoId === ids["A"])?.perfil).toBe("potencial_fiel")

    entrarComo(adminId)
    expect(await filtrar(cond("e", "campeao"))).toContain(ids["A"])
    entrarComo(atendenteId)
    expect(await filtrar(cond("e", "campeao"))).toContain(ids["A"])
  })

  it("CA-B42-23: should separar quem nunca comprou de quem comprou", async () => {
    entrarComo(adminId)
    const vazio = await filtrar(cond("vazio"))
    expect(vazio).toEqual([ids["Nunca"]])

    const naoVazio = await filtrar(cond("nao_vazio"))
    expect(naoVazio).not.toContain(ids["Nunca"])
    expect(naoVazio).toContain(ids["A"])
    expect(naoVazio).toContain(ids["Perdido"])
    expect(naoVazio).toHaveLength(15)
  })

  it("CA-B42-24: should deixar de fora quem não tem perfil em \"não é\"", async () => {
    entrarComo(adminId)
    expect(await daAbaRfv("perdido")).toContain(ids["Perdido"])
    const r = await filtrar(cond("nao_e", "campeao"))
    expect(r).toContain(ids["Perdido"])
    expect(r).not.toContain(ids["A"])
    expect(r).not.toContain(ids["Outro Top"])
    expect(r).not.toContain(ids["Nunca"])
  })

  it("CA-B42-26: should mostrar ao Atendente só os Campeões que são contatos dele", async () => {
    entrarComo(atendenteId)
    expect(await filtrar(cond("e", "campeao"))).toEqual(ordenados([ids["A"], ids["A2"]]))

    // Nem chamando a função direto ele vê perfil de contato de outra carteira.
    const { data, error } = await navegadores[atendenteId].rpc("perfis_rfv_da_empresa")
    expect(error).toBeNull()
    expect(ordenados(((data ?? []) as Array<{ contact_id: string }>).map((r) => r.contact_id))).toEqual(ordenados([ids["A"], ids["A2"]]))
  })
})
