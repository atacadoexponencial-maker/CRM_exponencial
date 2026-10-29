// @vitest-environment node
// B51-02 — Cadastro só com convite. Bate no banco de teste.
// Mockados só o cliente SSR (o login do fim do cadastro e a sessão da plataforma) e os
// cabeçalhos do pedido (cada cadastro vem de um endereço próprio, por causa do freio).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let ipDaVez: string | null = null
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": ipDaVez ?? `teste-${Date.now()}-${Math.random()}`, host: "crm.teste" }),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { cadastrarEmpresa } from "@/app/cadastro/actions"
import { cancelarConvite, listarConvites } from "@/app/(auth)/plataforma/convites/actions"
import { conviteParaCadastro, hashDoCodigo } from "@/lib/convites"
import { apagarConvitesDeTeste, conviteDeTeste } from "./convite-de-teste"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anonimo = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const SENHA = "senha-b51-02-teste"
const emails: string[] = []
const emailPlataforma = `b51-02-plataforma-${ts}@teste.com`
let plataformaId = ""
let plataforma: SupabaseClient

function dados(sufixo: string, convite?: string, extra: Record<string, unknown> = {}) {
  const email = `b51-02-${sufixo}-${ts}@teste.com`
  emails.push(email)
  return {
    nomeEmpresa: `[TESTE] B51-02 ${sufixo} ${ts}`,
    nomeResponsavel: "Pessoa Convidada",
    email,
    senha: SENHA,
    confirmarSenha: SENHA,
    conferencia: "XXXX.DUMMY.TOKEN.XXXX",
    ...(convite !== undefined ? { convite } : {}),
    ...extra,
  }
}

async function empresas(nome: string) {
  return (await service.from("workspaces").select("id", { count: "exact", head: true }).eq("name", nome)).count ?? 0
}
async function usuarioExiste(email: string) {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  return data.users.some((u) => u.email === email)
}
async function convite(codigo: string) {
  return (await service.from("convites").select("usado_em, workspace_id, cancelado_em").eq("token_hash", hashDoCodigo(codigo)).single()).data!
}

beforeAll(async () => {
  vi.mocked(createSsrClient).mockImplementation(async () => anonimo() as never)
  await service.from("plataforma_admins").insert({ email: emailPlataforma })
  const { data } = await service.auth.admin.createUser({ email: emailPlataforma, password: SENHA, email_confirm: true })
  plataformaId = data.user!.id
  plataforma = anonimo()
  await plataforma.auth.signInWithPassword({ email: emailPlataforma, password: SENHA })
}, 60_000)

afterAll(async () => {
  await apagarConvitesDeTeste(service)
  await service.from("convites").delete().eq("criado_por", plataformaId)
  await service.from("plataforma_admins").delete().eq("email", emailPlataforma)
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data.users.filter((u) => emails.includes(u.email ?? ""))) {
    const { data: perfil } = await service.from("profiles").select("workspace_id").eq("id", u.id).maybeSingle()
    if (perfil) {
      await service.from("teams").delete().eq("workspace_id", perfil.workspace_id)
      await service.from("profiles").delete().eq("id", u.id)
      await service.from("workspaces").delete().eq("id", perfil.workspace_id)
    }
    await service.auth.admin.deleteUser(u.id)
  }
  if (plataformaId) await service.auth.admin.deleteUser(plataformaId)
}, 90_000)

