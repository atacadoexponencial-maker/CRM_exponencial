// @vitest-environment node
// B44-03 — evento do gateway só mexe em mensagem da empresa do número por onde
// chegou (auditoria de 27/10/2026). Bate no Supabase real com a chave de serviço,
// como o webhook do gateway faz.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))

import { receberMensagem } from "@/lib/whatsapp/recebimento"
import { aplicarStatusDeMensagem } from "@/lib/whatsapp/eventos-de-operacao"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const RECEBIDO_EM = new Date().toISOString()
let empresaA = "", empresaB = ""
let mensagemA = "", mensagemACliente = "", mensagemB = "", mensagemBCliente = "", campanhaB = "", destinatarioB = ""
const WAMID_A = `wamid.b44-03.a.${ts}`
const WAMID_A_CLIENTE = `wamid.b44-03.a-cliente.${ts}`
const WAMID_B = `wamid.b44-03.b.${ts}`
const WAMID_B_CLIENTE = `wamid.b44-03.b-cliente.${ts}`
const telefoneDe = (sufixo: string) => `5511${sufixo}${String(ts).slice(-6)}`
const telefoneA = telefoneDe("71")
const telefoneB = telefoneDe("72")

async function criarMensagem(empresa: string, wamid: string, sufixo: string) {
  const contato = (await service.from("contacts").insert({ workspace_id: empresa, name: `Cliente ${sufixo}`, phone_number: telefoneDe(sufixo) }).select("id").single()).data!.id
  const conversa = (await service.from("conversations").insert({ workspace_id: empresa, contact_id: contato }).select("id").single()).data!.id
  const id = (await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversa, direction: "enviada", type: "texto",
    content: "texto original", wamid, status: "enviado",
  }).select("id").single()).data!.id
  return { id, conversa }
}

/** Auditoria run-2 (pista 3): a mensagem que o cliente escreveu, na conversa dele. */
async function criarMensagemDoCliente(empresa: string, conversa: string, wamid: string) {
  return (await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto",
    content: "texto do cliente", wamid,
  }).select("id").single()).data!.id
}

const mensagem = async (id: string) =>
  (await service.from("messages").select("content, edited_at, deleted_at, reaction_emoji, status").eq("id", id).single()).data

