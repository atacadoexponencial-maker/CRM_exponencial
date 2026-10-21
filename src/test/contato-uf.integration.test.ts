// @vitest-environment node
// B32-02: UF do contato. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { atualizarDadosContato, buscarDadosContato, criarContato } from "@/app/(auth)/contatos/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
let ws = ""
let adminId = ""
let contatoId = ""
let admin: SupabaseClient

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B32-02 ${ts}` }).select().single()).data!.id
  criados.workspaceIds.push(ws)
  const email = `b32-02-admin-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  adminId = data.user!.id
  criados.userIds.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await admin.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  mockSsr.mockResolvedValue(admin as never)

  contatoId = (
    await service.from("contacts").insert({ workspace_id: ws, phone_number: "5581900000321", name: "Loja Recife", cidade: "Recife" }).select("id").single()
  ).data!.id
}, 60_000)

afterAll(async () => {
  await service.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("B32-02 — UF do contato", { timeout: 60_000 }, () => {
  it("CA-B32-25: salvar 'PE' no perfil grava a UF e o perfil devolve 'PE' ao lado da cidade", async () => {
    const r = await atualizarDadosContato(contatoId, { nome: "Loja Recife", cidade: "Recife", uf: "PE" })
    expect(r.erro).toBeUndefined()

    const perfil = await buscarDadosContato(contatoId)
    expect(perfil?.cidade).toBe("Recife")
    expect(perfil?.uf).toBe("PE")
    expect((await service.from("contacts").select("uf").eq("id", contatoId).single()).data?.uf).toBe("PE")

    // Criar um contato novo já com UF também grava; vazio vira nulo.
    const novo = await criarContato({ nome: "Bazar SP", telefone: "11 98888-0322", uf: "sp" })
    expect(novo.erro).toBeUndefined()
    expect((await service.from("contacts").select("uf").eq("id", novo.id!).single()).data?.uf).toBe("SP")
    const semUf = await criarContato({ nome: "Sem UF", telefone: "11 98888-0323", uf: "" })
    expect((await service.from("contacts").select("uf").eq("id", semUf.id!).single()).data?.uf).toBeNull()
  })

  it("CA-B32-26: UF 'XX' é recusada com 'UF inválida' e nada é gravado", async () => {
    const antes = (await service.from("contacts").select("uf, name").eq("id", contatoId).single()).data!

    const r = await atualizarDadosContato(contatoId, { nome: "Nome que não deve valer", uf: "XX" })
    expect(r.erro).toBe("UF inválida")
    const depois = (await service.from("contacts").select("uf, name").eq("id", contatoId).single()).data!
    expect(depois).toEqual(antes)

    const novo = await criarContato({ nome: "Não nasce", telefone: "11 98888-0324", uf: "XX" })
    expect(novo.erro).toBe("UF inválida")
    expect(novo.id).toBeUndefined()
    expect((await service.from("contacts").select("id").eq("workspace_id", ws).eq("phone_number", "5511988880324")).data).toHaveLength(0)
  })
})
