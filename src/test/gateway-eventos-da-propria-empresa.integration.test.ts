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
let mensagemA = "", mensagemB = "", campanhaB = "", destinatarioB = ""
const WAMID_A = `wamid.b44-03.a.${ts}`
const WAMID_B = `wamid.b44-03.b.${ts}`

async function criarMensagem(empresa: string, wamid: string, sufixo: string) {
  const contato = (await service.from("contacts").insert({ workspace_id: empresa, name: `Cliente ${sufixo}`, phone_number: `5511${sufixo}${String(ts).slice(-6)}` }).select("id").single()).data!.id
  const conversa = (await service.from("conversations").insert({ workspace_id: empresa, contact_id: contato }).select("id").single()).data!.id
  return (await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversa, direction: "enviada", type: "texto",
    content: "texto original", wamid, status: "enviado",
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
  mensagemA = await criarMensagem(empresaA, WAMID_A, "71")
  mensagemB = await criarMensagem(empresaB, WAMID_B, "72")
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

    const edicao = await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "system", system: { action: "edited", target_message_id: WAMID_B, new_text: "texto trocado" } }) })
    const reacao = await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "reaction", reaction: { emoji: "💀", target_message_id: WAMID_B } }) })
    const apagamento = await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "system", system: { action: "deleted", target_message_id: WAMID_B } }) })
    const status = await aplicarStatusDeMensagem({ supabase: service, workspaceId: empresaA, evento: { message_id: WAMID_B, status: "failed", error: { code: "x", message: "falhou" } } })

    expect([edicao, reacao, apagamento].map((r) => "alvoEncontrado" in r && r.alvoEncontrado)).toEqual([false, false, false])
    expect(status.achou).toBe(false)
    expect(await mensagem(mensagemB)).toEqual({ content: "texto original", edited_at: null, deleted_at: null, reaction_emoji: null, status: "enviado" })
    const { data: destinatario } = await service.from("campaign_recipients").select("status").eq("id", destinatarioB).single()
    expect(destinatario?.status).toBe("enviado")
  })

  it("CA-B44-12: should aplicar edição, reação, apagamento e status na mensagem da própria empresa", async () => {
    const pelaEmpresaA = { supabase: service, workspaceId: empresaA, recebidoEm: RECEBIDO_EM }

    await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "system", system: { action: "edited", target_message_id: WAMID_A, new_text: "texto corrigido" } }) })
    await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "reaction", reaction: { emoji: "👍", target_message_id: WAMID_A } }) })
    await aplicarStatusDeMensagem({ supabase: service, workspaceId: empresaA, evento: { message_id: WAMID_A, status: "read", error: null } })
    const depoisDaEdicao = await mensagem(mensagemA)
    expect(depoisDaEdicao).toMatchObject({ content: "texto corrigido", reaction_emoji: "👍", status: "lido" })
    expect(depoisDaEdicao?.edited_at).not.toBeNull()

    await receberMensagem({ ...pelaEmpresaA, evento: evento({ type: "system", system: { action: "deleted", target_message_id: WAMID_A } }) })
    expect((await mensagem(mensagemA))?.deleted_at).not.toBeNull()
  })
})
