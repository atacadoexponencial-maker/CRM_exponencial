// @vitest-environment node
// B32-06: a rota de exportação baixa a variação por UF em Excel. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/relatorios/variacao-por-uf/exportar/route"
import { TITULOS_EXPORTACAO_POR_UF } from "@/lib/relatorios/exportar-vendas"
import { hojeNoFuso, periodoMesAnterior } from "@/lib/relatorios/visao-geral"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = ""
let admin: SupabaseClient
const hoje = hojeNoFuso()
// Mês passado, fechado: sem comparação justa para atrapalhar.
const periodo = periodoMesAnterior(hoje)
if (periodo.tipo !== "meses") throw new Error("período inesperado")
const mesPassado = `${periodo.ano}-${String(periodo.meses[0]).padStart(2, "0")}-10`
const anoPassado = `${periodo.ano - 1}-${String(periodo.meses[0]).padStart(2, "0")}-10`

async function baixar(url: string) {
  const resposta = await GET(new Request(`http://localhost${url}`))
  if (resposta.status !== 200) return { resposta, linhas: null }
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array" })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { resposta, aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B32-06 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  const email = `b32-06-admin-${ts}@teste.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  criados.userIds.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Dona Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(admin as never)

  const contato = async (nome: string, tel: string, uf: string | null) =>
    (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: tel, uf }).select("id").single()).data!.id
  const pe1 = await contato("PE 1", "5581999993261", "PE")
  const pe2 = await contato("PE 2", "5581999993262", "PE")
  const sp1 = await contato("SP 1", "5511999993263", "SP")
  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: pe1, data: mesPassado, valor: 600, origem: "manual" },
    { workspace_id: ws, contact_id: pe2, data: mesPassado, valor: 400, origem: "manual" },
    { workspace_id: ws, contact_id: pe1, data: anoPassado, valor: 800, origem: "manual" },
    { workspace_id: ws, contact_id: sp1, data: mesPassado, valor: 250, origem: "manual" },
  ])
}, 90_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B32-06 — exportar a variação por UF", { timeout: 60_000 }, () => {
  it("CA-B32-20: baixa a planilha com as 2 UFs, a linha de total e as mesmas colunas", async () => {
    const { resposta, linhas } = await baixar(`/relatorios/variacao-por-uf/exportar?tipo=meses&ano=${periodo.ano}&meses=${periodo.meses[0]}`)
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("content-disposition")).toContain("variacao-por-uf-")
    expect(linhas![0]).toEqual(TITULOS_EXPORTACAO_POR_UF)
    expect(linhas!.slice(1)).toHaveLength(3)
    // Ordem: maior venda primeiro, total por último.
    expect(linhas![1]).toEqual(["PE", 2, 100, 1000, 25, 500])
    expect(linhas![2].slice(0, 2)).toEqual(["SP", 1])
    expect(linhas![2][3]).toBe(250)
    expect(linhas![2][2]).toBeUndefined() // sem base no ano anterior
    expect(linhas![3]).toEqual(["TOTAL", 3, 200, 1250, 56.25, 416.67])
  })
})
