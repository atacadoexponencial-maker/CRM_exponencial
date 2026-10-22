// @vitest-environment node
// B36-01 — o tema mora no perfil e chega ao cookie no login e na troca.
// Bate no Supabase real. O client SSR é trocado pelo "navegador" da vez e os cookies
// do Next por um pote em memória, para conferir o que a action grava.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const IP_DO_TESTE = `teste-b36-${Date.now()}-${Math.random()}`
const pote = new Map<string, string>()
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": IP_DO_TESTE }),
  cookies: async () => ({
    get: (nome: string) => (pote.has(nome) ? { value: pote.get(nome) } : undefined),
    set: (nome: string, valor: string) => { pote.set(nome, valor) },
    delete: (nome: string) => { pote.delete(nome) },
  }),
}))

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import { realizarLogin } from "@/app/login/actions"
import { trocarTema } from "@/app/(auth)/perfil/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const novoCliente = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const SENHA = "senha-segura-123"
const emailAna = `b36-01-ana-${ts}@teste.com`
const emailCaio = `b36-01-caio-${ts}@teste.com`
let empresa = "", ana = "", caio = ""

/** O login termina com o redirect do Next, que chega aqui como erro. */
async function entrar(email: string) {
  clienteDaVez = novoCliente()
  await realizarLogin(email, SENHA).catch((erro: { digest?: string }) => {
    if (!String(erro?.digest ?? "").startsWith("NEXT_REDIRECT")) throw erro
  })
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Tema B36 ${ts}` }).select("id").single()).data!.id
  ana = (await service.auth.admin.createUser({ email: emailAna, password: SENHA, email_confirm: true })).data.user!.id
  caio = (await service.auth.admin.createUser({ email: emailCaio, password: SENHA, email_confirm: true })).data.user!.id
  // Um insert por perfil: o do Caio fica sem tema, para valer o padrão do banco.
  await service.from("profiles").insert({ id: ana, workspace_id: empresa, name: "Ana", role: "atendente", tema: "escuro" })
  await service.from("profiles").insert({ id: caio, workspace_id: empresa, name: "Caio", role: "atendente" })
}, 60_000)

afterAll(async () => {
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of [ana, caio]) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B36-01 — Tema no perfil e no cookie", { timeout: 40_000 }, () => {
  it("CA-B36-03: should trazer o escuro para outro navegador quando a pessoa entra", async () => {
    pote.clear()
    await entrar(emailAna)
    expect(pote.get("tema")).toBe("escuro")
  })

  it("CA-B36-05: should mostrar a cada usuário o próprio tema no mesmo navegador", async () => {
    pote.clear()
    await entrar(emailAna)
    expect(pote.get("tema")).toBe("escuro")
    await entrar(emailCaio)
    expect(pote.get("tema")).toBe("claro")
  })

  it("CA-B36-02: should gravar no perfil e no cookie o tema escolhido", async () => {
    pote.clear()
    clienteDaVez = novoCliente()
    await clienteDaVez.auth.signInWithPassword({ email: emailCaio, password: SENHA })
    expect(await trocarTema("escuro")).toEqual({})
    const { data } = await service.from("profiles").select("tema").eq("id", caio).single()
    expect(data!.tema).toBe("escuro")
    expect(pote.get("tema")).toBe("escuro")
  })
})
