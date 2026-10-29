// @vitest-environment node
// B51-01 — Tela de convites da plataforma. Bate no banco de teste.
// Mockados só o cliente SSR (para logar como cada pessoa) e os cabeçalhos do pedido.

import { createHash } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "crm.teste", "x-forwarded-proto": "https" }),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { cancelarConvite, criarConvite, gerarLinkNovo, listarConvites } from "@/app/(auth)/plataforma/convites/actions"
import ConvitesPage from "@/app/(auth)/plataforma/convites/page"
import { ehDaPlataforma } from "@/lib/plataforma"
import { AVISO_VALIDADE } from "@/lib/convites"
import { instanteNoFuso } from "@/lib/datas"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-b51-01-teste"
const emailPlataforma = `b51-01-plataforma-${ts}@teste.com`
const emailAdmin = `b51-01-admin-${ts}@teste.com`
const nomeEmpresaUsada = `[TESTE] B51-01 empresa do convite ${ts}`

let workspaceId = ""
let empresaUsadaId = ""
const usuarios: Record<"plataforma" | "admin", string> = { plataforma: "", admin: "" }
const clientes: Partial<Record<"plataforma" | "admin", SupabaseClient>> = {}

async function criarUsuario(email: string, papel: "plataforma" | "admin") {
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  usuarios[papel] = data.user!.id
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: workspaceId, name: `B51-01 ${papel}`, role: "admin", status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[papel] = c
}

function logarComo(papel: "plataforma" | "admin" | "visitante") {
  const c = papel === "visitante" ? createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } }) : clientes[papel]!
  mockSsr.mockResolvedValue(c as never)
}

const conviteIds = () => service.from("convites").select("id, token_hash, expira_em, cancelado_em").in("criado_por", Object.values(usuarios))

async function codigoDoLink(link: string) {
  const url = new globalThis.URL(link)
  expect(url.origin + url.pathname).toBe("https://crm.teste/cadastro")
  return url.searchParams.get("convite")!
}

beforeAll(async () => {
  workspaceId = (await service.from("workspaces").insert({ name: `[TESTE] B51-01 ${ts}` }).select("id").single()).data!.id
  empresaUsadaId = (await service.from("workspaces").insert({ name: nomeEmpresaUsada }).select("id").single()).data!.id
  await service.from("plataforma_admins").insert({ email: emailPlataforma })
  await criarUsuario(emailPlataforma, "plataforma")
  await criarUsuario(emailAdmin, "admin")
}, 60_000)

afterAll(async () => {
  await service.from("convites").delete().in("criado_por", Object.values(usuarios))
  await service.from("plataforma_admins").delete().eq("email", emailPlataforma)
  await service.from("profiles").delete().eq("workspace_id", workspaceId)
  for (const id of Object.values(usuarios)) if (id) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [workspaceId, empresaUsadaId])
}, 60_000)

