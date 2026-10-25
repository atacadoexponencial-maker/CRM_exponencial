// @vitest-environment node
// B33-01: a ação do RFV com a base certa (sem lixeira, sem quem nunca comprou).
// B33-04: o perfil é sempre da empresa toda; o atendente só escolhe a carteira. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarRfv } from "@/app/(auth)/relatorios/actions"
import { GET as exportarRfv } from "@/app/(auth)/relatorios/rfv/exportar/route"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", anaId = "", brunoId = ""
let cAntigo = "", cAna1 = "", cAna2 = "", cBruno = ""
const navegadores: Record<string, SupabaseClient> = {}
const hoje = hojeNoFuso()

async function criarUsuario(nome: string, role: string) {
  const email = `b33-01-${nome.toLowerCase()}-${ts}@teste.com`
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
  ws = (await service.from("workspaces").insert({ name: `B33-01 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  brunoId = await criarUsuario("Bruno", "atendente")

  const contato = async (nome: string, tel: string, extra: Record<string, unknown> = {}) =>
    (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: tel, ...extra }).select("id").single()).data!.id
  await contato("Nunca comprou", "5511900003301")
  const naLixeira = await contato("Na lixeira", "5511900003302", { excluido_em: new Date().toISOString() })
  cAntigo = await contato("Comprou há 14 meses", "5511900003303")
  cAna1 = await contato("Ana 1", "5511900003304", { atendente_id: anaId })
  cAna2 = await contato("Ana 2", "5511900003305", { atendente_id: anaId })
  cBruno = await contato("Bruno 1", "5511900003306", { atendente_id: brunoId })

  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: cAna1, funil: "recompra", etapa: "ativos", atendente_id: anaId },
    { workspace_id: ws, contact_id: cAna2, funil: "recompra", etapa: "inativos", atendente_id: anaId },
    { workspace_id: ws, contact_id: cBruno, funil: "recompra", etapa: "ativos", atendente_id: brunoId },
    { workspace_id: ws, contact_id: cAntigo, funil: "recompra", etapa: "perdidos", atendente_id: null },
  ])
  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: naLixeira, data: hoje, valor: 999, origem: "manual" },
    { workspace_id: ws, contact_id: cAntigo, data: deslocarMeses(hoje, -14), valor: 900, origem: "manual" },
    { workspace_id: ws, contact_id: cAna1, data: hoje, valor: 100, origem: "manual" },
    { workspace_id: ws, contact_id: cAna1, data: deslocarMeses(hoje, -1), valor: 100, origem: "manual" },
    { workspace_id: ws, contact_id: cAna2, data: deslocarMeses(hoje, -2), valor: 50, origem: "manual" },
    // Cliente da carteira da Ana que também comprou com o Bruno (B33-04).
    { workspace_id: ws, contact_id: cAna2, data: deslocarMeses(hoje, -3), valor: 50, origem: "manual", atendente_id: brunoId },
    { workspace_id: ws, contact_id: cBruno, data: hoje, valor: 5000, origem: "manual" },
    { workspace_id: ws, contact_id: cBruno, data: deslocarMeses(hoje, -1), valor: 5000, origem: "manual" },
    { workspace_id: ws, contact_id: cBruno, data: deslocarMeses(hoje, -2), valor: 5000, origem: "manual" },
  ])
  await service.from("reminders").insert({ workspace_id: ws, contact_id: cAna1, atendente_id: anaId, instrucao: "Ligar", due_at: new Date().toISOString(), status: "pendente", origem: "avulso" })
}, 90_000)

afterAll(async () => {
  await service.from("reminders").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("pipeline_cards").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B33-01 — buscarRfv", { timeout: 60_000 }, () => {
  it("CA-B33-03: quem nunca comprou e quem está na lixeira ficam fora; venda única há 14 meses dá R 1, F 1, V 1 e Perdido", async () => {
    entrarComo(adminId)
    const r = await buscarRfv({ atendenteId: null })!
    expect(r?.base).toBe(4)
    const ids = r!.clientes.map((c) => c.contatoId)
    expect(ids).toContain(cAntigo)
    expect(ids).not.toContain("Nunca comprou")
    expect(r!.clientes.map((c) => c.nome)).not.toContain("Na lixeira")
    expect(r!.clientes.map((c) => c.nome)).not.toContain("Nunca comprou")
    const antigo = r!.clientes.find((c) => c.contatoId === cAntigo)!
    expect(antigo).toMatchObject({ r: 1, f: 1, v: 1, fv: 1, perfil: "perdido", ativo: false, semLembrete15d: true })
    // Extras: ativos e lembretes
    const ana1 = r!.clientes.find((c) => c.contatoId === cAna1)!
    expect(ana1).toMatchObject({ ativo: true, semLembrete15d: false, atendente: "Ana" })
    // Com o Bruno (3 vendas, R$ 15.000) na base, a Ana 1 (2 vendas, R$ 200) não é o topo.
    expect(r!.clientes.find((c) => c.contatoId === cBruno)!.perfil).toBe("campeao")
    expect(ana1.f).toBeLessThan(5)
  })

  it("CA-B33-05: logada como Atendente, a Ana vê só a carteira dela, com as notas e o perfil da empresa toda", async () => {
    entrarComo(adminId)
    const daEmpresa = await buscarRfv({ atendenteId: null })
    const naEmpresa = (id: string) => daEmpresa!.clientes.find((c) => c.contatoId === id)!

    entrarComo(anaId)
    const r = await buscarRfv({ atendenteId: brunoId }) // o pedido do Bruno é ignorado
    expect(r?.base).toBe(2)
    expect(r!.clientes.map((c) => c.contatoId).sort()).toEqual([cAna1, cAna2].sort())
    for (const c of r!.clientes) {
      expect(c).toMatchObject({ r: naEmpresa(c.contatoId).r, f: naEmpresa(c.contatoId).f, v: naEmpresa(c.contatoId).v, fv: naEmpresa(c.contatoId).fv, perfil: naEmpresa(c.contatoId).perfil })
    }
    // Com o Bruno na régua, a Ana 1 (2 vendas, R$ 200) não é o topo; antes da B33-04 era Campeão.
    expect(r!.clientes.find((c) => c.contatoId === cAna1)!.f).toBeLessThan(5)
    // A compra da Ana 2 com o Bruno conta nas notas dela (2 vendas, R$ 100).
    expect(r!.clientes.find((c) => c.contatoId === cAna2)).toMatchObject({ vendas12m: 2, valor12m: 100 })
    // Nada do Bruno chega: matriz, indicadores e evolução contam só os 2.
    expect(r!.matriz.reduce((s, c) => s + c.clientes, 0)).toBe(2)
    expect(r!.indicadores.reduce((s, i) => s + i.clientes, 0)).toBe(2)
    expect(Object.values(r!.evolucao.semanal[0].porPerfil).reduce((s, n) => s + n, 0)).toBe(2)
  })

  it("CA-B33-17: o filtro do Admin pela Ana só esconde: mesmas notas, base/matriz/indicadores e Excel só da carteira", async () => {
    entrarComo(adminId)
    const semFiltro = await buscarRfv({ atendenteId: null })
    const comFiltro = await buscarRfv({ atendenteId: anaId })
    expect(comFiltro!.clientes.map((c) => c.contatoId).sort()).toEqual([cAna1, cAna2].sort())
    for (const c of comFiltro!.clientes) {
      const igual = semFiltro!.clientes.find((x) => x.contatoId === c.contatoId)!
      expect(c).toEqual(igual)
    }
    expect(comFiltro!.base).toBe(2)
    expect(comFiltro!.matriz.reduce((s, c) => s + c.clientes, 0)).toBe(2)
    expect(comFiltro!.indicadores.reduce((s, i) => s + i.clientes, 0)).toBe(2)
    // O Bruno, com o filtro dele, não vê a Ana 2 (que comprou com ele, mas é da carteira da Ana).
    const doBruno = await buscarRfv({ atendenteId: brunoId })
    expect(doBruno!.clientes.map((c) => c.contatoId)).toEqual([cBruno])

    const resposta = await exportarRfv(new Request(`http://localhost/relatorios/rfv/exportar?atendente=${anaId}`))
    expect(resposta.status).toBe(200)
    const aba = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array" }).Sheets["Clientes RFV"]
    const nomes = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1 }).slice(1).map((l) => l[0]).sort()
    expect(nomes).toEqual(["Ana 1", "Ana 2"])
  })
})
