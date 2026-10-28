// @vitest-environment node
// B47-03 — a mensagem citada numa resposta do canal direto é procurada só na empresa do
// número por onde o evento chegou. No banco de teste; tempo real, foto e automações
// ficam de fora (substituídos), para o teste gravar só mensagens.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal") }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({ dispararMensagemEnviadaPeloTime: vi.fn().mockResolvedValue(undefined) }))

import { registrarMensagemRecebida } from "@/lib/whatsapp/recebimento"
import { registrarEnviadaPeloCelular } from "@/lib/whatsapp/enviada-pelo-celular"

const servico = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
// O tipo do cliente do teste e o do servidor são o mesmo supabase-js, sem o tipo das tabelas
type Servico = Parameters<typeof registrarMensagemRecebida>[0]["supabase"]
const svc = servico as unknown as Servico

const ts = Date.now()
const empresas: string[] = []
let wsA: string
let citadaDeA: string
const WAMID_DE_A = `B47-A-${ts}`
const WAMID_DE_B = `B47-B-${ts}`

async function empresaComMensagem(nome: string, wamid: string): Promise<{ ws: string; mensagem: string }> {
  const ws = (await servico.from("workspaces").insert({ name: nome }).select("id").single()).data!.id
  empresas.push(ws)
  const contato = (await servico.from("contacts").insert({ workspace_id: ws, name: "Cliente", phone_number: `55119${String(ts).slice(-8)}` }).select("id").single()).data!.id
  const conversa = (await servico.from("conversations").insert({ workspace_id: ws, contact_id: contato, status: "em_atendimento" }).select("id").single()).data!.id
  const mensagem = (await servico.from("messages").insert({ workspace_id: ws, conversation_id: conversa, direction: "recebida", type: "texto", content: "Tem no atacado?", wamid }).select("id").single()).data!.id
  return { ws, mensagem }
}

beforeAll(async () => {
  const a = await empresaComMensagem(`B47 resposta A ${ts}`, WAMID_DE_A)
  wsA = a.ws
  citadaDeA = a.mensagem
  await empresaComMensagem(`B47 resposta B ${ts}`, WAMID_DE_B)
}, 60_000)

afterAll(async () => {
  for (const tabela of ["messages", "conversations", "pipeline_cards", "contacts"]) {
    await servico.from(tabela).delete().in("workspace_id", empresas)
  }
  await servico.from("workspaces").delete().in("id", empresas)
}, 60_000)

async function citacaoGravada(wamid: string): Promise<string | null> {
  const { data } = await servico.from("messages").select("reply_to_id").eq("wamid", wamid).single()
  return data!.reply_to_id as string | null
}

describe("B47-03 — resposta citada só da própria empresa", () => {
  it("CA-B47-08: should not ligar a resposta à mensagem de outra empresa, e ligar à da própria empresa", async () => {
    const telefone = `55119${String(ts).slice(-8)}`
    const recebida = (id: string, citada: string) => ({
      message_id: id, from: telefone, from_is_lid: false, type: "text", text: "Quero sim",
      reply_to: { message_id: citada, preview_text: "Tem no atacado?" },
    })
    const enviada = (id: string, citada: string) => ({
      message_id: id, to: telefone, to_is_lid: false, type: "text", text: "Segue a tabela",
      reply_to: { message_id: citada, preview_text: "Tem no atacado?" },
    })
    const agora = new Date().toISOString()

    // Na empresa A, citando o identificador de uma mensagem da empresa B
    await registrarMensagemRecebida({ supabase: svc, workspaceId: wsA, evento: recebida(`B47-R1-${ts}`, WAMID_DE_B), recebidoEm: agora })
    await registrarEnviadaPeloCelular({ supabase: svc, workspaceId: wsA, evento: enviada(`B47-E1-${ts}`, WAMID_DE_B), enviadaEm: agora })
    expect(await citacaoGravada(`B47-R1-${ts}`)).toBeNull()
    expect(await citacaoGravada(`B47-E1-${ts}`)).toBeNull()

    // Citando uma mensagem da própria empresa, a ligação continua
    await registrarMensagemRecebida({ supabase: svc, workspaceId: wsA, evento: recebida(`B47-R2-${ts}`, WAMID_DE_A), recebidoEm: agora })
    await registrarEnviadaPeloCelular({ supabase: svc, workspaceId: wsA, evento: enviada(`B47-E2-${ts}`, WAMID_DE_A), enviadaEm: agora })
    expect(await citacaoGravada(`B47-R2-${ts}`)).toBe(citadaDeA)
    expect(await citacaoGravada(`B47-E2-${ts}`)).toBe(citadaDeA)
  }, 90_000)
})
