// @vitest-environment node
// B36-04 — blocos novos do Dashboard: "Para hoje", "Esperando resposta" e o funil de
// Entrada por etapa, com o que cada papel vê. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarPainelDashboard, listarEsperandoResposta, listarParaHoje } from "@/app/(auth)/dashboard/actions"
import { listarMinhaAgenda, marcarLembreteFeito } from "@/app/(auth)/agenda/actions"

const mockSsr = vi.mocked(createSsrClient)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const usuarios: string[] = []
const navegadores: Record<string, SupabaseClient> = {}
let ws = "", adminId = "", anaId = "", caioId = ""
const contatos: Record<string, string> = {}
const conversas: Record<string, string> = {}
const lembretes: Record<string, string> = {}

const minutosAtras = (m: number) => new Date(Date.now() - m * 60000).toISOString()
const diasDaqui = (d: number) => new Date(Date.now() + d * 86400000).toISOString()
const entrarComo = (id: string) => mockSsr.mockResolvedValue(navegadores[id] as never)

async function criarUsuario(nome: string, role: string) {
  const email = `b36-04-${nome.toLowerCase()}-${ts}@teste.com`
  const { data } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
  await service.from("profiles").insert({ id: data.user!.id, workspace_id: ws, name: nome, role, status: "active" })
  usuarios.push(data.user!.id)
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  navegadores[data.user!.id] = c
  return data.user!.id
}

async function contato(nome: string, telefone: string) {
  const id = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: telefone }).select("id").single()).data!.id
  contatos[nome] = id
  return id
}

/** Conversa com mensagens em ordem; `responsavel` é quem atende. */
async function conversa(nome: string, responsavel: string, mensagens: Array<{ direcao: "recebida" | "enviada"; minutos: number; texto: string }>) {
  const contatoId = contatos[nome]
  const id = (await service.from("conversations").insert({ workspace_id: ws, contact_id: contatoId, assigned_to: responsavel, status: "em_atendimento" }).select("id").single()).data!.id
  conversas[nome] = id
  for (const m of mensagens) {
    await service.from("messages").insert({ workspace_id: ws, conversation_id: id, direction: m.direcao, type: "texto", content: m.texto, created_at: minutosAtras(m.minutos) })
  }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `B36-04 ${ts}` }).select("id").single()).data!.id
  adminId = await criarUsuario("Admin", "admin")
  anaId = await criarUsuario("Ana", "atendente")
  caioId = await criarUsuario("Caio", "atendente")

  await contato("Moda Sol", `5521911${String(ts).slice(-6)}`)
  await contato("Bella Kids", `5521922${String(ts).slice(-6)}`)
  await contato("Loja Dandara", `5521933${String(ts).slice(-6)}`)
  await contato("Rosa Caio", `5521944${String(ts).slice(-6)}`)

  // Cliente mandou por último há 40 e há 5 minutos; na terceira, o vendedor respondeu.
  await conversa("Moda Sol", anaId, [{ direcao: "recebida", minutos: 40, texto: "Tem no 44?" }])
  await conversa("Bella Kids", anaId, [{ direcao: "enviada", minutos: 30, texto: "Oi!" }, { direcao: "recebida", minutos: 5, texto: "Manda o catálogo?" }])
  await conversa("Loja Dandara", anaId, [{ direcao: "recebida", minutos: 50, texto: "Fechou" }, { direcao: "enviada", minutos: 45, texto: "Separando" }])
  await conversa("Rosa Caio", caioId, [{ direcao: "recebida", minutos: 20, texto: "Qual o mínimo?" }])

  // Funil de Entrada: 5 cards na primeira etapa (3 da Ana), 3 na segunda (da Ana), nenhum na terceira.
  // Um contato por card: o contato só tem um card por funil.
  const cards: Array<[string, string]> = [
    ["lead", anaId], ["lead", anaId], ["lead", anaId], ["lead", caioId], ["lead", caioId],
    ["sondagem", anaId], ["sondagem", anaId], ["sondagem", anaId],
  ]
  for (const [i, [etapa, atendente]] of cards.entries()) {
    const contatoDoCard = await contato(`Card ${i}`, `5521955${String(ts).slice(-5)}${i}`)
    const { error } = await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatoDoCard, funil: "entrada", etapa, atendente_id: atendente })
    if (error) throw new Error(error.message)
  }

  // Agenda da Ana: 2 atrasadas, 2 de hoje mais tarde e 1 de amanhã. Do Caio: 1 atrasada.
  const lembrete = async (chave: string, atendente: string, due: string) => {
    lembretes[chave] = (await service.from("reminders").insert({ workspace_id: ws, contact_id: contatos["Moda Sol"], atendente_id: atendente, instrucao: chave, due_at: due, status: "pendente", origem: "avulso" }).select("id").single()).data!.id
  }
  await lembrete("atrasada-1", anaId, minutosAtras(60 * 20))
  await lembrete("atrasada-2", anaId, minutosAtras(90))
  const hojeMaisTarde = new Date(); hojeMaisTarde.setUTCHours(26, 50, 0, 0) // 23h50 de Brasília (UTC-3)
  await lembrete("hoje-1", anaId, new Date(Math.max(hojeMaisTarde.getTime() - 86400000, Date.now() + 60000)).toISOString())
  await lembrete("hoje-2", anaId, new Date(Math.max(hojeMaisTarde.getTime() - 86400000, Date.now() + 120000)).toISOString())
  await lembrete("amanha", anaId, diasDaqui(1.5))
  await lembrete("caio-atrasada", caioId, minutosAtras(30))
}, 120_000)

