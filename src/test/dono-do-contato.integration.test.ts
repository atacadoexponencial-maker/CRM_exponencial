// @vitest-environment node
// B45-02 — um dono só para o contato, os cards e as conversas. Bate no Supabase real:
// o client SSR é o "navegador" de quem age; a automação roda com a chave de serviço.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))

import { atribuirConversa, transferirConversa } from "@/app/(auth)/chat/actions"
import { atribuirAtendente } from "@/app/(auth)/pipeline/actions"
import { removerCarteira, transferirCarteira } from "@/app/(auth)/relatorios/actions"
import { executarAcao } from "@/lib/automacoes/acoes"
import type { ServiceClient } from "@/lib/automacoes/contexto"
import type { BlocoAcao } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const fim = String(ts).slice(-6)
const SENHA = "senha-segura-123"
let ws = "", timeId = "", adminId = "", atendenteId = "", brunoId = ""
const navegadores: Record<string, SupabaseClient> = {}
let telefone = 0

async function criarPessoa(nome: string, role: string) {
  const email = `b45-02-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role, status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = navegador
  return id
}
const entrarComo = (id: string) => { clienteDaVez = navegadores[id] }

/** Contato com card na Entrada (e, se pedido, na Recompra) e uma conversa. */
async function contatoCom(nome: string, { dono = null, naConversa = null, recompra = false }: { dono?: string | null; naConversa?: string | null; recompra?: boolean } = {}) {
  telefone += 1
  const id = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55719${fim}${String(telefone).padStart(2, "0")}`, atendente_id: dono }).select("id").single()).data!.id
  const entrada = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: id, funil: "entrada", etapa: "lead", atendente_id: dono }).select("id").single()).data!.id
  if (recompra) await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: id, funil: "recompra", etapa: "ativos", atendente_id: dono })
  const conversa = (await service.from("conversations").insert({ workspace_id: ws, contact_id: id, assigned_to: naConversa, status: naConversa ? "em_atendimento" : "em_espera" }).select("id").single()).data!.id
  return { id, entrada, conversa }
}

async function donos(contactId: string) {
  const [{ data: contato }, { data: cards }, { data: conversas }] = await Promise.all([
    service.from("contacts").select("atendente_id").eq("id", contactId).single(),
    service.from("pipeline_cards").select("atendente_id").eq("contact_id", contactId),
    service.from("conversations").select("assigned_to").eq("contact_id", contactId),
  ])
  return {
    contato: contato!.atendente_id,
    cards: (cards ?? []).map((c) => c.atendente_id),
    conversas: (conversas ?? []).map((c) => c.assigned_to),
  }
}

