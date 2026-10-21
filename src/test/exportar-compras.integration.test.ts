// @vitest-environment node
// B30-04: a rota de exportação baixa o histórico de compras do contato em Excel.
// Bate no Supabase real; só @/integrations/supabase/server é mockado.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { GET } from "@/app/(auth)/contatos/[id]/compras/exportar/route"
import { registrarCompra } from "@/app/(auth)/contatos/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = "", adminId = "", comCompras = "", semCompras = ""
let admin: SupabaseClient

const colunas = (l: unknown[]) => Array.from({ length: 8 }, (_, i) => l[i])
const CABECALHO = ["Data", "Valor", "Peças", "Desconto", "Forma de pagamento", "Atendente", "Origem", "Pedido"]

async function baixar(id: string) {
  const resposta = await GET(new Request(`http://localhost/contatos/${id}/compras/exportar`), { params: Promise.resolve({ id }) })
  if (resposta.status !== 200) return { resposta, linhas: null }
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array", cellDates: true })
  const aba = livro.Sheets[livro.SheetNames[0]]
  return { resposta, aba, linhas: XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, raw: true }) }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B30-04 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  const email = `b30-04-admin-${ts}@teste.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  criados.userIds.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Dona Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(admin as never)

  comCompras = (await service.from("contacts").insert({ workspace_id: ws, name: "Padaria do Centro", phone_number: `5511977${String(ts).slice(-6)}` }).select("id").single()).data!.id
  semCompras = (await service.from("contacts").insert({ workspace_id: ws, name: "Sem Compras", phone_number: `5511966${String(ts).slice(-6)}` }).select("id").single()).data!.id

  for (const compra of [
    { data: "2026-01-15", valor: "4200", pecas: "", desconto: "", formaPagamento: "", atendenteId: "" },
    { data: "2026-02-12", valor: "3800", pecas: "10", desconto: "50", formaPagamento: "boleto", atendenteId: adminId },
    { data: "2026-03-05", valor: "5100", pecas: "12", desconto: "", formaPagamento: "pix", atendenteId: adminId },
  ]) {
    const r = await registrarCompra(comCompras, compra)
    if (r.erro) throw new Error(r.erro)
  }
}, 60_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().in("workspace_id", criados.workspaceIds)
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  await service.from("profiles").delete().in("id", criados.userIds)
  for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B30-04 — Rota de exportação das compras", { timeout: 30_000 }, () => {
  it("CA-B30-13: Exportar baixa o .xlsx com o cabeçalho e as três compras na ordem da tela", async () => {
    const { resposta, aba, linhas } = await baixar(comCompras)
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("Content-Type")).toContain("spreadsheetml")
    expect(resposta.headers.get("Content-Disposition")).toBe('attachment; filename="compras-padaria-do-centro.xlsx"')

    expect(linhas![0]).toEqual(CABECALHO)
    expect(linhas).toHaveLength(4)
    // Mais recente primeiro, como na tela.
    expect(colunas(linhas![1]).slice(1)).toEqual([5100, 12, undefined, "Pix", "Dona Admin", "Manual", undefined])
    expect(colunas(linhas![2]).slice(1)).toEqual([3800, 10, 50, "Boleto", "Dona Admin", "Manual", undefined])
    expect(colunas(linhas![3]).slice(1)).toEqual([4200, undefined, undefined, undefined, undefined, "Manual", undefined])
    expect(aba!["A2"].t).toBe("d")
    expect((aba!["A2"].v as Date).toLocaleDateString("pt-BR")).toBe("05/03/2026")
    expect(aba!["B2"].t).toBe("n")
  })

  it("CA-B30-14: contato sem compras baixa só o cabeçalho, sem erro", async () => {
    const { resposta, linhas } = await baixar(semCompras)
    expect(resposta.status).toBe(200)
    expect(linhas).toEqual([CABECALHO])
  })
})
