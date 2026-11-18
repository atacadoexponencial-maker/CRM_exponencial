// @vitest-environment node
// B23-01 — Conectar um número que já está em uso no WhatsApp Business do celular.
// Bate no Supabase de teste: o client SSR é trocado pelo "navegador" do usuário da vez.
// A Meta é um fetch espião, no mesmo padrão de numero-meta-unico.integration.test.ts.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { completarConexaoWhatsApp, listarConexoesWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const ID_DO_NUMERO = `pn_b23_${ts}`
const WABA = `waba_b23_${ts}`
// Número do canal direto da empresa B, em dígitos; a Meta devolve o mesmo formatado.
const DIGITOS_DO_CANAL_DIRETO = `55119${String(ts).slice(-8)}`
const FORMATADO_DO_CANAL_DIRETO = `+55 11 ${DIGITOS_DO_CANAL_DIRETO.slice(4, 9)}-${DIGITOS_DO_CANAL_DIRETO.slice(9)}`

let empresaA = "", empresaB = ""
const usuarios: string[] = []
let admin: SupabaseClient, gerente: SupabaseClient, atendente: SupabaseClient

async function criarUsuario(empresa: string, nome: string, role: "admin" | "gerente" | "atendente") {
  const email = `b23-01-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return navegador
}

/** A Meta como fetch espião: só graph.facebook.com é interceptado; o Supabase segue real. */
function metaFalsa(numero: { display_phone_number: string; is_on_biz_app: boolean }) {
  const fetchDeVerdade = globalThis.fetch
  const chamadas: { url: string; method: string }[] = []
  vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
    const endereco = String(url)
    if (!endereco.includes("graph.facebook.com")) return fetchDeVerdade(url, init)
    chamadas.push({ url: endereco, method: init?.method ?? "GET" })
    const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 })
    if (endereco.includes("/oauth/access_token")) return ok({ access_token: `token-${ts}` })
    if (endereco.includes(`/${ID_DO_NUMERO}?fields=`)) return ok({ verified_name: "Loja no Celular", ...numero })
    if (endereco.endsWith("/register")) return ok({ success: true })
    if (endereco.includes("/subscribed_apps")) return ok({ success: true })
    return new Response("não esperado", { status: 500 })
  })
  return chamadas
}

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B23-01 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B23-01 B ${ts}` }).select("id").single()).data!.id
  admin = await criarUsuario(empresaA, "admin", "admin")
  gerente = await criarUsuario(empresaA, "gerente", "gerente")
  atendente = await criarUsuario(empresaA, "atendente", "atendente")
  // Empresa B tem esse número no canal direto.
  await service.from("whatsapp_connections").insert({
    workspace_id: empresaB, canal: "gateway", status: "connected", phone_number: DIGITOS_DO_CANAL_DIRETO,
    display_name: "Canal direto de B", instance_id: `inst-b23-${ts}`, instance_token: "token",
  })
}, 60_000)

afterEach(async () => {
  vi.unstubAllGlobals()
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresaA)
})

afterAll(async () => {
  await service.from("whatsapp_connections").delete().in("workspace_id", [empresaA, empresaB])
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

async function conexoesDeA() {
  return (await service.from("whatsapp_connections")
    .select("status, canal, phone_number_id, em_uso_no_celular, criar_cards_do_historico")
    .eq("workspace_id", empresaA)).data ?? []
}

describe("B23-01 — Conectar número em uso no WhatsApp Business do celular", { timeout: 30_000 }, () => {
  it("CA-B23-02: should gravar o número em uso no celular como conectado, com a escolha dos cards, sem registrar de novo na Meta", async () => {
    const chamadas = metaFalsa({ display_phone_number: "+55 11 98888-0001", is_on_biz_app: true })
    clienteDaVez = admin

    const resultado = await completarConexaoWhatsApp({
      code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA, criarCardsDoHistorico: true,
    })

    expect(resultado).toEqual({})
    expect(await conexoesDeA()).toEqual([{
      status: "connected", canal: "meta", phone_number_id: ID_DO_NUMERO,
      em_uso_no_celular: true, criar_cards_do_historico: true,
    }])
    // Número em uso no celular já está registrado: a Meta manda pular o /register.
    expect(chamadas.some((c) => c.url.endsWith("/register"))).toBe(false)
    expect(chamadas.some((c) => c.url.includes(`/${WABA}/subscribed_apps`) && c.method === "POST")).toBe(true)
    // A lista da tela traz a marca.
    const lista = await listarConexoesWhatsApp()
    expect(lista.map((c) => ({ status: c.status, emUsoNoCelular: c.emUsoNoCelular }))).toEqual([
      { status: "connected", emUsoNoCelular: true },
    ])
  })

  it("CA-B23-02: should descobrir o número pela WABA quando o evento da Meta vem sem phone_number_id", async () => {
    const chamadas = metaFalsa({ display_phone_number: "+55 11 98888-0002", is_on_biz_app: true })
    const fetchComWaba = globalThis.fetch
    vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes(`/${WABA}/phone_numbers`)) {
        chamadas.push({ url: String(url), method: "GET" })
        return new Response(JSON.stringify({ data: [{ id: ID_DO_NUMERO, is_on_biz_app: true }] }), { status: 200 })
      }
      return fetchComWaba(url, init)
    })
    clienteDaVez = admin

    const resultado = await completarConexaoWhatsApp({ code: "codigo", wabaId: WABA })

    expect(resultado).toEqual({})
    expect(await conexoesDeA()).toEqual([{
      status: "connected", canal: "meta", phone_number_id: ID_DO_NUMERO,
      em_uso_no_celular: true, criar_cards_do_historico: false,
    }])
  })

  it("CA-B23-04: should recusar o número que já está no canal direto de outra empresa, sem registrar nem gravar", async () => {
    const chamadas = metaFalsa({ display_phone_number: FORMATADO_DO_CANAL_DIRETO, is_on_biz_app: true })
    clienteDaVez = admin

    const resultado = await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })

    expect(resultado).toEqual({
      erro: "Este número já está conectado pelo canal direto. Desconecte-o lá antes de conectá-lo pela API Oficial.",
    })
    expect(await conexoesDeA()).toEqual([])
    expect(chamadas.some((c) => c.url.endsWith("/register"))).toBe(false)
    expect(chamadas.some((c) => c.url.includes("/subscribed_apps"))).toBe(false)
    // O canal direto de B continua como estava.
    const { data: deB } = await service.from("whatsapp_connections").select("canal, status").eq("workspace_id", empresaB)
    expect(deB).toEqual([{ canal: "gateway", status: "connected" }])
  })

  it("CA-B23-05: should recusar Gerente e Atendente sem falar com a Meta nem criar conexão", async () => {
    const chamadas = metaFalsa({ display_phone_number: "+55 11 98888-0003", is_on_biz_app: true })

    for (const navegador of [gerente, atendente]) {
      clienteDaVez = navegador
      const resultado = await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })
      expect(resultado).toEqual({ erro: "Sem permissão" })
    }

    expect(chamadas).toEqual([])
    expect(await conexoesDeA()).toEqual([])
  })
})
