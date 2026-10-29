// @vitest-environment node
// B52-01 — Pedir o link de senha nova. Bate no banco de teste; a chamada ao Resend é
// interceptada (nenhum e-mail de verdade sai) e o resto do fetch passa (a Cloudflare
// responde com as chaves de teste dela).

import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest"

let ipDaVez: string | null = null
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-forwarded-for": ipDaVez ?? `teste-${Date.now()}-${Math.random()}`, host: "crm.teste", "x-forwarded-proto": "https" }),
}))

import { pedirLinkDeSenhaNova } from "@/app/esqueci-minha-senha/actions"
import { ASSUNTO_DA_SENHA_NOVA } from "@/lib/email-de-senha-nova"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const CONFERENCIA = "XXXX.DUMMY.TOKEN.XXXX"
// Chave secreta de teste da Cloudflare que sempre recusa
const RECUSA = "2x0000000000000000000000000000000AA"
const emailAtivo = `b52-01-ativa-${ts}@teste.com`
const emailDesativado = `b52-01-desativada-${ts}@teste.com`
let workspaceId = ""
let ativoId = ""
let desativadoId = ""

let envios: { from: string; to: string[]; subject: string; html: string; text: string }[] = []
const original = globalThis.fetch

const pedir = (email: string, extra: Record<string, unknown> = {}) => pedirLinkDeSenhaNova({ email, conferencia: CONFERENCIA, ...extra })
const links = (userId: string) =>
  service.from("redefinicoes_de_senha").select("token_hash, expira_em, usado_em, cancelado_em").eq("user_id", userId).order("criado_em")
const hash = (codigo: string) => createHash("sha256").update(codigo).digest("hex")
const codigoDoEnvio = (i: number) => envios[i].text.match(/redefinir-senha\?codigo=([\w-]+)/)![1]

async function criarConta(email: string, status: "active" | "inactive") {
  const { data } = await service.auth.admin.createUser({ email, password: "senha-b52-01-teste", email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: workspaceId, name: email, role: "atendente", status })
  return data.user!.id
}

beforeAll(async () => {
  workspaceId = (await service.from("workspaces").insert({ name: `[TESTE] B52-01 ${ts}` }).select("id").single()).data!.id
  ativoId = await criarConta(emailAtivo, "active")
  desativadoId = await criarConta(emailDesativado, "inactive")
  await service.auth.admin.updateUserById(desativadoId, { ban_duration: "876000h" })
}, 60_000)

beforeEach(() => {
  envios = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada, init) => {
    if (String(entrada).startsWith("https://api.resend.com/")) {
      envios.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ id: "email-de-teste" }), { status: 200 })
    }
    return original(entrada, init)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  ipDaVez = null
})

afterAll(async () => {
  await service.from("profiles").delete().eq("workspace_id", workspaceId)
  for (const id of [ativoId, desativadoId]) if (id) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", workspaceId)
}, 60_000)

describe("B52-01 — Pedir o link de senha nova", { timeout: 60_000 }, () => {
  it("CA-B52-02: should mandar à conta ativa o link de 1 hora, guardando só o hash", async () => {
    expect(await pedir(`  ${emailAtivo.toUpperCase()} `)).toEqual({ ok: true })

    expect(envios).toHaveLength(1)
    expect(envios[0].from).toBe("crmatacado exp <conta@disparos.atacadoexponencial.com>")
    expect(envios[0].to).toEqual([emailAtivo])
    expect(envios[0].subject).toBe(ASSUNTO_DA_SENHA_NOVA)
    expect(envios[0].text).toContain("1 hora")
    const codigo = codigoDoEnvio(0)
    expect(envios[0].html).toContain(`href="https://crm.teste/redefinir-senha?codigo=${codigo}"`)

    const { data } = await links(ativoId)
    const ultimo = data!.at(-1)!
    expect(ultimo.token_hash).toBe(hash(codigo))
    expect(JSON.stringify(data)).not.toContain(codigo)
    expect(ultimo).toMatchObject({ usado_em: null, cancelado_em: null })
    const minutos = (new Date(ultimo.expira_em).getTime() - Date.now()) / 60_000
    expect(minutos).toBeGreaterThan(59)
    expect(minutos).toBeLessThanOrEqual(60)
  })

  it("CA-B52-03: should responder igual ao e-mail sem conta, sem gravar nem mandar nada", async () => {
    // Só os links das contas deste arquivo: os outros testes gravam na mesma tabela em paralelo
    const deste = async () =>
      (await service.from("redefinicoes_de_senha").select("id", { count: "exact", head: true }).in("user_id", [ativoId, desativadoId])).count
    const ninguem = `b52-01-ninguem-${ts}@teste.com`
    const antes = await deste()
    expect(await pedir(ninguem)).toEqual({ ok: true })
    expect(envios).toEqual([])
    expect(await deste()).toBe(antes)
    expect((await service.rpc("conta_ativa_por_email", { p_email: ninguem })).data).toBeNull()
  })

  it("CA-B52-04: should responder igual à conta desativada, sem gravar nem mandar nada", async () => {
    expect(await pedir(emailDesativado)).toEqual({ ok: true })
    expect(envios).toEqual([])
    expect((await links(desativadoId)).data).toEqual([])
  })

  it("CA-B52-05: should derrubar o link anterior quando a conta pede outro", async () => {
    expect(await pedir(emailAtivo)).toEqual({ ok: true })
    expect(await pedir(emailAtivo)).toEqual({ ok: true })
    const [primeiro, segundo] = [codigoDoEnvio(0), codigoDoEnvio(1)]

    const { data } = await links(ativoId)
    const por = (codigo: string) => data!.find((l) => l.token_hash === hash(codigo))!
    expect(por(primeiro).cancelado_em).not.toBeNull()
    expect(por(segundo)).toMatchObject({ cancelado_em: null, usado_em: null })
    expect(data!.filter((l) => !l.cancelado_em && !l.usado_em)).toHaveLength(1)
  })

  it("CA-B52-06: should recusar o 4º pedido do mesmo e-mail e o 11º do mesmo endereço na hora, sem mandar", async () => {
    // Os testes acima já pediram 3 vezes para a conta ativa
    expect(await pedir(emailAtivo)).toEqual({ erro: "limite" })
    expect(envios).toEqual([])

    ipDaVez = `b52-01-ip-${ts}`
    for (let i = 0; i < 10; i++) expect(await pedir(`b52-01-robo-${i}-${ts}@teste.com`)).toEqual({ ok: true })
    expect(await pedir(`b52-01-robo-11-${ts}@teste.com`)).toEqual({ erro: "limite" })
    expect(envios).toEqual([])
  })

  it("CA-B52-07: should recusar o pedido sem conferência ou com ela recusada, sem gravar nem mandar", async () => {
    const outro = `b52-01-outra-${ts}@teste.com`
    const outroId = await criarConta(outro, "active")
    try {
      expect(await pedirLinkDeSenhaNova({ email: outro })).toEqual({ erro: "conferencia" })
      vi.stubEnv("TURNSTILE_SECRET_KEY", RECUSA)
      expect(await pedir(outro)).toEqual({ erro: "conferencia" })
      expect(envios).toEqual([])
      expect((await links(outroId)).data).toEqual([])
    } finally {
      await service.from("profiles").delete().eq("id", outroId)
      await service.auth.admin.deleteUser(outroId)
    }
  })
})
