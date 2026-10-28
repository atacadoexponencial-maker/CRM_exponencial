// @vitest-environment node
// B45-04 — as vendas do atendente são as dos clientes da carteira dele, qualquer que
// seja o vendedor registrado na venda. Bate no Supabase real: o client SSR é o
// "navegador" de quem abre os Relatórios e o Dashboard.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { buscarCoorte, buscarFunilClientes, buscarVisaoGeral } from "@/app/(auth)/relatorios/actions"
import { buscarMetricasDashboard } from "@/app/(auth)/dashboard/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const fim = String(ts).slice(-6)
const SENHA = "senha-segura-123"
let ws = "", adminId = "", atendenteId = "", brunoId = "", anaId = "", carlaId = ""
const navegadores: Record<string, SupabaseClient> = {}
const OUTUBRO = { periodo: { tipo: "meses" as const, ano: 2026, meses: [10] } }

async function criarPessoa(nome: string, role: string) {
  const email = `b45-04-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role, status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = navegador
  return id
}
const entrarComo = (id: string) => { clienteDaVez = navegadores[id] }

/** Cliente com um dono só: o mesmo no contato e no card da Recompra. */
async function clienteDe(nome: string, dono: string, final: string) {
  const id = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55919${fim}${final}`, atendente_id: dono }).select("id").single()).data!.id
  await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: id, funil: "recompra", etapa: "ativos", atendente_id: dono })
  return id
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B45-04 ${ts}` }).select("id").single()).data!.id
  adminId = await criarPessoa("Admin", "admin")
  atendenteId = await criarPessoa("Atendente", "atendente")
  brunoId = await criarPessoa("Bruno", "atendente")
  anaId = await clienteDe("Ana", atendenteId, "1")
  carlaId = await clienteDe("Carla", brunoId, "2")
  // A venda da Ana foi registrada pelo Admin; a da Carla, pelo Atendente Teste.
  const { error } = await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: anaId, data: "2026-10-05", valor: 500, atendente_id: adminId },
    { workspace_id: ws, contact_id: carlaId, data: "2026-10-06", valor: 300, atendente_id: atendenteId },
  ])
  if (error) throw new Error(error.message)
}, 90_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  for (const id of [adminId, atendenteId, brunoId]) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", ws)
}, 90_000)

describe("B45-04 — Vendas do atendente pela carteira", { timeout: 60_000 }, () => {
  it("CA-B45-16: should somar na Visão Geral do Atendente Teste só a venda da Ana, de R$ 500", async () => {
    entrarComo(atendenteId)
    const visao = await buscarVisaoGeral(OUTUBRO)

    expect(visao?.resumo.faturamentoBruto).toBe(500)
    expect(visao?.tabela.map((v) => v.contato)).toEqual(["Ana"])
    // O vendedor registrado continua aparecendo na linha
    expect(visao?.tabela[0].atendente).toBe("Admin")
  })

  it("CA-B45-17: should dar ao Admin filtrando pelo Atendente Teste os mesmos números da Visão Geral, da Coorte e do Funil de clientes", async () => {
    entrarComo(atendenteId)
    const doAtendente = {
      visao: await buscarVisaoGeral(OUTUBRO),
      coorte: await buscarCoorte({}),
      funil: await buscarFunilClientes({}),
    }
    entrarComo(adminId)
    const doAdmin = {
      visao: await buscarVisaoGeral({ ...OUTUBRO, atendenteId }),
      coorte: await buscarCoorte({ atendenteId }),
      funil: await buscarFunilClientes({ atendenteId }),
    }

    // L-11: os dois lados existem, e a comparação não é entre dois vazios
    for (const lado of [doAtendente, doAdmin]) {
      expect(lado.visao).not.toBeNull()
      expect(lado.coorte).not.toBeNull()
      expect(lado.funil).not.toBeNull()
    }
    expect(doAdmin.visao?.resumo).toEqual(doAtendente.visao?.resumo)
    expect(doAdmin.visao?.tabela).toEqual(doAtendente.visao?.tabela)
    expect(doAdmin.coorte).toEqual(doAtendente.coorte)
    expect(doAdmin.funil).toEqual(doAtendente.funil)
    expect(doAdmin.visao?.resumo.faturamentoBruto).toBe(500)
  })

  it("CA-B45-18: should contar no Dashboard do Atendente Teste a venda da Ana e não a da Carla", async () => {
    entrarComo(atendenteId)
    const metricas = await buscarMetricasDashboard({ periodo: "custom", inicio: "2026-10-01", fim: "2026-10-31" })

    expect(metricas?.receita.totalCompras).toBe(500)
    expect(metricas?.receita.quantidadeCompras).toBe(1)
  })
})