describe("B51-01 — Tela de convites da plataforma", { timeout: 30_000 }, () => {
  it("CA-B51-11: should abrir a tela para a plataforma, dar página não encontrada ao Admin e mandar o visitante ao login", async () => {
    logarComo("plataforma")
    await expect(ConvitesPage()).resolves.toBeTruthy()

    logarComo("admin")
    await expect(ConvitesPage()).rejects.toMatchObject({ digest: expect.stringContaining("404") })

    logarComo("visitante")
    await expect(ConvitesPage()).rejects.toMatchObject({ digest: expect.stringContaining("/login") })
  })

  it("CA-B51-23: should reconhecer só o e-mail da lista da plataforma", async () => {
    expect(await ehDaPlataforma(emailPlataforma)).toBe(true)
    expect(await ehDaPlataforma(emailPlataforma.toUpperCase())).toBe(true)
    expect(await ehDaPlataforma(emailAdmin)).toBe(false)
    expect(await ehDaPlataforma(null)).toBe(false)
  })

  it("CA-B51-12: should recusar o Admin de empresa em criar, gerar link novo e cancelar, sem mudar o banco", async () => {
    logarComo("plataforma")
    const criado = await criarConvite({ validade: { dias: 7 } })
    expect("link" in criado).toBe(true)
    const { data: antes } = await conviteIds()
    expect(antes).toHaveLength(1)

    logarComo("admin")
    expect(await criarConvite({ validade: { dias: 7 } })).toEqual({ erro: "Sem permissão" })
    expect(await gerarLinkNovo(antes![0].id)).toEqual({ erro: "Sem permissão" })
    expect(await cancelarConvite(antes![0].id)).toEqual({ erro: "Sem permissão" })
    expect(await listarConvites()).toEqual([])

    const { data: depois } = await conviteIds()
    expect(depois).toEqual(antes)
    await service.from("convites").delete().eq("id", antes![0].id)
  })

  it("CA-B51-14: should criar link avulso pendente, guardando só o hash do código", async () => {
    logarComo("plataforma")
    const res = await criarConvite({ validade: { dias: 7 } })
    if (!("link" in res)) throw new Error(res.erro)
    const codigo = await codigoDoLink(res.link)
    expect(codigo.length).toBeGreaterThanOrEqual(40)

    const { data } = await service.from("convites").select("*").eq("token_hash", createHash("sha256").update(codigo).digest("hex")).single()
    expect(data.email).toBeNull()
    expect(JSON.stringify(data)).not.toContain(codigo)
    const dias = (new Date(data.expira_em).getTime() - Date.now()) / 86_400_000
    expect(dias).toBeGreaterThan(6.99)
    expect(dias).toBeLessThanOrEqual(7)

    const linha = (await listarConvites()).find((c) => c.id === data.id)
    expect(linha).toMatchObject({ email: null, situacao: "pendente", criadoPor: "B51-01 plataforma", empresa: null })
    await service.from("convites").delete().eq("id", data.id)
  })

  it("CA-B51-15: should valer até a data e hora escolhidas e aparecer vencido depois dela", async () => {
    logarComo("plataforma")
    const daqui10 = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    const res = await criarConvite({ validade: { dia: daqui10, hora: "18:30" } })
    if (!("link" in res)) throw new Error(res.erro)
    const hash = createHash("sha256").update(await codigoDoLink(res.link)).digest("hex")

    const { data } = await service.from("convites").select("id, expira_em").eq("token_hash", hash).single()
    // A empresa de teste está no fuso padrão, Brasília
    expect(new Date(data!.expira_em).getTime()).toBe(instanteNoFuso(daqui10, "18:30", "America/Sao_Paulo").getTime())
    expect((await listarConvites()).find((c) => c.id === data!.id)?.situacao).toBe("pendente")

    await service.from("convites").update({ expira_em: new Date(Date.now() - 60_000).toISOString() }).eq("id", data!.id)
    expect((await listarConvites()).find((c) => c.id === data!.id)?.situacao).toBe("vencido")
    await service.from("convites").delete().eq("id", data!.id)
  })

  it("CA-B51-16: should recusar validade no passado, além de 90 dias ou fora das opções, sem criar convite", async () => {
    logarComo("plataforma")
    const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const daqui91 = new Date(Date.now() + 91 * 86_400_000).toISOString().slice(0, 10)

    expect(await criarConvite({ validade: { dia: ontem, hora: "12:00" } })).toEqual({ erro: AVISO_VALIDADE })
    expect(await criarConvite({ validade: { dia: daqui91, hora: "12:00" } })).toEqual({ erro: AVISO_VALIDADE })
    expect(await criarConvite({ validade: { dias: 45 } })).toEqual({ erro: AVISO_VALIDADE })
    expect(await criarConvite({ validade: { dia: "amanhã", hora: "12:00" } })).toEqual({ erro: AVISO_VALIDADE })

    const { data } = await conviteIds()
    expect(data).toEqual([])
  })

  it("CA-B51-21: should listar pendente, usado com a empresa, vencido e cancelado", async () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString()
    const base = { criado_por: usuarios.plataforma, expira_em: futuro }
    const { data: criados } = await service
      .from("convites")
      .insert([
        { ...base, token_hash: `b51-01-pendente-${ts}`, email: "pendente@exemplo.com" },
        { ...base, token_hash: `b51-01-usado-${ts}`, usado_em: new Date().toISOString(), workspace_id: empresaUsadaId },
        { ...base, token_hash: `b51-01-vencido-${ts}`, expira_em: new Date(Date.now() - 1000).toISOString() },
        { ...base, token_hash: `b51-01-cancelado-${ts}`, cancelado_em: new Date().toISOString() },
      ])
      .select("id, token_hash")
    expect(criados).toHaveLength(4)

    logarComo("plataforma")
    const lista = await listarConvites()
    const por = (sufixo: string) => lista.find((c) => c.id === criados!.find((x) => x.token_hash.includes(sufixo))!.id)
    expect(por("pendente")).toMatchObject({ situacao: "pendente", email: "pendente@exemplo.com", empresa: null })
    expect(por("usado")).toMatchObject({ situacao: "usado", empresa: nomeEmpresaUsada })
    expect(por("vencido")).toMatchObject({ situacao: "vencido" })
    expect(por("cancelado")).toMatchObject({ situacao: "cancelado" })

    // Só o pendente aceita cancelar e gerar link novo
    expect(await cancelarConvite(por("usado")!.id)).toEqual({ erro: "Este convite não está mais pendente." })
    expect(await gerarLinkNovo(por("cancelado")!.id)).toEqual({ erro: "Este convite não está mais pendente." })
    expect(await cancelarConvite(por("pendente")!.id)).toEqual({})
    expect((await listarConvites()).find((c) => c.id === por("pendente")!.id)?.situacao).toBe("cancelado")

    await service.from("convites").delete().in("id", criados!.map((c) => c.id))
  })
})
