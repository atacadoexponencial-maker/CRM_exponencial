// @vitest-environment node
// B53-09 — "Adiar" soma ao horário original do lembrete e nunca cai no passado.
// Bate no Supabase de teste, numa empresa criada para o teste e apagada no fim.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { adiarLembrete } from "@/app/(auth)/agenda/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
let ws = "", anaId = "", contato = ""
let navegador: SupabaseClient

/** Dia daqui a `d` dias, no calendário de Brasília (yyyy-mm-dd). */
const diaDaqui = (d: number) => new Date(Date.now() + d * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
const asDez = (d: number) => new Date(`${diaDaqui(d)}T10:00:00-03:00`).toISOString()

async function lembrete(dueAt: string) {
  const { data } = await service
    .from("reminders")
    .insert({ workspace_id: ws, contact_id: contato, atendente_id: anaId, origem: "avulso", instrucao: "Ligar", due_at: dueAt })
    .select("id")
    .single()
  return data!.id as string
}

const vencimento = async (id: string) =>
  new Date((await service.from("reminders").select("due_at").eq("id", id).single()).data!.due_at).toISOString()

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B53-09 ${ts}` }).select("id").single()).data!.id
  const email = `b53-09-ana-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  anaId = data.user!.id
  await service.from("profiles").insert({ id: anaId, workspace_id: ws, name: "Ana", role: "atendente", status: "active" })
  navegador = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  contato = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja Ana", phone_number: `5521953${String(ts).slice(-6)}`, atendente_id: anaId }).select("id").single()).data!.id
  mockSsr.mockResolvedValue(navegador as never)
}, 120_000)

afterAll(async () => {
  await service.from("reminders").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("id", anaId)
  await service.auth.admin.deleteUser(anaId)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B53-09 — adiar pelo horário original", { timeout: 60_000 }, () => {
  it("CA-B53-20: should passar o lembrete de amanhã às 10:00 para depois de amanhã às 10:00", async () => {
    const id = await lembrete(asDez(1))
    expect(await adiarLembrete(id, 1)).toEqual({})
    expect(await vencimento(id)).toBe(asDez(2))
  })

  it("CA-B53-21: should passar o lembrete atrasado de 3 dias atrás às 10:00 para amanhã às 10:00", async () => {
    const id = await lembrete(asDez(-3))
    expect(await adiarLembrete(id, 1)).toEqual({})
    expect(await vencimento(id)).toBe(asDez(1))
  })
})
