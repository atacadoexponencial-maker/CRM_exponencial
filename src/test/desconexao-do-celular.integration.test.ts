// @vitest-environment node
// B23-06 — Desconexão vinda do celular, reconexão e remoção no CRM.
// Bate no banco de teste: webhook da Meta assinado, actions com o navegador do Admin
// e do Gerente, Meta como fetch espião na reconexão.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"
import { completarConexaoWhatsApp, desconectarWhatsApp, listarConexaoWhatsApp, reconectarWhatsApp, removerConexaoWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/actions"
import { enviarMensagem } from "@/app/(auth)/chat/actions"
import { listarAlertasDeNumero, type BancoDeAlertas } from "@/lib/whatsapp/alertas-de-numero"
import { TEXTO_DO_MOTIVO } from "@/lib/whatsapp/gateway/estado"
import { MOTIVO_NUMERO_DA_CONVERSA_DESCONECTADO, MOTIVO_NUMERO_DESCONECTADO } from "@/lib/whatsapp/motivo-da-falha"
import { enviarWhatsAppComMotivo } from "@/lib/whatsapp-envio"
import { processarCampanhasPendentes } from "@/lib/campanhas"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SEGREDO = "segredo-da-meta-b23-06"
const SENHA = "senha-segura-123"
const sufixo = String(ts).slice(-7)
const WABA = `waba_b23_06_${ts}`
const ID_DO_NUMERO = `pn_b23_06_${ts}`
const CLIENTE = `55219${sufixo}1`

let empresa = "", outraEmpresa = "", conexao = "", contato = "", conversa = ""
const usuarios: string[] = []
let admin: SupabaseClient, gerente: SupabaseClient, adminDaOutra: SupabaseClient

async function criarUsuario(nome: string, role: "admin" | "gerente", workspaceId = empresa) {
  const email = `b23-06-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: workspaceId, name: nome, role })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return navegador
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B23-06 ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: `55119${sufixo}0`, display_name: "Loja",
    phone_number_id: ID_DO_NUMERO, waba_id: WABA, access_token: "token-velho", em_uso_no_celular: true,
    historico_situacao: "importado", historico_progresso: 100, historico_pedido_em: new Date().toISOString(),
  }).select("id").single()).data!.id
  contato = (await service.from("contacts").insert({ workspace_id: empresa, phone_number: CLIENTE, name: "Cliente" }).select("id").single()).data!.id
  conversa = (await service.from("conversations").insert({
    workspace_id: empresa, contact_id: contato, status: "em_atendimento", whatsapp_connection_id: conexao,
    last_message_text: "Oi", last_message_at: new Date(ts - 60_000).toISOString(),
  }).select("id").single()).data!.id
  await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto", content: "Oi",
    wamid: `wamid.b23-06.${ts}`, created_at: new Date(ts - 60_000).toISOString(),
  })
  admin = await criarUsuario("admin", "admin")
  gerente = await criarUsuario("gerente", "gerente")
  // CA-B23-31: a empresa que conecta o número depois que a primeira o removeu.
  outraEmpresa = (await service.from("workspaces").insert({ name: `[TESTE] B23-06 outra ${ts}` }).select("id").single()).data!.id
  adminDaOutra = await criarUsuario("admin-da-outra", "admin", outraEmpresa)
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

afterAll(async () => {
  const { data: campanhas } = await service.from("campaigns").select("id").eq("workspace_id", empresa)
  for (const c of campanhas ?? []) await service.from("campaign_recipients").delete().eq("campaign_id", c.id)
  await service.from("campaigns").delete().eq("workspace_id", empresa)
  await service.from("operational_alerts").delete().eq("workspace_id", empresa)
  const { data: conversas } = await service.from("conversations").select("id").eq("workspace_id", empresa)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresa)
  await service.from("whatsapp_connections").delete().eq("workspace_id", outraEmpresa)
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", empresa)
  await service.from("workspaces").delete().eq("id", outraEmpresa)
}, 60_000)

/** A Meta como fetch espião: token, dados do número e o resto respondendo "ok". */
function metaDeMentira({ noCelular }: { noCelular: boolean }): string[] {
  const chamadas: string[] = []
  const fetchDeVerdade = globalThis.fetch
  vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
    const endereco = String(url)
    if (!endereco.includes("graph.facebook.com")) return fetchDeVerdade(url, init)
    chamadas.push(endereco)
    const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 })
    if (endereco.includes("/oauth/access_token")) return ok({ access_token: "token-novo" })
    if (endereco.includes(`/${ID_DO_NUMERO}?fields=`)) return ok({ display_phone_number: `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}0`, verified_name: "Loja", is_on_biz_app: noCelular })
    return ok({ success: true })
  })
  return chamadas
}

async function receberAccountUpdate(value: Record<string, unknown>) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({ object: "whatsapp_business_account", entry: [{ id: WABA, time: Math.floor(ts / 1000), changes: [{ field: "account_update", value }] }] })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } }))
  expect(res.status).toBe(200)
}

async function estadoDaConexao() {
  const { data } = await service.from("whatsapp_connections").select("id, status, state_reason, disconnected_at, access_token").eq("id", conexao).single()
  return data!
}

async function retrato() {
  const { data: conversas } = await service.from("conversations").select("id, whatsapp_connection_id").eq("workspace_id", empresa).order("id")
  // A tentativa de envio que falhou fica na conversa como "falhou" (regra do Chat); o que importa é o que saiu.
  const { data: mensagens } = await service.from("messages").select("wamid").eq("conversation_id", conversa).or("status.is.null,status.neq.falhou").order("created_at")
  const { data: contatos } = await service.from("contacts").select("id").eq("workspace_id", empresa).order("id")
  return { conversas, mensagens, contatos }
}

describe("B23-06 — Desconexão, reconexão e remoção do número em uso no celular", { timeout: 60_000 }, () => {
  it("CA-B23-26: should mostrar o número desconectado com o motivo e abrir o alerta na central para Admin e Gerente", async () => {
    await receberAccountUpdate({
      event: "PARTNER_REMOVED",
      waba_info: { waba_id: WABA, owner_business_id: "biz" },
      disconnection_info: { reason: "PRIMARY_INACTIVITY", initiated_by: "SYSTEM" },
    })

    const estado = await estadoDaConexao()
    expect(estado).toMatchObject({ status: "disconnected", state_reason: "sem_uso_do_aplicativo" })
    expect(estado.disconnected_at).not.toBeNull()
    expect(TEXTO_DO_MOTIVO[estado.state_reason!]).toBe("Desconectado por falta de uso do aplicativo.")

    for (const navegador of [admin, gerente]) {
      const alertas = await listarAlertasDeNumero(navegador as unknown as BancoDeAlertas, empresa)
      expect(alertas.map((a) => ({ tipo: a.tipo, motivo: a.motivo, connectionId: a.connectionId }))).toEqual([
        { tipo: "numero_desconectado", motivo: "Desconectado por falta de uso do aplicativo.", connectionId: conexao },
      ])
    }

    // Reentrega não duplica o alerta.
    await receberAccountUpdate({ event: "PARTNER_REMOVED", waba_info: { waba_id: WABA }, disconnection_info: { reason: "PRIMARY_INACTIVITY", initiated_by: "SYSTEM" } })
    expect(await listarAlertasDeNumero(admin as unknown as BancoDeAlertas, empresa)).toHaveLength(1)
  })

  it("CA-B23-27: should recusar envio pelo chat, por automação e por campanha enquanto o número está desconectado, explicando", async () => {
    const antes = await retrato()

    // Automação (e tudo o que envia por whatsapp-envio).
    const porAutomacao = await enviarWhatsAppComMotivo(service, empresa, contato, { tipo: "texto", texto: "Oi da automação" }, conversa)
    expect(porAutomacao).toEqual({ ok: false, motivo: MOTIVO_NUMERO_DA_CONVERSA_DESCONECTADO })

    // Chat: a tentativa fica registrada como falha, com o motivo, e nada sai.
    clienteDaVez = admin
    const peloChat = await enviarMensagem(conversa, "Oi do chat")
    expect(peloChat.erro).toMatch(/desconectado/i)
    expect(peloChat.erro).toMatch(/Configurações/)
    const { data: enviadas } = await service.from("messages").select("status").eq("conversation_id", conversa).eq("direction", "enviada")
    expect((enviadas ?? []).every((m) => m.status === "falhou")).toBe(true)

    // Campanha pelo número desconectado: destinatário falha com o motivo da campanha (B54-06).
    const { data: campanha } = await service.from("campaigns").insert({
      workspace_id: empresa, nome: `Campanha B23-06 ${ts}`, conteudo: "Promoção", status: "enviando",
      tipo_mensagem: "texto", whatsapp_connection_id: conexao,
    }).select("id").single()
    const { data: destinatario } = await service.from("campaign_recipients").insert({
      campaign_id: campanha!.id, workspace_id: empresa, contact_id: contato, nome_snapshot: "Cliente", telefone_snapshot: CLIENTE, status: "pendente",
    }).select("id").single()
    let resultado: { status: string; motivo: string | null } | null = null
    // A fila é de todas as empresas, três campanhas por rodada: insiste até a nossa sair.
    for (let rodada = 0; rodada < 5 && resultado?.status !== "falhou"; rodada++) {
      await processarCampanhasPendentes()
      resultado = (await service.from("campaign_recipients").select("status, motivo").eq("id", destinatario!.id).single()).data
    }
    expect(resultado).toEqual({ status: "falhou", motivo: MOTIVO_NUMERO_DESCONECTADO })
    // O motivo diz que o número está fora e que é preciso conectar de novo.
    expect(MOTIVO_NUMERO_DESCONECTADO).toMatch(/não está mais conectado/)
    expect(MOTIVO_NUMERO_DESCONECTADO).toMatch(/Conecte-o de novo/)

    expect((await retrato()).mensagens).toEqual(antes.mensagens)
  })

  it("should recusar no servidor religar ou desligar pelo botão do CRM um número em uso no celular", async () => {
    clienteDaVez = admin

    // Voltar a "Conectado" é só pela janela da Meta, que renova o token.
    expect((await reconectarWhatsApp(conexao)).erro).toMatch(/em uso no WhatsApp Business do celular/)
    expect((await desconectarWhatsApp(conexao)).erro).toMatch(/Plataforma Comercial/)

    expect(await estadoDaConexao()).toMatchObject({ status: "disconnected", state_reason: "sem_uso_do_aplicativo", access_token: "token-velho" })
    expect(await listarAlertasDeNumero(admin as unknown as BancoDeAlertas, empresa)).toHaveLength(1)
  })

  it("CA-B23-28: should reconectar o mesmo número mantendo conversas e contatos, sem repetir nada nem pedir o histórico de novo", async () => {
    const antes = await retrato()
    const chamadas = metaDeMentira({ noCelular: true })
    clienteDaVez = admin

    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })).toEqual({})

    const estado = await estadoDaConexao()
    expect(estado).toMatchObject({ id: conexao, status: "connected", state_reason: null, disconnected_at: null, access_token: "token-novo" })
    const { data: conexoes } = await service.from("whatsapp_connections").select("id").eq("workspace_id", empresa)
    expect(conexoes).toEqual([{ id: conexao }])
    expect(await retrato()).toEqual(antes)
    expect(chamadas.some((c) => c.endsWith("/smb_app_data"))).toBe(false)
    expect(chamadas.some((c) => c.endsWith("/register"))).toBe(false)
    // O alerta de desconectado foi resolvido.
    expect(await listarAlertasDeNumero(admin as unknown as BancoDeAlertas, empresa)).toEqual([])
    expect(await listarConexaoWhatsApp()).toMatchObject({ id: conexao, status: "connected", emUsoNoCelular: true })
  })

  it("CA-B23-30: should tirar o número da lista ao remover, sem apagar conversas nem contatos", async () => {
    const antes = await retrato()
    clienteDaVez = admin

    expect(await removerConexaoWhatsApp(conexao)).toEqual({})

    expect(await listarConexaoWhatsApp()).toBeNull()
    const { data: linha } = await service.from("whatsapp_connections").select("status").eq("id", conexao).single()
    expect(linha).toEqual({ status: "removed" })
    expect(await retrato()).toEqual(antes)
  })

  it("CA-B23-31: should deixar o número removido livre para outra empresa conectar", async () => {
    metaDeMentira({ noCelular: true })
    clienteDaVez = adminDaOutra

    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })).toEqual({})

    const { data: daOutra } = await service.from("whatsapp_connections").select("status, phone_number_id").eq("workspace_id", outraEmpresa)
    expect(daOutra).toEqual([{ status: "connected", phone_number_id: ID_DO_NUMERO }])
    // A da primeira empresa continua removida, com as conversas dela.
    expect((await estadoDaConexao()).status).toBe("removed")
    const { data: conversasDaPrimeira } = await service.from("conversations").select("whatsapp_connection_id").eq("workspace_id", empresa)
    expect(conversasDaPrimeira).toEqual([{ whatsapp_connection_id: conexao }])
  })

  it("CA-B23-32: should trazer a conexão removida de volta, com as conversas, quando a empresa conecta o mesmo número de novo", async () => {
    const antes = await retrato()
    metaDeMentira({ noCelular: true })
    clienteDaVez = admin

    // Enquanto a outra empresa usa o número, ele não volta para a primeira.
    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })).toEqual({
      erro: "Este número já está conectado em outra empresa.",
    })
    expect((await estadoDaConexao()).status).toBe("removed")

    // A outra empresa remove: o número fica livre de novo.
    clienteDaVez = adminDaOutra
    const { data: daOutra } = await service.from("whatsapp_connections").select("id").eq("workspace_id", outraEmpresa).single()
    expect(await removerConexaoWhatsApp(daOutra!.id)).toEqual({})

    clienteDaVez = admin
    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: WABA })).toEqual({})

    // A mesma conexão voltou: nenhuma nova nasceu, e as conversas seguem ligadas a ela.
    expect(await estadoDaConexao()).toMatchObject({ id: conexao, status: "connected", access_token: "token-novo" })
    const { data: conexoes } = await service.from("whatsapp_connections").select("id").eq("workspace_id", empresa)
    expect(conexoes).toEqual([{ id: conexao }])
    expect(await retrato()).toEqual(antes)
    expect(await listarConexaoWhatsApp()).toMatchObject({ id: conexao, status: "connected" })
  })

  it("CA-B23-28: should reconectar pelo caminho do celular, em que a Meta não informa o id do número", async () => {
    await service.from("whatsapp_connections").update({ status: "disconnected", disconnected_at: new Date().toISOString() }).eq("id", conexao)
    const fetchDeVerdade = globalThis.fetch
    vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
      const endereco = String(url)
      if (!endereco.includes("graph.facebook.com")) return fetchDeVerdade(url, init)
      const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 })
      if (endereco.includes("/oauth/access_token")) return ok({ access_token: "token-do-celular" })
      if (endereco.includes(`/${WABA}/phone_numbers`)) return ok({ data: [{ id: ID_DO_NUMERO, is_on_biz_app: true }] })
      if (endereco.includes(`/${ID_DO_NUMERO}?fields=`)) return ok({ display_phone_number: `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}0`, verified_name: "Loja", is_on_biz_app: true })
      return ok({ success: true })
    })
    clienteDaVez = admin

    expect(await completarConexaoWhatsApp({ code: "codigo", wabaId: WABA })).toEqual({})

    expect(await estadoDaConexao()).toMatchObject({ id: conexao, status: "connected", access_token: "token-do-celular" })
    const { data: conexoes } = await service.from("whatsapp_connections").select("id").eq("workspace_id", empresa)
    expect(conexoes).toEqual([{ id: conexao }])
  })
})
