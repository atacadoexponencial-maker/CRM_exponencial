// @vitest-environment node
// B36-06 — a ficha do Chat recebe do servidor o resumo das compras do cliente, também
// para o Atendente responsável pela conversa. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarInfoContato } from "@/app/(auth)/chat/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
let ws = "", ana = "", contato = "", conversa = ""
let navegador: SupabaseClient
const diasAntes = (d: number) => new Date(Date.now() - d * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B36-06 ${ts}` }).select("id").single()).data!.id
  const email = `b36-06-ana-${ts}@teste.com`
  ana = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: ana, workspace_id: ws, name: "Ana", role: "atendente", status: "active" })
  navegador = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  vi.mocked(createSsrClient).mockResolvedValue(navegador as never)

  contato = (await service.from("contacts").insert({ workspace_id: ws, name: "Moda Sol", phone_number: `5534977${String(ts).slice(-6)}` }).select("id").single()).data!.id
  conversa = (await service.from("conversations").insert({ workspace_id: ws, contact_id: contato, assigned_to: ana, status: "em_atendimento" }).select("id").single()).data!.id
  for (const [valor, dias] of [[1000, 40], [2000, 25], [3000, 10]]) {
    await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: contato, valor, data: diasAntes(dias) })
  }
}, 90_000)

afterAll(async () => {
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  await service.auth.admin.deleteUser(ana)
  await service.from("workspaces").delete().eq("id", ws)
}, 90_000)

describe("B36-06 — Resumo de compras na ficha do Chat", { timeout: 40_000 }, () => {
  it("CA-B36-26: should trazer para a ficha o total, os pedidos, o ticket médio e há quantos dias foi a última compra", async () => {
    const info = await buscarInfoContato(conversa)
    expect(info.compras).toEqual({ total: 6000, quantidade: 3, ticketMedio: 2000, diasDesdeUltima: 10 })
  })
})
