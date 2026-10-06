// @vitest-environment node
// B20-02 — usuário desativado perde o acesso de verdade (auditoria de 06/10/2026).
// Bate no Supabase real. O client SSR (cookies do Next) é trocado pelo client do
// "navegador" da vez: o Admin para desativar/reativar, um client limpo para o login.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import { desativarUsuario, reativarUsuario } from "@/app/(auth)/configuracoes/usuarios/actions"
import { realizarLogin } from "@/app/login/actions"
import { AVISO_CONTA_DESATIVADA } from "@/app/login/avisos"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const emailAdmin = `b20-02-admin-${ts}@teste.com`
const emailAtendente = `b20-02-atendente-${ts}@teste.com`
let empresa = "", admin = "", atendente = "", contato = "", conversa = ""
let navegadorAdmin: SupabaseClient
let tokenAntigo = ""

const novoCliente = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function lerComToken(tabela: string, token: string) {
  const r = await fetch(`${URL}/rest/v1/${tabela}?select=id&workspace_id=eq.${empresa}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  })
  return (await r.json()) as unknown[]
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Desativado B20 ${ts}` }).select("id").single()).data!.id
  admin = (await service.auth.admin.createUser({ email: emailAdmin, password: SENHA, email_confirm: true })).data.user!.id
  atendente = (await service.auth.admin.createUser({ email: emailAtendente, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert([
    { id: admin, workspace_id: empresa, name: "Admin", role: "admin" },
    { id: atendente, workspace_id: empresa, name: "Atendente", role: "atendente" },
  ])
  contato = (await service.from("contacts").insert({ workspace_id: empresa, name: "Cliente", phone_number: `55219${String(ts).slice(-8)}` }).select("id").single()).data!.id
  conversa = (await service.from("conversations").insert({ workspace_id: empresa, contact_id: contato }).select("id").single()).data!.id
  await service.from("messages").insert({ workspace_id: empresa, conversation_id: conversa, direction: "inbound", type: "text", content: "oi" })

  navegadorAdmin = novoCliente()
  await navegadorAdmin.auth.signInWithPassword({ email: emailAdmin, password: SENHA })
  const navegadorAtendente = novoCliente()
  const { data } = await navegadorAtendente.auth.signInWithPassword({ email: emailAtendente, password: SENHA })
  tokenAntigo = data.session!.access_token
}, 60_000)

afterAll(async () => {
  await service.auth.admin.updateUserById(atendente, { ban_duration: "none" })
  await service.from("messages").delete().eq("conversation_id", conversa)
  await service.from("conversations").delete().eq("id", conversa)
  await service.from("contacts").delete().eq("id", contato)
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of [admin, atendente]) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B20-02 — Usuário desativado perde o acesso de verdade", { timeout: 40_000 }, () => {
  it("should ver os dados da empresa antes de ser desativado (controle)", async () => {
    expect(await lerComToken("conversations", tokenAntigo)).toHaveLength(1)
    expect(await lerComToken("contacts", tokenAntigo)).toHaveLength(1)
  })

  it("should not deixar a sessão antiga ler conversas, contatos, mensagens nem perfis depois de desativado", async () => {
    clienteDaVez = navegadorAdmin
    expect(await desativarUsuario(atendente)).toEqual({})

    for (const tabela of ["conversations", "contacts", "messages", "profiles"]) {
      expect(await lerComToken(tabela, tokenAntigo)).toHaveLength(0)
    }
  })

  it("should not deixar a sessão antiga ser aceita como usuário logado", async () => {
    const { data, error } = await novoCliente().auth.getUser(tokenAntigo)
    expect(data.user).toBeNull()
    expect(error?.code).toBe("user_banned")
  })

  it("should reject o login do desativado com o aviso de conta desativada", async () => {
    clienteDaVez = novoCliente()
    expect(await realizarLogin(emailAtendente, SENHA)).toEqual({ erro: AVISO_CONTA_DESATIVADA })
  })

  it("should reject o login de perfil inativo mesmo sem ban no Auth", async () => {
    await service.auth.admin.updateUserById(atendente, { ban_duration: "none" })
    clienteDaVez = novoCliente()
    expect(await realizarLogin(emailAtendente, SENHA)).toEqual({ erro: AVISO_CONTA_DESATIVADA })
    await service.auth.admin.updateUserById(atendente, { ban_duration: "876000h" })
  })

  it("should devolver o acesso com mesma senha e papel ao reativar", async () => {
    clienteDaVez = navegadorAdmin
    expect(await reativarUsuario(atendente)).toEqual({})

    const navegador = novoCliente()
    const { data, error } = await navegador.auth.signInWithPassword({ email: emailAtendente, password: SENHA })
    expect(error).toBeNull()
    expect(await lerComToken("conversations", data.session!.access_token)).toHaveLength(1)
    const { data: perfil } = await service.from("profiles").select("role, status").eq("id", atendente).single()
    expect(perfil).toEqual({ role: "atendente", status: "active" })
  })

  it("should not desativar usuário de outra empresa", async () => {
    const outra = (await service.from("workspaces").insert({ name: `Outra B20 ${ts}` }).select("id").single()).data!.id
    const { data } = await service.auth.admin.createUser({ email: `b20-02-outra-${ts}@teste.com`, password: SENHA, email_confirm: true })
    await service.from("profiles").insert({ id: data.user!.id, workspace_id: outra, name: "X", role: "atendente" })

    clienteDaVez = navegadorAdmin
    expect((await desativarUsuario(data.user!.id)).erro).toBeTruthy()
    const { data: u } = await service.auth.admin.getUserById(data.user!.id)
    expect(u.user!.banned_until ?? null).toBeNull()

    await service.from("profiles").delete().eq("id", data.user!.id)
    await service.auth.admin.deleteUser(data.user!.id)
    await service.from("workspaces").delete().eq("id", outra)
  })
})
