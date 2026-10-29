// @vitest-environment node
// Configurações › WhatsApp: o número do canal direto não conta como "número da API Oficial".
// Com um número só do canal direto, a tela dizia "Já existe um número na API Oficial" e não
// deixava conectar a Meta. Bate no Supabase real, com o client SSR trocado pelo "navegador"
// do Admin.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { listarConexaoWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", admin = ""

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] Conexão Meta ${ts}` }).select("id").single()).data!.id
  const email = `conexao-meta-${ts}@teste.com`
  admin = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: admin, workspace_id: empresa, name: "Admin", role: "admin" })
  clienteDaVez = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterEach(async () => {
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresa)
})

afterAll(async () => {
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("id", admin)
  await service.auth.admin.deleteUser(admin)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

function numeroDoCanalDireto(sufixo: string) {
  return {
    workspace_id: empresa, canal: "gateway", status: "connected", phone_number: `55119000${sufixo}`,
    display_name: `Canal direto ${sufixo}`, instance_id: `inst-${ts}-${sufixo}`, instance_token: "token",
  }
}

describe("Configurações › WhatsApp — o fluxo da Meta só olha os números da API Oficial", () => {
  it("empresa sem nenhum número: o fluxo da Meta aparece", async () => {
    expect(await listarConexaoWhatsApp()).toBeNull()
  })

  it("empresa com um número só do canal direto: o fluxo da Meta aparece", async () => {
    await service.from("whatsapp_connections").insert(numeroDoCanalDireto("0001"))
    expect(await listarConexaoWhatsApp()).toBeNull()
  })

  it("empresa com número da API Oficial e do canal direto: devolve o da API Oficial", async () => {
    await service.from("whatsapp_connections").insert(numeroDoCanalDireto("0002"))
    const { data: meta } = await service.from("whatsapp_connections").insert({
      workspace_id: empresa, canal: "meta", status: "connected", phone_number: "5511933330001",
      display_name: "Loja Meta", phone_number_id: `pn_${ts}`, waba_id: `waba_${ts}`, access_token: "token",
    }).select("id").single()
    const conexao = await listarConexaoWhatsApp()
    expect(conexao?.id).toBe(meta!.id)
    expect(conexao?.displayName).toBe("Loja Meta")
  })
})
