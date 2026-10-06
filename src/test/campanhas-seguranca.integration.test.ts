// @vitest-environment node
// B20-03 — campanha só usa número e dados da própria empresa (auditoria de 06/10/2026).
// Bate no Supabase real: um Gerente da empresa A tenta usar o número e a campanha da B.
// O motor não é chamado aqui (processaria campanhas reais) — ver campanhas-motor-seguranca.test.ts.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
// Confirmar "agora" chama o motor; aqui ele não pode rodar contra produção.
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: async () => 0 }))

import { salvarRascunho, confirmarCampanha, type DadosCampanha } from "@/app/(auth)/campanhas/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresaA = "", empresaB = "", gerenteA = "", conexaoA = "", conexaoB = "", campanhaB = "", contatoA = ""
const campanhasCriadas: string[] = []

function dados(extra: Partial<DadosCampanha> = {}): DadosCampanha {
  return { nome: `Campanha B20 ${ts}`, segmento: {}, tipoMensagem: "texto", conteudo: "Oi!", arquivoUrl: null, arquivoNome: null, ...extra }
}

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `Campanhas A B20 ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `Campanhas B B20 ${ts}` }).select("id").single()).data!.id
  const email = `b20-03-gerente-${ts}@teste.com`
  gerenteA = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: gerenteA, workspace_id: empresaA, name: "Gerente A", role: "gerente" })
  conexaoA = (await service.from("whatsapp_connections").insert({ workspace_id: empresaA, canal: "gateway", status: "connected", phone_number: "5511933330000", instance_id: `inst_a_${ts}`, instance_token: "token-a" }).select("id").single()).data!.id
  conexaoB = (await service.from("whatsapp_connections").insert({ workspace_id: empresaB, canal: "gateway", status: "connected", phone_number: "5511944440000", instance_id: `inst_b_${ts}`, instance_token: "token-b" }).select("id").single()).data!.id
  contatoA = (await service.from("contacts").insert({ workspace_id: empresaA, name: "Cliente A", phone_number: `55319${String(ts).slice(-8)}` }).select("id").single()).data!.id
  campanhaB = (await service.from("campaigns").insert({ workspace_id: empresaB, nome: "Campanha da B", conteudo: "da B", status: "rascunho" }).select("id").single()).data!.id
  await service.from("campaign_recipients").insert({ campaign_id: campanhaB, workspace_id: empresaB, nome_snapshot: "Cliente B", telefone_snapshot: "5511955550000" })

  clienteDaVez = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterAll(async () => {
  for (const c of [campanhaB, ...campanhasCriadas]) {
    await service.from("campaign_recipients").delete().eq("campaign_id", c)
    await service.from("campaigns").delete().eq("id", c)
  }
  await service.from("contacts").delete().eq("id", contatoA)
  await service.from("whatsapp_connections").delete().in("id", [conexaoA, conexaoB])
  await service.from("profiles").delete().eq("id", gerenteA)
  await service.auth.admin.deleteUser(gerenteA)
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

describe("B20-03 — Campanha só usa número e dados da própria empresa", { timeout: 30_000 }, () => {
  it("should salvar campanha com número da própria empresa", async () => {
    const r = await salvarRascunho(null, dados({ whatsappConnectionId: conexaoA }))
    expect(r.erro).toBeUndefined()
    campanhasCriadas.push(r.id!)
    const { data } = await service.from("campaigns").select("whatsapp_connection_id").eq("id", r.id!).single()
    expect(data!.whatsapp_connection_id).toBe(conexaoA)
  })

  it("should reject salvar campanha nova com número de outra empresa sem gravar nada", async () => {
    const nome = `Intrusa B20 ${ts}`
    const r = await salvarRascunho(null, dados({ nome, whatsappConnectionId: conexaoB }))
    expect(r).toEqual({ erro: "Número de WhatsApp inválido para esta campanha" })
    const { count } = await service.from("campaigns").select("id", { count: "exact", head: true }).eq("nome", nome)
    expect(count).toBe(0)
  })

  it("should reject editar a campanha de outra empresa", async () => {
    const r = await salvarRascunho(campanhaB, dados({ nome: "Sequestrada" }))
    expect(r.erro).toBeTruthy()
    const { data } = await service.from("campaigns").select("nome").eq("id", campanhaB).single()
    expect(data!.nome).toBe("Campanha da B")
  })

  it("should reject confirmar a campanha de outra empresa sem mexer nos destinatários dela", async () => {
    const r = await confirmarCampanha(campanhaB, dados(), null)
    expect(r.erro).toBeTruthy()
    const { data } = await service.from("campaign_recipients").select("workspace_id, telefone_snapshot").eq("campaign_id", campanhaB)
    expect(data).toEqual([{ workspace_id: empresaB, telefone_snapshot: "5511955550000" }])
    const { data: c } = await service.from("campaigns").select("status").eq("id", campanhaB).single()
    expect(c!.status).toBe("rascunho")
  })
})
