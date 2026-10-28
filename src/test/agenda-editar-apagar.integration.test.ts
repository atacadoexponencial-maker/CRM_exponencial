// @vitest-environment node
// B48-06 — follow-up da Agenda: editar, apagar e desfazer o Feito, e quem pode.
// Bate no Supabase real, numa empresa criada para o teste e apagada no fim.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { apagarLembrete, desfazerFeito, editarLembrete, marcarLembreteFeito } from "@/app/(auth)/agenda/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const usuarios: string[] = []
const empresas: string[] = []
const navegadores: Record<string, SupabaseClient> = {}
let ws = "", gerenteId = "", anaId = "", forasteiroId = "", contatoAna = ""

const entrarComo = (id: string) => mockSsr.mockResolvedValue(navegadores[id] as never)
/** Dia daqui a `d` dias, no calendário de Brasília (yyyy-mm-dd). */
const diaDaqui = (d: number) => new Date(Date.now() + d * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

async function criarUsuario(empresa: string, nome: string, role: string) {
  const email = `b46-06-${nome.toLowerCase()}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: empresa, name: nome, role, status: "active" })
  usuarios.push(data.user!.id)
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  navegadores[data.user!.id] = c
  return data.user!.id
}

async function lembrete(atendente: string, instrucao: string, status = "pendente") {
  const { data } = await service
    .from("reminders")
    .insert({ workspace_id: ws, contact_id: contatoAna, atendente_id: atendente, origem: "avulso", instrucao, due_at: new Date(Date.now() + 86400000).toISOString(), status })
    .select("id")
    .single()
  return data!.id as string
}

const linha = async (id: string) => (await service.from("reminders").select("instrucao, due_at, status, done_at").eq("id", id).maybeSingle()).data

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B48-06 ${ts}` }).select("id").single()).data!.id
  const outra = (await service.from("workspaces").insert({ name: `B48-06 outra ${ts}` }).select("id").single()).data!.id
  empresas.push(ws, outra)
  gerenteId = await criarUsuario(ws, "Gerente", "gerente")
  anaId = await criarUsuario(ws, "Ana", "atendente")
  forasteiroId = await criarUsuario(outra, "Forasteiro", "admin")
  contatoAna = (await service.from("contacts").insert({ workspace_id: ws, name: "Loja Ana", phone_number: `5521955${String(ts).slice(-6)}`, atendente_id: anaId }).select("id").single()).data!.id
}, 120_000)

afterAll(async () => {
  for (const e of empresas) {
    await service.from("reminders").delete().eq("workspace_id", e)
    await service.from("pipeline_cards").delete().eq("workspace_id", e)
    await service.from("contacts").delete().eq("workspace_id", e)
  }
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  for (const e of empresas) await service.from("workspaces").delete().eq("id", e)
}, 120_000)

describe("B48-06 — editar, apagar e desfazer o Feito", { timeout: 60_000 }, () => {
  it("CA-B48-11: should mudar a data e a nota do follow-up, e recusar data no passado", async () => {
    const id = await lembrete(anaId, "Ligar")
    entrarComo(anaId)
    expect(await editarLembrete(id, { contactId: contatoAna, data: diaDaqui(2), hora: "10:00", nota: "Ligar às 10h" })).toEqual({})
    const depois = await linha(id)
    expect(depois!.instrucao).toBe("Ligar às 10h")
    expect(new Date(depois!.due_at).toISOString()).toBe(new Date(`${diaDaqui(2)}T10:00:00-03:00`).toISOString())

    entrarComo(anaId)
    expect(await editarLembrete(id, { contactId: contatoAna, data: diaDaqui(-2), nota: "Ontem" })).toEqual({ erro: "A data do follow-up já passou." })
    expect((await linha(id))!.instrucao).toBe("Ligar às 10h")
  })

  it("CA-B48-12: should tirar o follow-up da Agenda e do banco ao apagar", async () => {
    const id = await lembrete(anaId, "Apagar este")
    entrarComo(anaId)
    expect(await apagarLembrete(id)).toEqual({})
    expect(await linha(id)).toBeNull()
  })

  it("CA-B48-13: should voltar o Feito para pendente com a mesma data ao desfazer", async () => {
    const id = await lembrete(anaId, "Feito sem querer")
    const antes = (await linha(id))!.due_at
    entrarComo(anaId)
    expect(await marcarLembreteFeito(id)).toEqual({})
    expect((await linha(id))!.status).toBe("feito")
    entrarComo(anaId)
    expect(await desfazerFeito(id)).toEqual({})
    const depois = await linha(id)
    expect(depois!.status).toBe("pendente")
    expect(depois!.done_at).toBeNull()
    expect(depois!.due_at).toBe(antes)
  })

  it("CA-B48-14: should deixar a empresa mexer no follow-up e recusar quem é de outra empresa", async () => {
    // Lembrete criado pela automação para a Ana: ela edita e apaga, mesmo sem ter criado
    const daAna = await lembrete(anaId, "Da automação")
    entrarComo(anaId)
    expect(await editarLembrete(daAna, { contactId: contatoAna, data: diaDaqui(3), nota: "Editado pela Ana" })).toEqual({})

    // O Gerente mexe no da Ana
    entrarComo(gerenteId)
    expect(await editarLembrete(daAna, { contactId: contatoAna, data: diaDaqui(4), nota: "Editado pelo Gerente" })).toEqual({})
    expect((await linha(daAna))!.instrucao).toBe("Editado pelo Gerente")

    // De outra empresa, não
    entrarComo(forasteiroId)
    expect((await editarLembrete(daAna, { contactId: contatoAna, data: diaDaqui(5), nota: "Invasor" })).erro).toBeTruthy()
    entrarComo(forasteiroId)
    expect((await apagarLembrete(daAna)).erro).toBeTruthy()
    expect((await linha(daAna))!.instrucao).toBe("Editado pelo Gerente")

    entrarComo(gerenteId)
    expect(await apagarLembrete(daAna)).toEqual({})
    expect(await linha(daAna)).toBeNull()
  })
})
