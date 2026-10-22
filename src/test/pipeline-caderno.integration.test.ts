// @vitest-environment node
// B36-05 — o card do funil traz o total já comprado pelo cliente (compras registradas)
// e a cidade dele. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { listarCardsEntrada } from "@/app/(auth)/pipeline/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
let ws = "", admin = ""
let navegador: SupabaseClient
const contatos: string[] = []

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B36-05 ${ts}` }).select("id").single()).data!.id
  const email = `b36-05-admin-${ts}@teste.com`
  admin = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: admin, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  navegador = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  vi.mocked(createSsrClient).mockResolvedValue(navegador as never)

  const compras: number[][] = [[60, 40], [250], []]
  for (const [i, valores] of compras.entries()) {
    const contato = (await service.from("contacts").insert({ workspace_id: ws, name: `Cliente ${i}`, phone_number: `5521966${String(ts).slice(-5)}${i}`, cidade: "Goiânia", uf: "GO" }).select("id").single()).data!.id
    contatos.push(contato)
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contato, funil: "entrada", etapa: "lead" })
    for (const valor of valores) await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: contato, valor, data: "2026-10-01" })
  }
}, 90_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  await service.auth.admin.deleteUser(admin)
  await service.from("workspaces").delete().eq("id", ws)
}, 90_000)

describe("B36-05 — Card com total comprado", { timeout: 40_000 }, () => {
  it("CA-B36-23: should trazer em cada card o total já comprado pelo cliente e a cidade dele", async () => {
    const cards = await listarCardsEntrada()
    const porContato = Object.fromEntries(cards.map((c) => [c.contactId, c]))
    expect(porContato[contatos[0]].totalComprado).toBe(100)
    expect(porContato[contatos[1]].totalComprado).toBe(250)
    expect(porContato[contatos[2]].totalComprado).toBe(0)
    expect(porContato[contatos[0]].cidade).toBe("Goiânia · GO")
    expect(cards.reduce((s, c) => s + (c.totalComprado ?? 0), 0)).toBe(350)
  })
})
