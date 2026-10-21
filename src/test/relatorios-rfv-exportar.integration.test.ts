// @vitest-environment node
// B33-02: a rota de exportação baixa os clientes por perfil RFV em Excel. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/relatorios/rfv/exportar/route"
import { TITULOS_EXPORTACAO_RFV } from "@/lib/relatorios/exportar-rfv"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"

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

async function baixar(url: string) {
  const resposta = await GET(new Request(`http://localhost${url}`))
  if (resposta.status !== 200) return { resposta, linhas: null }
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array", cellDates: true })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { resposta, aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B33-02 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  const email = `b33-02-admin-${ts}@teste.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  criados.userIds.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Dona Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(admin as never)

  const contato = async (nome: string, tel: string, extra: Record<string, unknown> = {}) =>
    (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: tel, ...extra }).select("id").single()).data!.id
  const ana = await contato("Loja da Ana", "5581999993321", { cidade: "Recife", uf: "PE", atendente_id: adminId })
  const bruno = await contato("Bazar do Bruno", "5511999993322")
  const linhas: Array<Record<string, unknown>> = []
  for (let k = 0; k < 5; k++) linhas.push({ workspace_id: ws, contact_id: ana, data: deslocarMeses(hoje, -k), valor: 500, origem: "manual" })
  for (let k = 0; k < 5; k++) linhas.push({ workspace_id: ws, contact_id: bruno, data: deslocarMeses(hoje, -k), valor: 400, origem: "manual" })
  for (let i = 0; i < 8; i++) {
    const c = await contato(`Pequeno ${i}`, `55119999933${30 + i}`)
    linhas.push({ workspace_id: ws, contact_id: c, data: deslocarMeses(hoje, -4), valor: 10, origem: "manual" })
  }
  await service.from("contact_purchases").insert(linhas)
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

describe("B33-02 — exportar clientes por perfil RFV", { timeout: 60_000 }, () => {
  it("CA-B33-12: filtrado em Campeão, baixa 2 linhas com as colunas da lista, data e número como tal", async () => {
    const { resposta, aba, linhas } = await baixar("/relatorios/rfv/exportar?perfil=campeao")
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("content-disposition")).toContain("rfv-campeao-")
    expect(linhas![0]).toEqual(TITULOS_EXPORTACAO_RFV)
    expect(linhas!.slice(1)).toHaveLength(2)
    const ana = linhas!.slice(1).find((l) => l[0] === "Loja da Ana")!
    expect(ana.slice(1, 9)).toEqual(["Campeão", 5, 5, 5, 5, 0, 5, 2500])
    expect(ana[9]).toBeInstanceOf(Date)
    expect((ana[9] as Date).toLocaleDateString("sv-SE")).toBe(hoje)
    expect(ana.slice(10)).toEqual(["Dona Admin", "Recife", "PE"])
    expect(aba!["I2"].t).toBe("n")
    expect(aba!["J2"].t).toBe("d")

    // Sem filtro: a base inteira (10). Célula vazia: 0 linhas. Filtro inválido: 400.
    expect((await baixar("/relatorios/rfv/exportar")).linhas!.slice(1)).toHaveLength(10)
    expect((await baixar("/relatorios/rfv/exportar?r=1&fv=5")).linhas!.slice(1)).toHaveLength(0)
    expect((await baixar("/relatorios/rfv/exportar?perfil=xyz")).resposta.status).toBe(400)
    expect((await baixar("/relatorios/rfv/exportar?r=9&fv=1")).resposta.status).toBe(400)
  })
})
