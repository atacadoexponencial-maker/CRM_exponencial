// @vitest-environment node
// B32-05: a rota de exportação baixa as vendas do período em Excel. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/relatorios/vendas/exportar/route"
import { TITULOS_EXPORTACAO_VENDAS } from "@/lib/relatorios/exportar-vendas"
import { hojeNoFuso, periodoPadrao } from "@/lib/relatorios/visao-geral"

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
const periodo = periodoPadrao(hoje)

async function baixar(url: string) {
  const resposta = await GET(new Request(`http://localhost${url}`))
  if (resposta.status !== 200) return { resposta, linhas: null }
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array", cellDates: true })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { resposta, aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B32-05 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  const email = `b32-05-admin-${ts}@teste.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  criados.userIds.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Dona Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(admin as never)

  const c1 = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja da Ana", phone_number: "5581999993205", cidade: "Recife", uf: "PE" }).select("id").single()).data!.id
  const c2 = (await service.from("contacts").insert({ workspace_id: ws, name: "Bazar do Bruno", phone_number: "5511999993206" }).select("id").single()).data!.id
  const mesPassado = (() => { const d = new Date(hoje + "T12:00:00"); d.setMonth(d.getMonth() - 1); return d.toLocaleDateString("sv-SE") })()
  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: c1, data: hoje, valor: 100, pecas: 4, forma_pagamento: "pix", atendente_id: adminId, origem: "manual" },
    { workspace_id: ws, contact_id: c1, data: hoje, valor: 50.5, origem: "externa", codigo_externo: "ERP-1" },
    { workspace_id: ws, contact_id: c2, data: hoje, valor: 250, origem: "manual" },
    { workspace_id: ws, contact_id: c2, data: mesPassado, valor: 999, origem: "manual" },
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

describe("B32-05 — exportar as vendas do período", { timeout: 60_000 }, () => {
  it("CA-B32-17: baixa uma planilha com as 3 vendas do mês e as colunas da tabela, com data e valor como data e número", async () => {
    if (periodo.tipo !== "meses") throw new Error("período padrão inesperado")
    const { resposta, aba, linhas } = await baixar(`/relatorios/vendas/exportar?tipo=meses&ano=${periodo.ano}&meses=${periodo.meses[0]}`)
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("content-type")).toContain("spreadsheetml")
    expect(resposta.headers.get("content-disposition")).toContain(`vendas-${periodo.meses[0]}-${periodo.ano}.xlsx`)
    expect(linhas![0]).toEqual(TITULOS_EXPORTACAO_VENDAS)
    expect(linhas!.slice(1)).toHaveLength(3)

    const contatos = linhas!.slice(1).map((l) => l[0]).sort()
    expect(contatos).toEqual(["Bazar do Bruno", "Loja da Ana", "Loja da Ana"])
    const ana = linhas!.slice(1).find((l) => l[0] === "Loja da Ana" && l[9] === 100)!
    expect(ana[1]).toBe("5581999993205")
    expect(ana[2]).toBeInstanceOf(Date)
    expect((ana[2] as Date).toLocaleDateString("sv-SE")).toBe(hoje)
    expect(ana[3]).toBe("Manual")
    expect(ana[4]).toBe("Dona Admin")
    expect(ana[5]).toBe("Recife")
    expect(ana[6]).toBe("PE")
    expect(ana[7]).toBe(4)
    expect(ana[8]).toBe("Pix")
    expect(typeof ana[9]).toBe("number")
    // Célula de valor formatada como moeda; de data, como data.
    expect(aba!["J2"].t).toBe("n")
    expect(aba!["C2"].t).toBe("d")
    const externa = linhas!.slice(1).find((l) => l[9] === 50.5)!
    expect(externa[3]).toBe("Externa")
  })

  it("período inválido ou sem sessão não baixa nada", async () => {
    expect((await baixar("/relatorios/vendas/exportar?tipo=meses&ano=2026&meses=13")).resposta.status).toBe(400)
    expect((await baixar("/relatorios/vendas/exportar?tipo=x")).resposta.status).toBe(400)
  })
})
