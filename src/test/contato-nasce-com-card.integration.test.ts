// @vitest-environment node
// B45-01 — todo contato nasce com card na primeira etapa do Funil de Entrada.
// Bate no Supabase real: o client SSR é o "navegador" do Admin, o webhook da Meta,
// o canal direto e a loja rodam com a chave de serviço de verdade.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Automações, transmissão ao vivo e foto do perfil não são o que se testa aqui.
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
  transmitirContatoRestaurado: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({
  buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal"),
  urlAssinadaDaFoto: vi.fn().mockResolvedValue(null),
  apagarFotoDoContato: vi.fn().mockResolvedValue(undefined),
}))

import { criarContato, buscarDadosContato } from "@/app/(auth)/contatos/actions"
import { POST } from "@/app/api/webhooks/whatsapp/route"
import { receberMensagem } from "@/lib/whatsapp/recebimento"
import { registrarPedido } from "@/lib/catalogo/pedidos"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const fim = String(ts).slice(-7)
const SENHA = "senha-segura-123"
const SEGREDO_DE_TESTE = "segredo-da-meta-b45-01"
const ID_DO_NUMERO = `pn_b45_${ts}`
const slug = `b45-01-${ts}`
let ws = "", adminId = "", conexaoMeta = "", camisa = ""

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B45-01 ${ts}` }).select("id").single()).data!.id
  const email = `b45-01-admin-${ts}@teste.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  clienteDaVez = navegador

  conexaoMeta = (await service.from("whatsapp_connections").insert({
    workspace_id: ws, canal: "meta", status: "connected", phone_number: `55119${fim}0`,
    display_name: "Loja B45", phone_number_id: ID_DO_NUMERO, waba_id: `waba_${ts}`, access_token: "token-b45",
  }).select("id").single()).data!.id

  await service.from("catalog_settings").insert({ workspace_id: ws, slug, orders_whatsapp: `55119${fim}0`, published: true, min_type: "pecas", min_value: 1, closing_message: "Pix" })
  camisa = (await service.from("catalog_products").insert({ workspace_id: ws, name: "Camisa", price: 20 }).select("id").single()).data!.id
  await service.from("catalog_stock").insert({ workspace_id: ws, product_id: camisa, combination: "", quantity: 100 })
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
})

afterAll(async () => {
  const { data: conversas } = await service.from("conversations").select("id").eq("workspace_id", ws)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("catalog_settings").delete().eq("workspace_id", ws)
  await service.from("catalog_products").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("whatsapp_connections").delete().eq("id", conexaoMeta)
  await service.from("profiles").delete().eq("id", adminId)
  await service.auth.admin.deleteUser(adminId)
  await service.from("workspaces").delete().eq("id", ws)
}, 60_000)

async function cardsDe(contactId: string) {
  return (await service.from("pipeline_cards").select("funil, etapa, atendente_id").eq("contact_id", contactId)).data ?? []
}

async function contatoPeloTelefone(telefone: string) {
  return (await service.from("contacts").select("id").eq("workspace_id", ws).eq("phone_number", telefone).maybeSingle()).data
}

async function mensagemPelaMeta(telefone: string, texto: string) {
  vi.stubEnv("META_APP_SECRET", SEGREDO_DE_TESTE)
  const corpo = JSON.stringify({
    entry: [{ changes: [{ value: {
      metadata: { phone_number_id: ID_DO_NUMERO },
      contacts: [{ wa_id: telefone, profile: { name: "Cliente Meta" } }],
      messages: [{ from: telefone, id: `wamid.b45.${telefone}.${Math.random()}`, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: texto } }],
    } }] }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO_DE_TESTE).update(corpo).digest("hex")
  const resposta = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura },
  }))
  expect(resposta.status).toBe(200)
}

async function mensagemPeloCanalDireto(telefone: string, texto: string) {
  await receberMensagem({
    supabase: service as never,
    workspaceId: ws,
    recebidoEm: new Date().toISOString(),
    evento: { message_id: `evt-b45-${Math.random()}`, from: telefone, from_is_lid: false, type: "text", text: texto },
  })
}

