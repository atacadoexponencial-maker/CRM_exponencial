// @vitest-environment node
// B19-03 — credenciais do WhatsApp só no servidor (auditoria de 06/10/2026). Bate no
// Supabase real, pelo navegador simulado: client com a anon key e login de cada papel.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { resolverProviderDaConversa } from "@/lib/whatsapp"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", outraEmpresa = "", conexaoMeta = "", conexaoOutra = "", contatoOutra = "", conversaOutra = ""
const usuarios: string[] = []
let navegadorAdmin: SupabaseClient, navegadorAtendente: SupabaseClient

async function logar(papel: string) {
  const email = `b19-03-${papel}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  usuarios.push(data.user!.id)
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: empresa, name: papel, role: papel })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return navegador
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Credenciais B19 ${ts}` }).select("id").single()).data!.id
  outraEmpresa = (await service.from("workspaces").insert({ name: `Outra Credenciais B19 ${ts}` }).select("id").single()).data!.id
  conexaoMeta = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: "5511911110000",
    phone_number_id: `pn_${ts}`, waba_id: `waba_${ts}`, access_token: "segredo-da-meta",
  }).select("id").single()).data!.id
  conexaoOutra = (await service.from("whatsapp_connections").insert({
    workspace_id: outraEmpresa, canal: "gateway", status: "connected", phone_number: "5511922220000",
    instance_id: `inst_b19_${ts}`, instance_token: "segredo-do-gateway",
  }).select("id").single()).data!.id
  contatoOutra = (await service.from("contacts").insert({ workspace_id: outraEmpresa, name: "Cliente da outra", phone_number: `55119${String(ts).slice(-8)}` }).select("id").single()).data!.id
  conversaOutra = (await service.from("conversations").insert({ workspace_id: outraEmpresa, contact_id: contatoOutra, whatsapp_connection_id: conexaoOutra }).select("id").single()).data!.id
  navegadorAdmin = await logar("admin")
  navegadorAtendente = await logar("atendente")
}, 60_000)

afterAll(async () => {
  await service.from("conversations").delete().eq("id", conversaOutra)
  await service.from("contacts").delete().eq("id", contatoOutra)
  await service.from("whatsapp_connections").delete().in("id", [conexaoMeta, conexaoOutra])
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresa, outraEmpresa])
}, 60_000)

describe("B19-03 — Credenciais do WhatsApp só no servidor", { timeout: 30_000 }, () => {
  it("should reject Admin pedindo access_token pelo navegador", async () => {
    const { data, error } = await navegadorAdmin.from("whatsapp_connections").select("access_token").eq("id", conexaoMeta)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it("should reject Atendente pedindo access_token e instance_token pelo navegador", async () => {
    const { error: e1 } = await navegadorAtendente.from("whatsapp_connections").select("access_token").eq("id", conexaoMeta)
    const { error: e2 } = await navegadorAtendente.from("whatsapp_connections").select("instance_token").eq("id", conexaoMeta)
    expect(e1).not.toBeNull()
    expect(e2).not.toBeNull()
  })

  it("should reject select de todas as colunas pelo navegador", async () => {
    const { error } = await navegadorAdmin.from("whatsapp_connections").select("*").eq("id", conexaoMeta)
    expect(error).not.toBeNull()
  })

  it("should continuar mostrando número, nome, canal e situação ao usuário logado", async () => {
    const { data, error } = await navegadorAtendente
      .from("whatsapp_connections")
      .select("id, phone_number, display_name, canal, status, waba_id")
      .eq("id", conexaoMeta)
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ phone_number: "5511911110000", canal: "meta", status: "connected" })
  })

  it("should not usar a conexão de outra empresa ao resolver o envio de uma conversa dela", async () => {
    const provider = await resolverProviderDaConversa(service, conversaOutra, empresa)
    // Cai no número da própria empresa (Meta), nunca no gateway da outra.
    expect(provider?.canal).toBe("meta")
  })
})
