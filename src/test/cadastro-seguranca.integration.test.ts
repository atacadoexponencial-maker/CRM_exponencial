// @vitest-environment node
// B19-01 — ataques ao cadastro (auditoria de 06/10/2026). Bate no Supabase real.
// Antes desta issue, qualquer pessoa sem login virava Admin de uma empresa existente
// chamando a action criarAdminETimesPadrao com o código da empresa.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

// B20-05: as actions leem o IP de quem chama; cada rodada usa um endereço próprio para o
// freio de tentativas não misturar rodadas.
const IP_DO_TESTE = `teste-${Date.now()}-${Math.random()}`
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": IP_DO_TESTE }) }))

vi.mock("@/integrations/supabase/server", async () => {
  const { createClient } = await import("@supabase/supabase-js")
  return {
    createClient: async () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
  }
})

import * as acoesDoCadastro from "@/app/cadastro/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let vitima = ""
let atacanteId = ""
const emailAtacante = `b19-01-atacante-${ts}@teste.com`
const usuariosExtras: string[] = []
const empresasExtras: string[] = []

beforeAll(async () => {
  vitima = (await service.from("workspaces").insert({ name: `Vítima B19 ${ts}` }).select("id").single()).data!.id
  const { data } = await service.auth.admin.createUser({ email: emailAtacante, password: SENHA, email_confirm: true })
  atacanteId = data.user!.id
}, 30_000)

afterAll(async () => {
  for (const ws of empresasExtras) {
    await service.from("sequences").delete().eq("workspace_id", ws)
    await service.from("teams").delete().eq("workspace_id", ws)
    await service.from("profiles").delete().eq("workspace_id", ws)
  }
  await service.from("profiles").delete().eq("workspace_id", vitima)
  await service.from("teams").delete().eq("workspace_id", vitima)
  for (const id of [atacanteId, ...usuariosExtras]) await service.auth.admin.deleteUser(id)
  for (const ws of empresasExtras) await service.from("workspaces").delete().eq("id", ws)
  await service.from("workspaces").delete().eq("id", vitima)
}, 60_000)

describe("B19-01 — Ataques ao cadastro são recusados", { timeout: 30_000 }, () => {
  it("should not expor actions avulsas de criar empresa, criar Admin ou consultar e-mail", () => {
    expect(Object.keys(acoesDoCadastro).filter((k) => typeof (acoesDoCadastro as Record<string, unknown>)[k] === "function"))
      .toEqual(["cadastrarEmpresa"])
  })

  it("should reject anônimo chamando a função do banco para virar Admin da empresa vítima", async () => {
    const anon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error } = await anon.rpc("cadastrar_empresa", {
      p_user_id: atacanteId,
      p_nome_empresa: "x",
      p_nome_responsavel: "x",
    })
    expect(error).not.toBeNull()
    const { count } = await service.from("profiles").select("id", { count: "exact", head: true }).eq("id", atacanteId)
    expect(count).toBe(0)
  })

  it("should reject usuário logado chamando a função do banco", async () => {
    const logado = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await logado.auth.signInWithPassword({ email: emailAtacante, password: SENHA })
    const { error } = await logado.rpc("cadastrar_empresa", {
      p_user_id: atacanteId,
      p_nome_empresa: "x",
      p_nome_responsavel: "x",
    })
    expect(error).not.toBeNull()
    const { count } = await service.from("profiles").select("id", { count: "exact", head: true }).eq("id", atacanteId)
    expect(count).toBe(0)
  })

  it("should ignorar código de empresa mandado de fora: o Admin nasce numa empresa nova", async () => {
    const email = `b19-01-intruso-${ts}@teste.com`
    const r = await acoesDoCadastro.cadastrarEmpresa({
      nomeEmpresa: `Intruso B19 ${ts}`,
      nomeResponsavel: "Intruso",
      email,
      senha: SENHA,
      confirmarSenha: SENHA,
      workspaceId: vitima,
      workspace_id: vitima,
    })
    expect(r).toEqual({ ok: true })

    const anon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await anon.auth.signInWithPassword({ email, password: SENHA })
    const { data: perfil } = await service.from("profiles").select("workspace_id").eq("id", data.user!.id).single()
    usuariosExtras.push(data.user!.id)
    empresasExtras.push(perfil!.workspace_id)

    expect(perfil!.workspace_id).not.toBe(vitima)
    const { count } = await service.from("profiles").select("id", { count: "exact", head: true }).eq("workspace_id", vitima)
    expect(count).toBe(0)
  })

  it("should reject a função do banco para usuário que já tem perfil, sem criar empresa", async () => {
    const nome = `Segunda Empresa B19 ${ts}`
    await service.from("profiles").insert({ id: atacanteId, workspace_id: vitima, name: "Atacante", role: "atendente" })

    const { error } = await service.rpc("cadastrar_empresa", { p_user_id: atacanteId, p_nome_empresa: nome, p_nome_responsavel: "x" })
    expect(error).not.toBeNull()

    const { count } = await service.from("workspaces").select("id", { count: "exact", head: true }).eq("name", nome)
    expect(count).toBe(0)
    const { data: perfil } = await service.from("profiles").select("workspace_id, role").eq("id", atacanteId).single()
    expect(perfil).toEqual({ workspace_id: vitima, role: "atendente" })
  })
})
