// @vitest-environment node
// B51-03 — Convite por e-mail. Bate no banco de teste; a chamada ao Resend é
// interceptada (nenhum e-mail de verdade sai) e o resto do fetch passa.

import { createHash } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "crm.teste", "x-forwarded-proto": "https" }),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarConvite, gerarLinkNovo } from "@/app/(auth)/plataforma/convites/actions"
import { conviteParaCadastro } from "@/lib/convites"
import { ASSUNTO_DO_CONVITE, REMETENTE_DO_CONVITE } from "@/lib/email-do-convite"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-b51-03-teste"
const emailPlataforma = `b51-03-plataforma-${ts}@teste.com`
const emailComConta = `b51-03-com-conta-${ts}@teste.com`
const usuarios: string[] = []
let plataformaId = ""
let plataforma: SupabaseClient

type Envio = { autorizacao: string | null; corpo: { from: string; to: string[]; subject: string; html: string; text: string } }
let envios: Envio[] = []

/** Intercepta o Resend: `aceita` decide a resposta; Supabase e o resto passam. */
function resend(aceita: boolean) {
  const original = globalThis.fetch
  envios = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada, init) => {
    if (String(entrada).startsWith("https://api.resend.com/")) {
      envios.push({ autorizacao: new Headers(init?.headers).get("authorization"), corpo: JSON.parse(String(init?.body)) })
      return aceita
        ? new Response(JSON.stringify({ id: "email-de-teste" }), { status: 200 })
        : new Response(JSON.stringify({ message: "fora do ar" }), { status: 500 })
    }
    return original(entrada, init)
  })
}

const hash = (codigo: string) => createHash("sha256").update(codigo).digest("hex")
const codigoDo = (link: string) => new globalThis.URL(link).searchParams.get("convite")!
const doUsuario = () => service.from("convites").select("id, email, expira_em, token_hash").eq("criado_por", plataformaId)

beforeAll(async () => {
  await service.from("plataforma_admins").insert({ email: emailPlataforma })
  const { data } = await service.auth.admin.createUser({ email: emailPlataforma, password: SENHA, email_confirm: true })
  plataformaId = data.user!.id
  usuarios.push(plataformaId)
  const { data: outro } = await service.auth.admin.createUser({ email: emailComConta, password: SENHA, email_confirm: true })
  usuarios.push(outro.user!.id)
  plataforma = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await plataforma.auth.signInWithPassword({ email: emailPlataforma, password: SENHA })
  vi.mocked(createSsrClient).mockResolvedValue(plataforma as never)
}, 60_000)

afterEach(async () => {
  vi.restoreAllMocks()
  vi.mocked(createSsrClient).mockResolvedValue(plataforma as never)
  await service.from("convites").delete().eq("criado_por", plataformaId)
})

afterAll(async () => {
  await service.from("plataforma_admins").delete().eq("email", emailPlataforma)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
}, 60_000)

describe("B51-03 — Convite por e-mail", { timeout: 30_000 }, () => {
  it("CA-B51-13: should mandar o e-mail com o link e deixar o convite pendente, para o e-mail e por 7 dias", async () => {
    resend(true)
    const res = await criarConvite({ email: "  Ana.B51@Exemplo.com ", validade: { dias: 7 } })
    if (!("link" in res)) throw new Error(res.erro)
    expect(res.emailEnviado).toBe(true)

    expect(envios).toHaveLength(1)
    const { autorizacao, corpo } = envios[0]
    expect(autorizacao).toBe("Bearer re_teste_nao_envia")
    expect(corpo.from).toBe(REMETENTE_DO_CONVITE)
    expect(corpo.from).toBe("crmatacado exp <convite@disparos.atacadoexponencial.com>")
    expect(corpo.to).toEqual(["ana.b51@exemplo.com"])
    expect(corpo.subject).toBe(ASSUNTO_DO_CONVITE)
    expect(corpo.html).toContain(`href="${res.link}"`)
    expect(corpo.text).toContain(res.link)

    const { data } = await doUsuario()
    expect(data).toHaveLength(1)
    expect(data![0].email).toBe("ana.b51@exemplo.com")
    expect(data![0].token_hash).toBe(hash(codigoDo(res.link)))
    const dias = (new Date(data![0].expira_em).getTime() - Date.now()) / 86_400_000
    expect(dias).toBeGreaterThan(6.99)
    expect(dias).toBeLessThanOrEqual(7)
    expect(await conviteParaCadastro(codigoDo(res.link))).toEqual({ email: "ana.b51@exemplo.com" })
  })

  it("CA-B51-17: should recusar e-mail que já tem conta, sem gravar convite nem mandar e-mail", async () => {
    resend(true)
    expect(await criarConvite({ email: emailComConta.toUpperCase(), validade: { dias: 7 } })).toEqual({ erro: "Este e-mail já tem conta no CRM." })
    expect(await criarConvite({ email: "nao-e-email", validade: { dias: 7 } })).toEqual({ erro: "Digite um e-mail válido ou deixe em branco." })
    expect(envios).toEqual([])
    expect((await doUsuario()).data).toEqual([])
  })

  it("CA-B51-18: should criar o convite e avisar que o e-mail não saiu quando o Resend falha", async () => {
    resend(false)
    const res = await criarConvite({ email: `b51-03-falha-${ts}@exemplo.com`, validade: { dias: 1 } })
    if (!("link" in res)) throw new Error(res.erro)
    expect(res.emailEnviado).toBe(false)
    expect(envios).toHaveLength(1)
    expect((await doUsuario()).data).toHaveLength(1)
    expect(await conviteParaCadastro(codigoDo(res.link))).not.toBeNull()
  })

  it("CA-B51-20: should trocar o link, manter a validade e mandar o e-mail de novo com o link novo", async () => {
    resend(true)
    const criado = await criarConvite({ email: `b51-03-reenvio-${ts}@exemplo.com`, validade: { dias: 30 } })
    if (!("link" in criado)) throw new Error(criado.erro)
    const { data: antes } = await doUsuario()

    const novo = await gerarLinkNovo(antes![0].id)
    if (!("link" in novo)) throw new Error(novo.erro)
    expect(novo.emailEnviado).toBe(true)
    expect(novo.link).not.toBe(criado.link)

    expect(await conviteParaCadastro(codigoDo(criado.link))).toBeNull()
    expect(await conviteParaCadastro(codigoDo(novo.link))).toEqual({ email: `b51-03-reenvio-${ts}@exemplo.com` })
    const { data: depois } = await doUsuario()
    expect(depois![0].expira_em).toBe(antes![0].expira_em)

    expect(envios).toHaveLength(2)
    expect(envios[1].corpo.to).toEqual([`b51-03-reenvio-${ts}@exemplo.com`])
    expect(envios[1].corpo.html).toContain(`href="${novo.link}"`)
    expect(envios[1].corpo.html).not.toContain(criado.link)
  })
})
