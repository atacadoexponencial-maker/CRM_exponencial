// @vitest-environment node
// B50-02 — CAPTCHA (Cloudflare Turnstile) no cadastro e no pedido da loja. No banco de
// teste, com as chaves de teste públicas da Cloudflare: "1x…AA" aceita a conferência de
// teste, "2x…AA" recusa qualquer uma. A chamada à Cloudflare é de verdade; só no
// cenário "fora do ar" ela é derrubada.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

// Cada chamada vem de um endereço próprio, para o freio por endereço (B20-05, B21-07) não pesar
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `teste-b50-${Date.now()}-${Math.random()}` }),
}))
vi.mock("@/integrations/supabase/server", async () => {
  const { createClient } = await import("@supabase/supabase-js")
  return {
    createClient: async () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
  }
})

import { cadastrarEmpresa } from "@/app/cadastro/actions"
import { fazerPedido } from "@/app/loja/[endereco]/actions"
import { AVISO_CONFERENCIA_HUMANA } from "@/lib/conferencia-humana"

const ACEITA = "1x0000000000000000000000000000000AA"
const RECUSA = "2x0000000000000000000000000000000AA"
const CONFERENCIA_DE_TESTE = "XXXX.DUMMY.TOKEN.XXXX"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const slug = `loja-b50-${ts}`
let ws = "", camisa = ""
const emails: string[] = []

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `Loja B50 ${ts}` }).select("id").single()).data!.id
  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: "5511900000000", published: true })
  camisa = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 20 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: camisa, combination: "", quantity: 100 })
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

afterAll(async () => {
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("catalog_stock").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("workspaces").delete().eq("id", ws)
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
}, 60_000)

function cadastro(sufixo: string, conferencia?: string) {
  const email = `b50-02-${sufixo}-${ts}@teste.com`
  emails.push(email)
  return {
    email,
    nomeEmpresa: `Empresa B50 ${sufixo} ${ts}`,
    dados: { nomeEmpresa: `Empresa B50 ${sufixo} ${ts}`, nomeResponsavel: "Pessoa", email, senha: SENHA, confirmarSenha: SENHA, ...(conferencia !== undefined ? { conferencia } : {}) },
  }
}

async function empresaExiste(nome: string) {
  return ((await service.from("workspaces").select("id", { count: "exact", head: true }).eq("name", nome)).count ?? 0) > 0
}
async function usuarioExiste(email: string) {
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  return data.users.some((u) => u.email === email)
}

const pedir = (whatsapp: string, conferencia?: string | null) =>
  fazerPedido(slug, { nome: "Cliente", whatsapp }, [{ produtoId: camisa, combinacao: "", quantidade: 1 }], conferencia)

async function pedidosEContatos() {
  const [{ count: pedidos }, { count: contatos }] = await Promise.all([
    service.from("catalog_orders").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
    service.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", ws),
  ])
  return { pedidos: pedidos ?? 0, contatos: contatos ?? 0 }
}

/** A Cloudflare fora do ar: o pedido de conferência cai na rede; o resto passa. */
function cloudflareForaDoAr() {
  const original = globalThis.fetch
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada, init) => {
    if (String(entrada).includes("challenges.cloudflare.com")) throw new TypeError("fetch failed")
    return original(entrada, init)
  })
}

describe("B50-02 — CAPTCHA no cadastro e na loja", { timeout: 60_000 }, () => {
  it("CA-B50-08: should recusar o cadastro sem conferência ou com conferência recusada, sem criar empresa nem usuário", async () => {
    const sem = cadastro("sem")
    expect(await cadastrarEmpresa(sem.dados)).toEqual({ erro: "conferencia" })

    vi.stubEnv("TURNSTILE_SECRET_KEY", RECUSA)
    const recusada = cadastro("recusada", CONFERENCIA_DE_TESTE)
    expect(await cadastrarEmpresa(recusada.dados)).toEqual({ erro: "conferencia" })

    for (const c of [sem, recusada]) {
      expect(await empresaExiste(c.nomeEmpresa)).toBe(false)
      expect(await usuarioExiste(c.email)).toBe(false)
    }
  })

  it("CA-B50-09: should recusar o pedido da loja sem conferência ou com conferência recusada, sem criar pedido nem contato", async () => {
    const antes = await pedidosEContatos()

    expect(await pedir("(21) 98888-0001", null)).toEqual({ ok: false, erro: AVISO_CONFERENCIA_HUMANA })
    vi.stubEnv("TURNSTILE_SECRET_KEY", RECUSA)
    expect(await pedir("(21) 98888-0002", CONFERENCIA_DE_TESTE)).toEqual({ ok: false, erro: AVISO_CONFERENCIA_HUMANA })

    expect(await pedidosEContatos()).toEqual(antes)
  })

  it("CA-B50-10: should aceitar o cadastro e o pedido com a conferência aceita, como antes", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", ACEITA)
    const ok = cadastro("ok", CONFERENCIA_DE_TESTE)
    expect(await cadastrarEmpresa(ok.dados)).toEqual({ ok: true })
    expect(await empresaExiste(ok.nomeEmpresa)).toBe(true)
    const { data: times } = await service.from("teams").select("name").eq("workspace_id", (await service.from("workspaces").select("id").eq("name", ok.nomeEmpresa).single()).data!.id)
    expect((times ?? []).map((t) => t.name).sort()).toEqual(["Entrada", "Recompra"])

    const antes = await pedidosEContatos()
    const r = await pedir("(21) 98888-0003", CONFERENCIA_DE_TESTE)
    expect(r.ok).toBe(true)
    expect(await pedidosEContatos()).toEqual({ pedidos: antes.pedidos + 1, contatos: antes.contatos + 1 })
  })

  it("CA-B50-12: should aceitar o cadastro e o pedido quando a Cloudflare não responde, e recusar quando ela responde", async () => {
    cloudflareForaDoAr()
    const semConferencia = cadastro("fora-do-ar")
    expect(await cadastrarEmpresa(semConferencia.dados)).toEqual({ ok: true })
    expect(await empresaExiste(semConferencia.nomeEmpresa)).toBe(true)
    const antes = await pedidosEContatos()
    expect((await pedir("(21) 98888-0004", null)).ok).toBe(true)
    expect((await pedidosEContatos()).pedidos).toBe(antes.pedidos + 1)

    // Com a Cloudflare de volta, a mesma falta de conferência é recusada
    vi.restoreAllMocks()
    expect(await pedir("(21) 98888-0005", null)).toEqual({ ok: false, erro: AVISO_CONFERENCIA_HUMANA })
  })
})
