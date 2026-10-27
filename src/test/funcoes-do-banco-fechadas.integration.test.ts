// @vitest-environment node
// B44-11 — funções do banco que respondiam a qualquer um ficam só para o CRM
// (auditoria de 27/10/2026). Bate no Supabase real: visitante sem login, usuário de
// outra empresa e o Gerente usando a lixeira e o funil como sempre.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// Mover o card dispara automações; nada disso é o que se testa aqui.
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))

import { listarLixeira, restaurarContato } from "@/app/(auth)/contatos/lixeira/actions"
import { moverCard } from "@/app/(auth)/pipeline/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresaA = "", empresaB = "", gerenteA = ""
let contatoB = "", conversaB = "", contatoNaLixeiraA = "", conversaDoContatoA = "", contatoComCard = "", card = ""
const usuarios: string[] = []
let navegadorA: SupabaseClient
const visitante = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const contato = async (empresa: string, nome: string, extra: Record<string, unknown> = {}) =>
  (await service.from("contacts").insert({ workspace_id: empresa, name: nome, phone_number: `55${String(Math.floor(Math.random() * 1e11)).padStart(11, "1")}`, ...extra }).select("id").single()).data!.id
const classificacaoDe = async (id: string) => (await service.from("contacts").select("classificacao").eq("id", id).single()).data?.classificacao

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-11 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-11 B ${ts}` }).select("id").single()).data!.id
  const email = `b44-11-gerente-${ts}@teste.com`
  gerenteA = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(gerenteA)
  await service.from("profiles").insert({ id: gerenteA, workspace_id: empresaA, name: "Gerente A", role: "gerente" })
  navegadorA = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegadorA.auth.signInWithPassword({ email, password: SENHA })
  clienteDaVez = navegadorA

  contatoB = await contato(empresaB, "Cliente da B", { excluido_em: new Date().toISOString() })
  conversaB = (await service.from("conversations").insert({ workspace_id: empresaB, contact_id: contatoB }).select("id").single()).data!.id
  contatoNaLixeiraA = await contato(empresaA, "Cliente na lixeira", { excluido_em: new Date().toISOString(), excluido_por: gerenteA })
  conversaDoContatoA = (await service.from("conversations").insert({ workspace_id: empresaA, contact_id: contatoNaLixeiraA }).select("id").single()).data!.id
  contatoComCard = await contato(empresaA, "Cliente com card")
  card = (await service.from("pipeline_cards").insert({ workspace_id: empresaA, contact_id: contatoComCard, funil: "recompra", etapa: "onboarding" }).select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  for (const empresa of [empresaA, empresaB]) {
    await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
    await service.from("conversations").delete().eq("workspace_id", empresa)
    await service.from("contacts").delete().eq("workspace_id", empresa)
  }
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

describe("B44-11 — Funções do banco fechadas ao público", { timeout: 30_000 }, () => {
  it("CA-B44-39: should recusar as três funções para o visitante sem login", async () => {
    const chamadas = await Promise.all([
      visitante.rpc("contato_na_lixeira", { p_contact_id: contatoB }),
      visitante.rpc("conversa_na_lixeira", { p_conversation_id: conversaB }),
      visitante.rpc("recalcular_classificacao_do_contato", { p_contact: contatoB }),
    ])
    for (const { error } of chamadas) expect(error).not.toBeNull()
  })

  it("CA-B44-40: should not contar ao usuário de outra empresa nada sobre o contato da B", async () => {
    const antes = await classificacaoDe(contatoB)

    const lixeiraContato = await navegadorA.rpc("contato_na_lixeira", { p_contact_id: contatoB })
    const lixeiraConversa = await navegadorA.rpc("conversa_na_lixeira", { p_conversation_id: conversaB })
    const recalculo = await navegadorA.rpc("recalcular_classificacao_do_contato", { p_contact: contatoB })

    expect(lixeiraContato.error ?? lixeiraContato.data).not.toBe(true)
    expect(lixeiraConversa.error ?? lixeiraConversa.data).not.toBe(true)
    expect(recalculo.error).not.toBeNull()
    expect(await classificacaoDe(contatoB)).toBe(antes)
  })

  it("CA-B44-41: should continuar mostrando e restaurando a lixeira e mudando a classificação pelo card", async () => {
    expect((await listarLixeira()).map((i) => i.id)).toContain(contatoNaLixeiraA)
    const { data: escondida } = await navegadorA.from("conversations").select("id").eq("id", conversaDoContatoA)
    expect(escondida).toEqual([])

    expect(await restaurarContato(contatoNaLixeiraA)).toEqual({ ok: true })
    expect((await listarLixeira()).map((i) => i.id)).not.toContain(contatoNaLixeiraA)
    const { data: deVolta } = await navegadorA.from("conversations").select("id").eq("id", conversaDoContatoA)
    expect(deVolta).toEqual([{ id: conversaDoContatoA }])

    expect(await classificacaoDe(contatoComCard)).toBe("ativo")
    await moverCard(card, "perdidos")
    expect(await classificacaoDe(contatoComCard)).toBe("perdido")
  })
})
