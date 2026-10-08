// @vitest-environment node
// B21-01 — atendente só alcança as conversas dele (auditoria de 06/10/2026, rodada 3).
// Bate no Supabase real. O client SSR (cookies do Next) é trocado pelo client do
// "navegador" da vez, como nos testes da B20.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import {
  aplicarEtiqueta,
  buscarMensagens,
  enviarMensagem,
  reabrirConversa,
  resolverConversa,
  transferirConversa,
} from "@/app/(auth)/chat/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", time = "", etiqueta = ""
let gerente = "", ana = "", bia = ""
let contatoAna = "", contatoBia = "", contatoSemDono = ""
let conversaAna = "", conversaBia = "", conversaSemDono = ""
const navegadores: Record<string, SupabaseClient> = {}

const novoCliente = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function criarUsuario(nome: string, role: string) {
  const email = `b21-01-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role })
  const navegador = novoCliente()
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  navegadores[id] = navegador
  return id
}

async function criarConversa(nome: string, sufixo: string, responsavel: string | null) {
  const contato = (await service.from("contacts")
    .insert({ workspace_id: empresa, name: nome, phone_number: `55219${sufixo}${String(ts).slice(-7)}` })
    .select("id").single()).data!.id
  const conversa = (await service.from("conversations")
    .insert({ workspace_id: empresa, contact_id: contato, assigned_to: responsavel, status: responsavel ? "em_atendimento" : "em_espera" })
    .select("id").single()).data!.id
  await service.from("messages").insert({ workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto", content: `segredo de ${nome}` })
  return { contato, conversa }
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Atendente B21 ${ts}` }).select("id").single()).data!.id
  gerente = await criarUsuario("gerente", "gerente")
  ana = await criarUsuario("ana", "atendente")
  bia = await criarUsuario("bia", "atendente")
  time = (await service.from("teams").insert({ workspace_id: empresa, name: "Entrada" }).select("id").single()).data!.id
  await service.from("user_teams").insert([{ user_id: ana, team_id: time }, { user_id: bia, team_id: time }])
  etiqueta = (await service.from("labels").insert({ workspace_id: empresa, name: "VIP", color: "#f00" }).select("id").single()).data!.id
  ;({ contato: contatoAna, conversa: conversaAna } = await criarConversa("Cliente da Ana", "1", ana))
  ;({ contato: contatoBia, conversa: conversaBia } = await criarConversa("Cliente da Bia", "2", bia))
  ;({ contato: contatoSemDono, conversa: conversaSemDono } = await criarConversa("Sem dono", "3", null))
}, 90_000)

