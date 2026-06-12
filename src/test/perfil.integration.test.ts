// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alterarSenha, realizarLogout } from "@/app/(auth)/perfil/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = {
  workspaceIds: [] as string[],
  userIds: [] as string[],
}

async function criarUsuarioComWorkspace(email: string) {
  const ts = Date.now()
  const { data: ws } = await serviceClient
    .from("workspaces")
    .insert({ name: `Empresa Perfil ${ts}` })
    .select()
    .single()
  if (!ws) throw new Error("Falha ao criar workspace")

  const { data: authData } = await serviceClient.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar user ${email}`)

  await serviceClient.from("profiles").insert({
    id: authData.user.id,
    workspace_id: ws.id,
    name: "Usuário Teste",
    role: "atendente",
    status: "active",
  })

  criados.workspaceIds.push(ws.id)
  criados.userIds.push(authData.user.id)
  return { userId: authData.user.id, email }
}

async function autenticarComo(email: string, senha = SENHA) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: senha })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  return client
}

afterAll(async () => {
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) {
      await serviceClient.auth.admin.deleteUser(id)
    }
  }
  if (criados.workspaceIds.length > 0) {
    await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
  }
})

// ---------------------------------------------------------------------------

describe("Issue 29 — Alterar senha", () => {
  let usuarioEmail: string

  beforeAll(async () => {
    const ts = Date.now()
    usuarioEmail = `perfil-29-${ts}@test.com`
    await criarUsuarioComWorkspace(usuarioEmail)
  })

  beforeEach(async () => {
    const client = await autenticarComo(usuarioEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("usuário altera senha com senha atual correta", async () => {
    const novaSenha = "nova-senha-456!"
    const resultado = await alterarSenha(SENHA, novaSenha, novaSenha)
    expect(resultado.erro).toBeUndefined()

    // Verifica que a nova senha funciona
    const client = createClient(URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await client.auth.signInWithPassword({
      email: usuarioEmail,
      password: novaSenha,
    })
    expect(error).toBeNull()

    // Restaura a senha original para não quebrar outros testes
    await serviceClient.auth.admin.updateUserById(
      criados.userIds[criados.userIds.length - 1],
      { password: SENHA }
    )
  })

  it("rejeita se senha atual estiver incorreta", async () => {
    const resultado = await alterarSenha("senha-errada!", "nova-senha-456!", "nova-senha-456!")
    expect(resultado.erro).toBe("Senha atual incorreta.")
  })

  it("rejeita se nova senha e confirmação não coincidirem", async () => {
    const resultado = await alterarSenha(SENHA, "nova-senha-456!", "senha-diferente-789!")
    expect(resultado.erro).toBe("As senhas não coincidem.")
  })
})

// ---------------------------------------------------------------------------

describe("Issue 30 — Logout", () => {
  let usuarioEmail: string

  beforeAll(async () => {
    const ts = Date.now() + 1
    usuarioEmail = `perfil-30-${ts}@test.com`
    await criarUsuarioComWorkspace(usuarioEmail)
  })

  it("sessão é encerrada após logout", async () => {
    const client = await autenticarComo(usuarioEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    await client.auth.signOut()

    const { data: { user } } = await client.auth.getUser()
    expect(user).toBeNull()
  })

  it("usuário é redirecionado para /login após logout", async () => {
    const client = await autenticarComo(usuarioEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    try {
      await realizarLogout()
      expect.fail("Deveria ter lançado redirect")
    } catch (e) {
      expect((e as { digest?: string }).digest).toMatch(/NEXT_REDIRECT.*\/login/)
    }
  })

  it("token de sessão é invalidado após logout", async () => {
    const client = await autenticarComo(usuarioEmail)

    await client.auth.signOut()

    // Após signOut, não há sessão ativa — getUser retorna null
    const { data: { session } } = await client.auth.getSession()
    expect(session).toBeNull()
  })
})