describe("B51-02 — Cadastro só com convite", { timeout: 60_000 }, () => {
  it("CA-B51-02: should não valer o convite vencido, usado, cancelado ou inventado", async () => {
    const vencido = await conviteDeTeste(service, { expira_em: new Date(Date.now() - 1000).toISOString() })
    const usado = await conviteDeTeste(service, { usado_em: new Date().toISOString() })
    const cancelado = await conviteDeTeste(service, { cancelado_em: new Date().toISOString() })
    const valido = await conviteDeTeste(service, { email: "ana@exemplo.com" })

    for (const codigo of [vencido, usado, cancelado, "codigo-que-nao-existe", "", undefined]) {
      expect(await conviteParaCadastro(codigo)).toBeNull()
    }
    expect(await conviteParaCadastro(valido)).toEqual({ email: "ana@exemplo.com" })
  })

  it("CA-B51-04: should recusar e-mail diferente do convite, sem criar nada e com o convite ainda valendo", async () => {
    const codigo = await conviteDeTeste(service, { email: `b51-02-certo-${ts}@teste.com` })
    const d = dados("errado", codigo)
    expect(await cadastrarEmpresa(d)).toEqual({ erro: "convite_invalido" })

    expect(await empresas(d.nomeEmpresa)).toBe(0)
    expect(await usuarioExiste(d.email)).toBe(false)
    expect(await convite(codigo)).toMatchObject({ usado_em: null })
    expect(await conviteParaCadastro(codigo)).not.toBeNull()
  })

  it("CA-B51-05: should criar empresa e Admin pelo link avulso, e marcar o convite como usado por ela", async () => {
    const codigo = await conviteDeTeste(service)
    const d = dados("avulso", codigo, { email: `B51-02-Avulso-${ts}@Teste.com` })
    emails.push(d.email.toLowerCase())
    expect(await cadastrarEmpresa(d)).toEqual({ ok: true })

    const { data: empresa } = await service.from("workspaces").select("id, dono_id").eq("name", d.nomeEmpresa).single()
    const { data: perfil } = await service.from("profiles").select("role, name").eq("id", empresa!.dono_id).single()
    expect(perfil).toEqual({ role: "admin", name: "Pessoa Convidada" })
    const usado = await convite(codigo)
    expect(usado.usado_em).not.toBeNull()
    expect(usado.workspace_id).toBe(empresa!.id)
  })

  it("CA-B51-06: should recusar o segundo cadastro com o mesmo convite, sem criar conta", async () => {
    const codigo = await conviteDeTeste(service)
    expect(await cadastrarEmpresa(dados("primeiro", codigo))).toEqual({ ok: true })

    const segundo = dados("segundo", codigo)
    expect(await cadastrarEmpresa(segundo)).toEqual({ erro: "convite_invalido" })
    expect(await usuarioExiste(segundo.email)).toBe(false)
    expect(await empresas(segundo.nomeEmpresa)).toBe(0)
  })

  it("CA-B51-07: should deixar só um de dois cadastros simultâneos criar empresa, sem usuário solto no Auth", async () => {
    const codigo = await conviteDeTeste(service)
    const a = dados("corrida-a", codigo)
    const b = dados("corrida-b", codigo)
    const resultados = await Promise.all([cadastrarEmpresa(a), cadastrarEmpresa(b)])

    expect(resultados.filter((r) => "ok" in r)).toHaveLength(1)
    expect(resultados.filter((r) => "erro" in r)).toEqual([{ erro: "convite_invalido" }])
    expect((await empresas(a.nomeEmpresa)) + (await empresas(b.nomeEmpresa))).toBe(1)
    const perdedor = "ok" in resultados[0] ? b : a
    expect(await usuarioExiste(perdedor.email)).toBe(false)
  })

  it("CA-B51-08: should recusar no servidor o cadastro sem convite ou com convite inventado", async () => {
    for (const d of [dados("sem-convite"), dados("inventado", "nao-existe-este-convite"), dados("tipo-errado", undefined, { convite: 123 })]) {
      expect(await cadastrarEmpresa(d)).toEqual({ erro: "convite_invalido" })
      expect(await empresas(d.nomeEmpresa)).toBe(0)
      expect(await usuarioExiste(d.email)).toBe(false)
    }
  })

  it("CA-B51-09: should avisar o e-mail em uso sem gastar o convite", async () => {
    const d = dados("em-uso", await conviteDeTeste(service))
    expect(await cadastrarEmpresa(d)).toEqual({ ok: true })

    const codigo = await conviteDeTeste(service)
    expect(await cadastrarEmpresa({ ...d, nomeEmpresa: `[TESTE] B51-02 outra ${ts}`, convite: codigo })).toEqual({ erro: "email_em_uso" })
    expect(await convite(codigo)).toMatchObject({ usado_em: null })
    expect(await conviteParaCadastro(codigo)).not.toBeNull()
  })

  it("CA-B51-10: should recusar sem conferência e depois do limite por hora, como hoje, sem gastar o convite", async () => {
    const codigo = await conviteDeTeste(service)
    expect(await cadastrarEmpresa(dados("sem-conferencia", codigo, { conferencia: undefined }))).toEqual({ erro: "conferencia" })

    ipDaVez = `b51-02-limite-${ts}`
    try {
      for (let i = 0; i < 5; i++) expect(await cadastrarEmpresa(dados(`robo-${i}`, "inventado"))).toEqual({ erro: "convite_invalido" })
      const d = dados("depois-do-limite", codigo)
      expect(await cadastrarEmpresa(d)).toEqual({ erro: "limite" })
      expect(await empresas(d.nomeEmpresa)).toBe(0)
    } finally {
      ipDaVez = null
    }
    expect(await convite(codigo)).toMatchObject({ usado_em: null })
    expect(await conviteParaCadastro(codigo)).not.toBeNull()
  })

  it("CA-B51-19: should mostrar cancelado na lista e o link deixar de valer depois de cancelar", async () => {
    const codigo = await conviteDeTeste(service, { criado_por: plataformaId })
    const { data } = await service.from("convites").select("id").eq("token_hash", hashDoCodigo(codigo)).single()

    vi.mocked(createSsrClient).mockResolvedValue(plataforma as never)
    try {
      expect(await cancelarConvite(data!.id)).toEqual({})
      expect((await listarConvites()).find((c) => c.id === data!.id)?.situacao).toBe("cancelado")
    } finally {
      vi.mocked(createSsrClient).mockImplementation(async () => anonimo() as never)
    }

    expect(await conviteParaCadastro(codigo)).toBeNull()
    const d = dados("cancelado", codigo)
    expect(await cadastrarEmpresa(d)).toEqual({ erro: "convite_invalido" })
    expect(await usuarioExiste(d.email)).toBe(false)
  })
})