afterAll(async () => {
  const conversas = [conversaAna, conversaBia, conversaSemDono]
  await service.from("conversation_labels").delete().in("conversation_id", conversas)
  await service.from("messages").delete().in("conversation_id", conversas)
  await service.from("conversations").delete().in("id", conversas)
  await service.from("contacts").delete().in("id", [contatoAna, contatoBia, contatoSemDono])
  await service.from("labels").delete().eq("id", etiqueta)
  await service.from("user_teams").delete().eq("team_id", time)
  await service.from("teams").delete().eq("id", time)
  await service.from("profiles").delete().eq("workspace_id", empresa)
  for (const id of [gerente, ana, bia]) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B21-01 — Atendente só alcança as conversas dele", { timeout: 40_000 }, () => {
  it("should deixar o atendente ler só as próprias conversas, mensagens e etiquetas no banco", async () => {
    await service.from("conversation_labels").insert({ conversation_id: conversaBia, label_id: etiqueta })
    const navAna = navegadores[ana]

    const { data: conversas } = await navAna.from("conversations").select("id").eq("workspace_id", empresa)
    expect((conversas ?? []).map((c) => c.id)).toEqual([conversaAna])

    const { data: mensagens } = await navAna.from("messages").select("content").eq("workspace_id", empresa)
    expect((mensagens ?? []).map((m) => m.content)).toEqual(["segredo de Cliente da Ana"])

    const { data: vinculos } = await navAna.from("conversation_labels").select("conversation_id").eq("conversation_id", conversaBia)
    expect(vinculos ?? []).toHaveLength(0)
  })

  it("should deixar a gerência ver todas as conversas da empresa, inclusive sem responsável", async () => {
    const { data } = await navegadores[gerente].from("conversations").select("id").eq("workspace_id", empresa)
    expect((data ?? []).map((c) => c.id).sort()).toEqual([conversaAna, conversaBia, conversaSemDono].sort())
  })

  it("should not deixar o atendente gravar mensagem falsa em conversa de colega pelo banco", async () => {
    const { error } = await navegadores[ana].from("messages").insert({
      workspace_id: empresa, conversation_id: conversaBia, direction: "enviada", type: "texto", content: "falsa",
    })
    expect(error).not.toBeNull()
    const { data } = await service.from("messages").select("id").eq("conversation_id", conversaBia).eq("content", "falsa")
    expect(data).toHaveLength(0)
  })

  it("should not deixar o atendente se pôr como responsável nem mexer em conversa de colega pelo banco", async () => {
    await navegadores[ana].from("conversations").update({ assigned_to: ana, status: "resolvida" }).eq("id", conversaBia)
    await navegadores[ana].from("conversations").update({ assigned_to: ana }).eq("id", conversaSemDono)
    const { data } = await service.from("conversations").select("id, assigned_to, status").in("id", [conversaBia, conversaSemDono])
    const porId = Object.fromEntries((data ?? []).map((c) => [c.id, c]))
    expect(porId[conversaBia]).toMatchObject({ assigned_to: bia, status: "em_atendimento" })
    expect(porId[conversaSemDono]).toMatchObject({ assigned_to: null })
  })

  it("should not deixar o atendente passar a própria conversa adiante nem trocar o contato dela pelo banco", async () => {
    const { error: erroDono } = await navegadores[ana].from("conversations").update({ assigned_to: bia }).eq("id", conversaAna)
    const { error: erroContato } = await navegadores[ana].from("conversations").update({ contact_id: contatoBia }).eq("id", conversaAna)
    expect(erroDono).not.toBeNull()
    expect(erroContato).not.toBeNull()
    const { data } = await service.from("conversations").select("assigned_to, contact_id").eq("id", conversaAna).single()
    expect(data).toEqual({ assigned_to: ana, contact_id: contatoAna })
  })

  it("should not deixar a gerência trocar o contato de uma conversa pelo banco", async () => {
    const { error } = await navegadores[gerente].from("conversations").update({ contact_id: contatoAna }).eq("id", conversaBia)
    expect(error).not.toBeNull()
    const { data } = await service.from("conversations").select("contact_id").eq("id", conversaBia).single()
    expect(data!.contact_id).toBe(contatoBia)
  })

  it("should recusar as ações do chat em conversa de colega", async () => {
    clienteDaVez = navegadores[ana]

    expect(await buscarMensagens(conversaBia)).toEqual([])
    expect((await enviarMensagem(conversaBia, "falsa pela action")).erro).toBeTruthy()
    expect((await aplicarEtiqueta(conversaBia, etiqueta)).erro).toBeTruthy()
    await resolverConversa(conversaBia).catch(() => {})
    await expect(reabrirConversa(conversaBia)).rejects.toThrow()
    await expect(transferirConversa(conversaBia, ana)).rejects.toThrow("Sem permissão para transferir conversa")

    const { data: conversa } = await service.from("conversations").select("assigned_to, status").eq("id", conversaBia).single()
    expect(conversa).toEqual({ assigned_to: bia, status: "em_atendimento" })
    const { data: mensagens } = await service.from("messages").select("content").eq("conversation_id", conversaBia)
    expect((mensagens ?? []).map((m) => m.content)).toEqual(["segredo de Cliente da Bia"])
  })

  it("should deixar o atendente agir na própria conversa e transferi-la para colega do time", async () => {
    clienteDaVez = navegadores[ana]

    expect((await buscarMensagens(conversaAna)).map((m) => m.conteudo)).toEqual(["segredo de Cliente da Ana"])
    expect(await aplicarEtiqueta(conversaAna, etiqueta)).toEqual({})
    await resolverConversa(conversaAna)
    expect(await reabrirConversa(conversaAna)).toEqual({ novoStatus: "em_atendimento" })

    expect(await transferirConversa(conversaAna, bia)).toEqual({ nomeAtribuido: "bia" })
    const { data } = await service.from("conversations").select("assigned_to").eq("id", conversaAna).single()
    expect(data!.assigned_to).toBe(bia)

    // Passou adiante: a Ana deixa de ver.
    const { data: visiveis } = await navegadores[ana].from("conversations").select("id").eq("id", conversaAna)
    expect(visiveis ?? []).toHaveLength(0)
  })
})
