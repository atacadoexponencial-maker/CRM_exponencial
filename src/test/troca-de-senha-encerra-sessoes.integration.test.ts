// @vitest-environment node
// Pista 9 da auditoria run-2 — teste de guarda. Trocar a senha pelo Perfil tem que derrubar
// as outras sessões da conta (quem roubou uma sessão sai junto). O CRM não faz isso: quem
// faz é o Supabase Auth, ao trocar a senha (experimento de 06/11/2026). Se um dia ele parar,
// este teste falha, e `alterarSenha` passa a precisar do `signOut({ scope: "others" })`.
//
// Bate no Supabase real. A sessão A troca a senha pela action do Perfil; a B é outro
// aparelho da mesma conta. O controle (sem troca) prova que a recusa vem da troca.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let sessaoA: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => sessaoA }))

import { alterarSenha } from "@/app/(auth)/perfil/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = ""
const usuarios: string[] = []

async function criarConta(sufixo: string) {
  const email = `auditoria-p9-${sufixo}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresa, name: `Pista 9 ${sufixo}`, role: "atendente" })
  return email
}

/** Um aparelho com sessão aberta na conta. */
async function aparelho(email: string, senha = SENHA) {
  const cliente = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha })
  expect(error).toBeNull()
  return { cliente, tokenDeAcesso: data.session!.access_token, tokenDeRenovacao: data.session!.refresh_token }
}

/** A sessão B ainda vale? Renovar e usar o token antigo. */
async function sessaoBVale(b: Awaited<ReturnType<typeof aparelho>>) {
  const novo = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const renovacao = await novo().auth.refreshSession({ refresh_token: b.tokenDeRenovacao })
  const usuario = await novo().auth.getUser(b.tokenDeAcesso)
  return { renova: !renovacao.error, tokenAntigoVale: !usuario.error }
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Pista 9 ${ts}` }).select("id").single()).data!.id
}, 30_000)

afterAll(async () => {
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", empresa)
}, 30_000)

describe("Pista 9 (guarda) — trocar a senha pelo Perfil encerra as outras sessões", { timeout: 30_000 }, () => {
  it("should derrubar a sessão do outro aparelho quando a senha é trocada", async () => {
    const email = await criarConta("troca")
    const a = await aparelho(email)
    const b = await aparelho(email)
    sessaoA = a.cliente

    expect(await alterarSenha(SENHA, "senha-nova-456", "senha-nova-456")).toEqual({})

    expect(await sessaoBVale(b)).toEqual({ renova: false, tokenAntigoVale: false })
  })

  it("should manter a sessão do outro aparelho quando a senha não é trocada (controle)", async () => {
    const email = await criarConta("controle")
    await aparelho(email)
    const b = await aparelho(email)

    expect(await sessaoBVale(b)).toEqual({ renova: true, tokenAntigoVale: true })
  })
})
