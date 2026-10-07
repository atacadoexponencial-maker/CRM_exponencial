// @vitest-environment node
// B19-01 — cadastro de empresa numa operação só. Bate no Supabase real; só o client SSR
// (cookies do Next) é trocado por um client comum, porque o Vitest não tem requisição.
// Substitui os testes das actions antigas (verificarEmailEmUso, criarWorkspace,
// criarAdminETimesPadrao), que deixaram de existir.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, afterAll } from "vitest"

// B20-05: as actions leem o IP de quem chama. Este arquivo faz mais cadastros do que o
// freio deixa por endereço (5 por hora), então cada chamada vem de um endereço próprio.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `teste-${Date.now()}-${Math.random()}` }),
}))

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

vi.mock("@/integrations/supabase/server", async () => {
  const { createClient } = await import("@supabase/supabase-js")
  return {
    createClient: async () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
  }
})

// Para o cenário "falha no meio": a função do banco falha quando o nome da empresa é este.
const NOME_QUE_FALHA = "__forcar_falha_b19_01__"
vi.mock("@/integrations/supabase/service", async () => {
  const { createClient } = await import("@supabase/supabase-js")
  return {
    createServiceClient: () => {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const rpcOriginal = client.rpc.bind(client)
      client.rpc = ((fn: string, args?: Record<string, unknown>) => {
        if (fn === "cadastrar_empresa" && args?.p_nome_empresa === NOME_QUE_FALHA) {
          return Promise.resolve({ data: null, error: { message: "falha forçada" } })
        }
        return rpcOriginal(fn, args)
      }) as typeof client.rpc
      return client
    },
  }
})

import { cadastrarEmpresa } from "@/app/cadastro/actions"

const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const usuariosCriados: string[] = []
const empresasCriadas: string[] = []

function dados(sufixo: string, extra: Record<string, unknown> = {}) {
  return {
    nomeEmpresa: `Empresa B19 ${sufixo} ${ts}`,
    nomeResponsavel: "Responsável Teste",
    email: `b19-01-${sufixo}-${ts}@teste.com`,
    senha: "senha-segura-123",
    confirmarSenha: "senha-segura-123",
    ...extra,
  }
}

async function perfilPorEmail(email: string) {
  const anon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data } = await anon.auth.signInWithPassword({ email, password: "senha-segura-123" })
  if (!data.user) return null
  const { data: perfil } = await service.from("profiles").select("id, workspace_id, role, name").eq("id", data.user.id).single()
  if (perfil) {
    usuariosCriados.push(perfil.id)
    empresasCriadas.push(perfil.workspace_id)
  }
  return perfil
}

afterAll(async () => {
  for (const ws of empresasCriadas) {
    await service.from("sequences").delete().eq("workspace_id", ws)
    await service.from("teams").delete().eq("workspace_id", ws)
    await service.from("profiles").delete().eq("workspace_id", ws)
  }
  for (const id of usuariosCriados) await service.auth.admin.deleteUser(id)
  for (const ws of empresasCriadas) await service.from("workspaces").delete().eq("id", ws)
}, 60_000)

describe("B19-01 — Cadastro de empresa numa operação só", { timeout: 30_000 }, () => {
  it("should criar empresa, Admin e times Entrada e Recompra numa chamada só", async () => {
    const d = dados("ok")
    const r = await cadastrarEmpresa(d)
    expect(r).toEqual({ ok: true })

    const perfil = await perfilPorEmail(d.email)
    expect(perfil).toMatchObject({ role: "admin", name: "Responsável Teste" })

    const { data: empresa } = await service.from("workspaces").select("name").eq("id", perfil!.workspace_id).single()
    expect(empresa!.name).toBe(d.nomeEmpresa)

    const { data: times } = await service.from("teams").select("name, is_default").eq("workspace_id", perfil!.workspace_id)
    expect(times!.map((t) => t.name).sort()).toEqual(["Entrada", "Recompra"])
    expect(times!.every((t) => t.is_default)).toBe(true)
  })

  it("should gravar nomes sem espaços nas pontas", async () => {
    const d = dados("trim", { nomeEmpresa: `  Empresa Trim ${ts}  `, nomeResponsavel: "  Maria  " })
    expect(await cadastrarEmpresa(d)).toEqual({ ok: true })
    const perfil = await perfilPorEmail(d.email)
    expect(perfil!.name).toBe("Maria")
    const { data: empresa } = await service.from("workspaces").select("name").eq("id", perfil!.workspace_id).single()
    expect(empresa!.name).toBe(`Empresa Trim ${ts}`)
  })

  it("should reject e-mail já cadastrado sem criar nada", async () => {
    const d = dados("repetido")
    expect(await cadastrarEmpresa(d)).toEqual({ ok: true })
    await perfilPorEmail(d.email)

    const outraEmpresa = `Outra Empresa Repetida ${ts}`
    const r = await cadastrarEmpresa({ ...d, nomeEmpresa: outraEmpresa })
    expect(r).toEqual({ erro: "email_em_uso" })

    const { count } = await service.from("workspaces").select("id", { count: "exact", head: true }).eq("name", outraEmpresa)
    expect(count).toBe(0)
  })

  it("should reject dados inválidos mandados direto ao servidor", async () => {
    expect(await cadastrarEmpresa({ ...dados("inv1"), email: "nao-e-email" })).toEqual({ erro: "dados_invalidos" })
    expect(await cadastrarEmpresa({ ...dados("inv2"), senha: "curta", confirmarSenha: "curta" })).toEqual({ erro: "dados_invalidos" })
    expect(await cadastrarEmpresa({ ...dados("inv3"), confirmarSenha: "outra-senha-123" })).toEqual({ erro: "dados_invalidos" })
    expect(await cadastrarEmpresa({ ...dados("inv4"), nomeEmpresa: "   " })).toEqual({ erro: "dados_invalidos" })
    expect(await cadastrarEmpresa(null)).toEqual({ erro: "dados_invalidos" })

    const { count } = await service.from("workspaces").select("id", { count: "exact", head: true }).like("name", `Empresa B19 inv% ${ts}`)
    expect(count).toBe(0)
  })

  it("should not deixar usuário nem empresa pela metade quando a função do banco falha", async () => {
    const d = dados("falha", { nomeEmpresa: NOME_QUE_FALHA })
    expect(await cadastrarEmpresa(d)).toEqual({ erro: "falha" })

    // O usuário do Auth foi desfeito: o mesmo e-mail cadastra de novo sem "em uso".
    const r = await cadastrarEmpresa({ ...d, nomeEmpresa: `Empresa B19 refeita ${ts}` })
    expect(r).toEqual({ ok: true })
    await perfilPorEmail(d.email)
  })
})