const historicoDe = async (contactId: string) =>
  (await service.from("carteira_historico").select("de_atendente_id, para_atendente_id, motivo").eq("contact_id", contactId).order("created_at")).data ?? []

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B45-02 ${ts}` }).select("id").single()).data!.id
  adminId = await criarPessoa("Admin", "admin")
  atendenteId = await criarPessoa("Atendente", "atendente")
  brunoId = await criarPessoa("Bruno", "atendente")
  timeId = (await service.from("teams").insert({ workspace_id: ws, name: "Entrada" }).select("id").single()).data!.id
  await service.from("user_teams").insert([{ user_id: atendenteId, team_id: timeId }, { user_id: brunoId, team_id: timeId }])
}, 90_000)

afterAll(async () => {
  await service.from("carteira_historico").delete().eq("workspace_id", ws)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("user_teams").delete().eq("team_id", timeId)
  await service.from("teams").delete().eq("workspace_id", ws)
  for (const id of [adminId, atendenteId, brunoId]) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", ws)
}, 90_000)

describe("B45-02 — Um dono só para contato, cards e conversas", { timeout: 60_000 }, () => {
  it("CA-B45-06: should fazer do Atendente Teste o dono do Luan, dos dois cards e registrar no histórico ao atribuir a conversa no Chat", async () => {
    const luan = await contatoCom("Luan", { recompra: true })
    entrarComo(adminId)

    await atribuirConversa(luan.conversa, atendenteId)

    expect(await donos(luan.id)).toEqual({ contato: atendenteId, cards: [atendenteId, atendenteId], conversas: [atendenteId] })
    expect(await historicoDe(luan.id)).toEqual([{ de_atendente_id: null, para_atendente_id: atendenteId, motivo: "pelo_chat" }])
  })

  it("CA-B45-07: should passar o Luan, os cards e a conversa para o Bruno quando o Atendente Teste transfere a conversa", async () => {
    const luan = await contatoCom("Luan 2", { dono: atendenteId, naConversa: atendenteId })
    entrarComo(atendenteId)

    await transferirConversa(luan.conversa, brunoId)

    expect(await donos(luan.id)).toEqual({ contato: brunoId, cards: [brunoId], conversas: [brunoId] })
    expect(await historicoDe(luan.id)).toEqual([{ de_atendente_id: atendenteId, para_atendente_id: brunoId, motivo: "pelo_chat" }])
  })

  it("CA-B45-08: should levar o card da Recompra e a conversa junto quando o Admin escolhe o atendente do card da Entrada", async () => {
    const ana = await contatoCom("Ana", { dono: brunoId, naConversa: brunoId, recompra: true })
    entrarComo(adminId)

    await atribuirAtendente(ana.entrada, atendenteId)

    expect(await donos(ana.id)).toEqual({ contato: atendenteId, cards: [atendenteId, atendenteId], conversas: [atendenteId] })
  })

  it("CA-B45-09: should levar cards e conversas ao transferir a carteira, e deixar tudo sem dono ao remover", async () => {
    const ana = await contatoCom("Ana 3", { dono: brunoId, naConversa: brunoId })
    const luan = await contatoCom("Luan 3", { dono: brunoId, naConversa: brunoId })
    entrarComo(adminId)

    // Esvazia a carteira do Bruno de contatos dos outros testes antes de conferir
    expect((await transferirCarteira(brunoId, atendenteId)).erro).toBeUndefined()
    expect(await donos(ana.id)).toEqual({ contato: atendenteId, cards: [atendenteId], conversas: [atendenteId] })
    expect(await donos(luan.id)).toEqual({ contato: atendenteId, cards: [atendenteId], conversas: [atendenteId] })

    // Remover a Ana: só ela na carteira de quem a recebe
    await service.from("contacts").update({ atendente_id: brunoId }).eq("id", ana.id)
    expect((await removerCarteira(brunoId)).erro).toBeUndefined()
    expect(await donos(ana.id)).toEqual({ contato: null, cards: [null], conversas: [null] })
    expect((await donos(luan.id)).contato).toBe(atendenteId)
  })

  it("CA-B45-10: should passar a Ana, os cards e a conversa para o Atendente Teste quando a automação atribui atendente", async () => {
    const ana = await contatoCom("Ana 4", { dono: brunoId, naConversa: brunoId, recompra: true })
    const bloco: BlocoAcao = { id: "a", tipo: "acao", acao: "atribuir_atendente", parametros: { atendente_id: atendenteId }, posicao: { x: 0, y: 0 } }
    const contexto = {
      supabase: service as unknown as ServiceClient,
      gatilho: { tipo: "card_movido" as const, workspaceId: ws, contactId: ana.id, cardId: ana.entrada, funil: "entrada", etapa: "lead" },
    }

    expect(await executarAcao(contexto, bloco)).toEqual({ ok: true })

    expect(await donos(ana.id)).toEqual({ contato: atendenteId, cards: [atendenteId, atendenteId], conversas: [atendenteId] })
  })

  it("CA-B45-11: should fazer do atendente da conversa o dono do contato sem dono, e passar a conversa ao dono do contato que já tem dono", async () => {
    const luan = await contatoCom("Luan antigo", { naConversa: atendenteId })
    const ana = await contatoCom("Ana antiga", { dono: brunoId, naConversa: atendenteId })

    const { error } = await service.rpc("alinhar_donos_dos_contatos", { p_workspace_id: ws })
    expect(error).toBeNull()

    expect(await donos(luan.id)).toEqual({ contato: atendenteId, cards: [atendenteId], conversas: [atendenteId] })
    expect(await donos(ana.id)).toEqual({ contato: brunoId, cards: [brunoId], conversas: [brunoId] })
  })
})