const evento = (extra: Record<string, unknown>) => ({
  message_id: `evt-${ts}-${Math.random()}`, from: "5511999990000", from_is_lid: false, type: "text", ...extra,
})

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-03 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-03 B ${ts}` }).select("id").single()).data!.id
  const a = await criarMensagem(empresaA, WAMID_A, "71")
  mensagemA = a.id
  mensagemACliente = await criarMensagemDoCliente(empresaA, a.conversa, WAMID_A_CLIENTE)
  const b = await criarMensagem(empresaB, WAMID_B, "72")
  mensagemB = b.id
  mensagemBCliente = await criarMensagemDoCliente(empresaB, b.conversa, WAMID_B_CLIENTE)
  campanhaB = (await service.from("campaigns").insert({ workspace_id: empresaB, nome: "Campanha da B", conteudo: "oi", status: "enviando" }).select("id").single()).data!.id
  destinatarioB = (await service.from("campaign_recipients").insert({
    campaign_id: campanhaB, workspace_id: empresaB, telefone_snapshot: "5511972000000", status: "enviado", wamid: WAMID_B,
  }).select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  await service.from("campaign_recipients").delete().eq("id", destinatarioB)
  await service.from("campaigns").delete().eq("id", campanhaB)
  for (const empresa of [empresaA, empresaB]) {
    await service.from("messages").delete().eq("workspace_id", empresa)
    await service.from("conversations").delete().eq("workspace_id", empresa)
    await service.from("contacts").delete().eq("workspace_id", empresa)
  }
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

describe("B44-03 — Evento do gateway preso à empresa do número", { timeout: 30_000 }, () => {
  it("CA-B44-11: should not mexer em mensagem de outra empresa por edição, apagamento, reação ou status", async () => {
    const pelaEmpresaA = { supabase: service, workspaceId: empresaA, recebidoEm: RECEBIDO_EM }
    // Auditoria run-2 (pista 3): o remetente é o próprio contato da conversa de B, para
    // que só o filtro por empresa barre o evento (e não a falta de contato). A edição e
    // o apagamento miram a mensagem que esse cliente escreveu em B.
    const doClienteDeB = (extra: Record<string, unknown>) => ({ ...evento(extra), from: telefoneB })

    const edicao = await receberMensagem({ ...pelaEmpresaA, evento: doClienteDeB({ type: "system", system: { action: "edited", target_message_id: WAMID_B_CLIENTE, new_text: "texto trocado" } }) })
    const reacao = await receberMensagem({ ...pelaEmpresaA, evento: doClienteDeB({ type: "reaction", reaction: { emoji: "💀", target_message_id: WAMID_B } }) })
    const apagamento = await receberMensagem({ ...pelaEmpresaA, evento: doClienteDeB({ type: "system", system: { action: "deleted", target_message_id: WAMID_B_CLIENTE } }) })
    const status = await aplicarStatusDeMensagem({ supabase: service, workspaceId: empresaA, evento: { message_id: WAMID_B, status: "failed", error: { code: "x", message: "falhou" } } })

    expect([edicao, reacao, apagamento].map((r) => "alvoEncontrado" in r && r.alvoEncontrado)).toEqual([false, false, false])
    expect(status.achou).toBe(false)
    expect(await mensagem(mensagemB)).toEqual({ content: "texto original", edited_at: null, deleted_at: null, reaction_emoji: null, status: "enviado" })
    expect(await mensagem(mensagemBCliente)).toEqual({ content: "texto do cliente", edited_at: null, deleted_at: null, reaction_emoji: null, status: null })
    const { data: destinatario } = await service.from("campaign_recipients").select("status").eq("id", destinatarioB).single()
    expect(destinatario?.status).toBe("enviado")
  })

  // Auditoria run-2 (pista 3, aprovado pelo Luan em 06/11/2026): o evento vem do
  // contato da conversa. Antes, um número qualquer editava e apagava a mensagem que a
  // empresa mandou; agora a edição e o apagamento valem na mensagem que o cliente
  // escreveu, e a reação na mensagem da empresa, dentro da conversa dele.
  it("CA-B44-12: should aplicar edição, reação, apagamento e status na mensagem da própria empresa", async () => {
    const pelaEmpresaA = { supabase: service, workspaceId: empresaA, recebidoEm: RECEBIDO_EM }
    const doCliente = (extra: Record<string, unknown>) => ({ ...evento(extra), from: telefoneA })

    await receberMensagem({ ...pelaEmpresaA, evento: doCliente({ type: "system", system: { action: "edited", target_message_id: WAMID_A_CLIENTE, new_text: "texto corrigido" } }) })
    await receberMensagem({ ...pelaEmpresaA, evento: doCliente({ type: "reaction", reaction: { emoji: "👍", target_message_id: WAMID_A } }) })
    await aplicarStatusDeMensagem({ supabase: service, workspaceId: empresaA, evento: { message_id: WAMID_A, status: "read", error: null } })
    const editada = await mensagem(mensagemACliente)
    expect(editada).toMatchObject({ content: "texto corrigido" })
    expect(editada?.edited_at).not.toBeNull()
    expect(await mensagem(mensagemA)).toMatchObject({ reaction_emoji: "👍", status: "lido" })

    await receberMensagem({ ...pelaEmpresaA, evento: doCliente({ type: "system", system: { action: "deleted", target_message_id: WAMID_A_CLIENTE } }) })
    expect((await mensagem(mensagemACliente))?.deleted_at).not.toBeNull()
  })
})