describe("B45-01 — Todo contato nasce com card na Entrada", { timeout: 60_000 }, () => {
  it("CA-B45-01: should criar o card da Maria na primeira etapa da Entrada, sem atendente, e mostrá-lo no perfil", async () => {
    const r = await criarContato({ nome: "Maria", telefone: `11 9${fim.slice(0, 4)}-${fim.slice(3, 7)}` })
    expect(r.erro).toBeUndefined()

    expect(await cardsDe(r.id!)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: null }])
    const perfil = await buscarDadosContato(r.id!)
    expect(perfil?.cards).toEqual([expect.objectContaining({ funil: "entrada", etapaLabel: "Lead" })])
  })

  it("CA-B45-02: should criar o card na Entrada para quem manda a primeira mensagem pela API Oficial e pelo canal direto", async () => {
    const pelaMeta = `55219${fim}1`
    await mensagemPelaMeta(pelaMeta, "Oi, quero o catálogo")
    const contatoMeta = await contatoPeloTelefone(pelaMeta)
    expect(contatoMeta).not.toBeNull()
    expect(await cardsDe(contatoMeta!.id)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: null }])

    const peloCanalDireto = `55319${fim}2`
    await mensagemPeloCanalDireto(peloCanalDireto, "Bom dia")
    const contatoDireto = await contatoPeloTelefone(peloCanalDireto)
    expect(contatoDireto).not.toBeNull()
    expect(await cardsDe(contatoDireto!.id)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: null }])
  })

  it("CA-B45-03: should criar o card na Entrada para o número novo que faz pedido pela loja", async () => {
    const telefone = `55419${fim}3`
    const r = await registrarPedido(slug, { nome: "Cliente da Loja", whatsapp: telefone }, [{ produtoId: camisa, combinacao: "", quantidade: 2 }])
    expect(r.ok).toBe(true)

    const contato = await contatoPeloTelefone(telefone)
    expect(contato).not.toBeNull()
    expect(await cardsDe(contato!.id)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: null }])
  })

  it("CA-B45-04: should manter um card só na Entrada quando a Ana manda mensagem, faz pedido e sai da lixeira", async () => {
    const telefone = `55519${fim}4`
    const ana = (await service.from("contacts").insert({ workspace_id: ws, phone_number: telefone, name: "Ana" }).select("id").single()).data!.id
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: ana, funil: "entrada", etapa: "sondagem" })
    const soUmNaEntrada = async () => (await cardsDe(ana)).filter((c) => c.funil === "entrada")

    await mensagemPeloCanalDireto(telefone, "Oi de novo")
    await mensagemPelaMeta(telefone, "E mais uma")
    expect(await soUmNaEntrada()).toEqual([{ funil: "entrada", etapa: "sondagem", atendente_id: null }])

    const pedido = await registrarPedido(slug, { nome: "Ana", whatsapp: telefone }, [{ produtoId: camisa, combinacao: "", quantidade: 1 }])
    expect(pedido.ok).toBe(true)
    expect(await soUmNaEntrada()).toEqual([{ funil: "entrada", etapa: "sondagem", atendente_id: null }])

    await service.from("contacts").update({ excluido_em: new Date().toISOString() }).eq("id", ana)
    await mensagemPeloCanalDireto(telefone, "Voltei")
    expect((await service.from("contacts").select("excluido_em").eq("id", ana).single()).data?.excluido_em).toBeNull()
    expect(await soUmNaEntrada()).toEqual([{ funil: "entrada", etapa: "sondagem", atendente_id: null }])
  })

  it("CA-B45-05: should dar card na Entrada a cada contato antigo sem card, com o dono dele, e não criar outro para quem já tinha", async () => {
    const novo = (nome: string, final: string, atendente: string | null = null) =>
      service.from("contacts").insert({ workspace_id: ws, phone_number: `55619${fim}${final}`, name: nome, atendente_id: atendente }).select("id").single()
    const comDono = (await novo("Antigo com dono", "5", adminId)).data!.id
    const semDono = (await novo("Antigo sem dono", "6")).data!.id
    const naEntrada = (await novo("Já na Entrada", "7")).data!.id
    const soNaRecompra = (await novo("Só na Recompra", "8")).data!.id
    await service.from("pipeline_cards").insert([
      { workspace_id: ws, contact_id: naEntrada, funil: "entrada", etapa: "negociacao" },
      { workspace_id: ws, contact_id: soNaRecompra, funil: "recompra", etapa: "ativos" },
    ])

    const { error } = await service.rpc("criar_cards_de_entrada_que_faltam", { p_workspace_id: ws })
    expect(error).toBeNull()

    expect(await cardsDe(comDono)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: adminId }])
    expect(await cardsDe(semDono)).toEqual([{ funil: "entrada", etapa: "lead", atendente_id: null }])
    expect(await cardsDe(naEntrada)).toEqual([{ funil: "entrada", etapa: "negociacao", atendente_id: null }])
    expect(await cardsDe(soNaRecompra)).toEqual([{ funil: "recompra", etapa: "ativos", atendente_id: null }])

    // Nenhum contato da empresa do teste ficou sem card
    const { data: contatos } = await service.from("contacts").select("id").eq("workspace_id", ws)
    const { data: cards } = await service.from("pipeline_cards").select("contact_id").eq("workspace_id", ws)
    const comCard = new Set((cards ?? []).map((c) => c.contact_id))
    expect((contatos ?? []).filter((c) => !comCard.has(c.id))).toEqual([])
  })
})
