// @vitest-environment node
// B45-03 — o atendente vê os contatos e as conversas dele e os sem dono (fila aberta),
// e quem responde uma conversa sem responsável vira o dono. Bate no Supabase real: o
// client SSR é o "navegador" de quem age. Só o envio ao WhatsApp é falso.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
  transmitirContatoRestaurado: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(async () => ({
    canal: "meta",
    enviarTexto: async () => ({ ok: true, mensagemId: `wamid.b45-03.${Math.random()}` }),
  })),
}))

import { listarContatos, buscarDadosContato } from "@/app/(auth)/contatos/actions"
import { listarConversas } from "@/app/(auth)/chat/conversas"
import { atribuirConversa, enviarMensagem } from "@/app/(auth)/chat/actions"
import { atribuirAtendente } from "@/app/(auth)/pipeline/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const fim = String(ts).slice(-6)
const SENHA = "senha-segura-123"
let ws = "", adminId = "", atendenteId = "", brunoId = ""
const navegadores: Record<string, SupabaseClient> = {}
type Contato = { id: string; card: string; conversa: string }
let ana: Contato, luan: Contato, carla: Contato, davi: Contato
let telefone = 0

async function criarPessoa(nome: string, role: string) {
  const email = `b45-03-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role, status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = navegador
  return id
}
const entrarComo = (id: string) => { clienteDaVez = navegadores[id] }

/** Contato com um dono só: o mesmo no contato, no card da Entrada e na conversa. */
async function contatoDe(nome: string, dono: string | null): Promise<Contato> {
  telefone += 1
  const id = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55819${fim}${String(telefone).padStart(2, "0")}`, atendente_id: dono }).select("id").single()).data!.id
  const card = (await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: id, funil: "entrada", etapa: "lead", atendente_id: dono }).select("id").single()).data!.id
  const conversa = (await service.from("conversations").insert({ workspace_id: ws, contact_id: id, assigned_to: dono, status: dono ? "em_atendimento" : "em_espera" }).select("id").single()).data!.id
  return { id, card, conversa }
}

const conversasDe = async (id: string) =>
  (await listarConversas(navegadores[id] as never, { workspaceId: ws, papel: "atendente", userId: id })).map((c) => c.id)

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B45-03 ${ts}` }).select("id").single()).data!.id
  adminId = await criarPessoa("Admin", "admin")
  atendenteId = await criarPessoa("Atendente", "atendente")
  brunoId = await criarPessoa("Bruno", "atendente")
  ana = await contatoDe("Ana", atendenteId)
  luan = await contatoDe("Luan", atendenteId)
  carla = await contatoDe("Carla", brunoId)
  davi = await contatoDe("Davi", null)
  await service.from("contact_tags").insert({ workspace_id: ws, contact_id: carla.id, tag: "vip" })
  await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: carla.id, data: "2026-10-10", valor: 300 })
  await service.from("pipeline_card_notes").insert({ workspace_id: ws, card_id: carla.card, autor_id: brunoId, texto: "Nota da Carla" })
}, 90_000)

afterAll(async () => {
  await service.from("carteira_historico").delete().eq("workspace_id", ws)
  const { data: conversas } = await service.from("conversations").select("id").eq("workspace_id", ws)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().eq("workspace_id", ws)
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  for (const id of [adminId, atendenteId, brunoId]) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().eq("id", ws)
}, 90_000)

describe("B45-03 — O atendente vê os dele e os sem dono", { timeout: 60_000 }, () => {
  it("CA-B45-12: should mostrar em Contatos a Ana, o Luan e o Davi, e não a Carla", async () => {
    entrarComo(atendenteId)
    const nomes = (await listarContatos()).map((c) => c.nome).sort()
    expect(nomes).toEqual(["Ana", "Davi", "Luan"])
  })

  it("CA-B45-13: should não abrir o perfil da Carla nem devolver as tags, compras e notas dela", async () => {
    entrarComo(atendenteId)
    expect(await buscarDadosContato(carla.id)).toBeNull()

    // Elas existem: quem pode ver (o banco, sem regra) acha uma de cada
    const existem = await Promise.all([
      service.from("contact_tags").select("tag").eq("contact_id", carla.id),
      service.from("contact_purchases").select("id").eq("contact_id", carla.id),
      service.from("pipeline_card_notes").select("id").eq("card_id", carla.card),
    ])
    expect(existem.map((r) => r.data?.length)).toEqual([1, 1, 1])

    const navegador = navegadores[atendenteId]
    const [tags, compras, notas] = await Promise.all([
      navegador.from("contact_tags").select("tag").eq("contact_id", carla.id),
      navegador.from("contact_purchases").select("id").eq("contact_id", carla.id),
      navegador.from("pipeline_card_notes").select("id").eq("card_id", carla.card),
    ])
    expect([tags.data, compras.data, notas.data]).toEqual([[], [], []])
  })

  it("CA-B45-14: should mostrar no Chat as conversas da Ana e do Davi, e não a da Carla", async () => {
    const conversas = await conversasDe(atendenteId)
    expect(conversas).toEqual(expect.arrayContaining([ana.conversa, davi.conversa]))
    expect(conversas).not.toContain(carla.conversa)
  })

  it("CA-B45-15: should recusar o Atendente Teste atribuindo a conversa ou o card do Davi a si mesmo", async () => {
    entrarComo(atendenteId)
    await expect(atribuirConversa(davi.conversa, atendenteId)).rejects.toThrow("Sem permissão")
    await expect(atribuirAtendente(davi.card, atendenteId)).rejects.toThrow("Sem permissão")

    const { data: contato } = await service.from("contacts").select("atendente_id").eq("id", davi.id).single()
    const { data: conversa } = await service.from("conversations").select("assigned_to").eq("id", davi.conversa).single()
    const { data: card } = await service.from("pipeline_cards").select("atendente_id").eq("id", davi.card).single()
    expect([contato?.atendente_id, conversa?.assigned_to, card?.atendente_id]).toEqual([null, null, null])
  })

  it("CA-B45-20: should fazer do Atendente Teste o dono do Davi ao responder a conversa sem responsável, e tirá-la do Chat do Bruno", async () => {
    expect(await conversasDe(brunoId)).toContain(davi.conversa)
    entrarComo(atendenteId)

    const r = await enviarMensagem(davi.conversa, "Oi, Davi! Posso ajudar?")
    expect(r.erro).toBeUndefined()

    const { data: contato } = await service.from("contacts").select("atendente_id").eq("id", davi.id).single()
    const { data: conversa } = await service.from("conversations").select("assigned_to").eq("id", davi.conversa).single()
    const { data: card } = await service.from("pipeline_cards").select("atendente_id").eq("id", davi.card).single()
    expect([contato?.atendente_id, conversa?.assigned_to, card?.atendente_id]).toEqual([atendenteId, atendenteId, atendenteId])
    const { data: historico } = await service.from("carteira_historico").select("de_atendente_id, para_atendente_id, motivo").eq("contact_id", davi.id)
    expect(historico).toEqual([{ de_atendente_id: null, para_atendente_id: atendenteId, motivo: "pelo_chat" }])
    expect(await conversasDe(brunoId)).not.toContain(davi.conversa)
  })
})