afterAll(async () => {
  await service.from("reminders").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("messages").delete().eq("workspace_id", ws)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B36-04 — Blocos novos do Dashboard", { timeout: 60_000 }, () => {
  it("CA-B36-16: should contar os cards do funil de Entrada por etapa, na ordem, com as vazias", async () => {
    entrarComo(adminId)
    const painel = await buscarPainelDashboard({ periodo: "30d" })
    const etapas = painel!.funilEntrada
    expect(etapas.map((e) => e.id).slice(0, 3)).toEqual(["lead", "sondagem", "catalogo_enviado"])
    expect(etapas.slice(0, 3).map((e) => e.quantidade)).toEqual([5, 3, 0])
    expect(etapas.map((e) => e.id)).toEqual(["lead", "sondagem", "catalogo_enviado", "follow_catalogo", "negociacao", "nutricao", "ganho", "perdido"])
  })

  it("CA-B36-17: should mostrar em Para hoje as atrasadas primeiro e as de hoje, sem as de amanhã", async () => {
    entrarComo(anaId)
    const tarefas = await listarParaHoje()
    expect(tarefas.map((t) => t.instrucao)).toEqual(["atrasada-1", "atrasada-2", "hoje-1", "hoje-2"])
    expect(tarefas.filter((t) => t.atrasado)).toHaveLength(2)
  })

  it("CA-B36-18: should marcar como feita pelo Para hoje e a tarefa aparecer feita na Agenda", async () => {
    entrarComo(anaId)
    expect(await marcarLembreteFeito(lembretes["hoje-2"])).toEqual({})
    expect((await listarParaHoje()).map((t) => t.instrucao)).not.toContain("hoje-2")
    expect((await listarMinhaAgenda()).map((t) => t.instrucao)).not.toContain("hoje-2")
    const { data } = await service.from("reminders").select("status").eq("id", lembretes["hoje-2"]).single()
    expect(data!.status).toBe("feito")
  })

  it("CA-B36-19: should listar quem espera resposta, o mais antigo primeiro, sem a conversa respondida", async () => {
    entrarComo(adminId)
    const { conversas: lista } = await listarEsperandoResposta()
    const nomes = lista.map((c) => c.contatoNome)
    expect(nomes).toEqual(["Moda Sol", "Rosa Caio", "Bella Kids"])
    expect(nomes).not.toContain("Loja Dandara")
    expect(lista[0].conversaId).toBe(conversas["Moda Sol"])
  })

  it("CA-B36-20: should mostrar ao Atendente só os cards, as tarefas e as conversas dele nos blocos novos", async () => {
    entrarComo(anaId)
    const painel = await buscarPainelDashboard({ periodo: "30d", atendenteId: caioId })
    expect(painel!.funilEntrada.slice(0, 2).map((e) => e.quantidade)).toEqual([3, 3])
    expect((await listarParaHoje()).map((t) => t.instrucao)).not.toContain("caio-atrasada")
    const { conversas: lista } = await listarEsperandoResposta()
    expect(lista.map((c) => c.contatoNome)).toEqual(["Moda Sol", "Bella Kids"])
  })
})
