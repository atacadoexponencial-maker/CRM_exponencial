// @vitest-environment node
// B34-01: a rota de exportação das coortes e a regra do atendente. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/relatorios/coorte/exportar/route"
import { buscarCoorte } from "@/app/(auth)/relatorios/actions"
import { TITULOS_EXPORTACAO_COORTE } from "@/lib/relatorios/exportar-coorte"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"

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

async function criarUsuario(nome: string, role: string) {
  const email = `b34-01-${nome.toLowerCase()}-${ts}@teste.com`
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

async function baixar(url: string) {
  const resposta = await GET(new Request(`http://localhost${url}`))
  if (resposta.status !== 200) return { resposta, linhas: null }
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array" })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { resposta, aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B34-01 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")
  const contato = async (nome: string, tel: string, atendente: string) =>
    (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: tel, atendente_id: atendente }).select("id").single()).data!.id
  const a1 = await contato("Ana 1", "5511900003401", anaId)
  const a2 = await contato("Ana 2", "5511900003402", anaId)
  const b1 = await contato("Bruno 1", "5511900003403", brunoId)
  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: a1, funil: "recompra", etapa: "ativos", atendente_id: anaId },
    { workspace_id: ws, contact_id: a2, funil: "recompra", etapa: "ativos", atendente_id: anaId },
    { workspace_id: ws, contact_id: b1, funil: "recompra", etapa: "ativos", atendente_id: brunoId },
  ])
  const m = (k: number) => deslocarMeses(hoje, -k)
  await service.from("contact_purchases").insert([
    // Coorte de 3 meses atrás: Ana 1 e Bruno 1; Ana 1 recomprou no mês seguinte (Mês 1).
    { workspace_id: ws, contact_id: a1, data: m(3), valor: 100, origem: "manual" },
    { workspace_id: ws, contact_id: a1, data: m(2), valor: 300, origem: "manual" },
    { workspace_id: ws, contact_id: b1, data: m(3), valor: 500, origem: "manual" },
    // Coorte de 1 mês atrás: Ana 2.
    { workspace_id: ws, contact_id: a2, data: m(1), valor: 50, origem: "manual" },
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

describe("B34-01 — coortes: exportação e atendente", { timeout: 60_000 }, () => {
  it("CA-B34-07: baixa 12 linhas com Coorte, Clientes e Mês 0–11; retenção como número e valor médio como moeda", async () => {
    entrarComo(adminId)
    const ret = await baixar("/relatorios/coorte/exportar?tabela=retencao")
    expect(ret.resposta.status).toBe(200)
    expect(ret.linhas![0]).toEqual(TITULOS_EXPORTACAO_COORTE)
    expect(ret.linhas!.slice(1)).toHaveLength(12)
    const coorte3 = ret.linhas![1 + 12 - 4] // 3 meses atrás = 4ª linha de trás para a frente
    expect(coorte3[1]).toBe(2)
    expect(coorte3[2]).toBe(100)
    expect(coorte3[3]).toBe(50)
    expect(typeof coorte3[3]).toBe("number")

    const val = await baixar("/relatorios/coorte/exportar?tabela=valor")
    expect(val.resposta.status).toBe(200)
    const linha3 = val.linhas![1 + 12 - 4]
    expect(linha3[2]).toBe(300) // (100 + 500) ÷ 2
    expect(linha3[3]).toBe(300)
    // Linha 10 = coorte de 3 meses atrás; coluna C = Mês 0: célula numérica (moeda), não texto.
    expect(val.aba!["C10"].t).toBe("n")
    expect(val.aba!["C10"].v).toBe(300)
    expect((await baixar("/relatorios/coorte/exportar?tabela=x")).resposta.status).toBe(400)
  })

  it("CA-B34-08: logada como Atendente, a Ana só vê as coortes dos clientes dela", async () => {
    entrarComo(anaId)
    const r = await buscarCoorte({ atendenteId: brunoId })
    expect(r!.coortes.reduce((s, c) => s + c.clientes, 0)).toBe(2)
    const coorte3 = r!.coortes[12 - 4]
    expect(coorte3.clientes).toBe(1) // só a Ana 1; o Bruno 1 não aparece
    expect(coorte3.retencao[1]).toBe(100)
    expect(coorte3.valorMedio[0]).toBe(100)
  })
})
