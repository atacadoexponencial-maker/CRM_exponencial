// @vitest-environment node
// B21-02 — atendente só alcança os cards e contatos dele (auditoria de 06/10/2026,
// rodada 3). Bate no Supabase real; o client SSR é trocado pelo "navegador" da vez.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
// As actions disparam automações e revalidam páginas; nada disso é o que se testa aqui.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", async (original) => ({
  ...(await original<typeof import("@/lib/automacoes/gatilhos-do-crm")>()),
  dispararTagAdicionada: vi.fn(),
}))

import { adicionarTagContato, buscarDadosContato, removerTagContato } from "@/app/(auth)/contatos/actions"
import { buscarContatosParaFollowUp, criarFollowUp } from "@/app/(auth)/agenda/actions"
import { adicionarNota, atribuirAtendente, buscarDadosPainel } from "@/app/(auth)/pipeline/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let empresa = "", outraEmpresa = "", sequencia = ""
let gerente = "", ana = "", bia = "", forasteiro = ""
let contatoAna = "", contatoBia = "", cardAna = "", cardBia = ""
const navegadores: Record<string, SupabaseClient> = {}

const novoCliente = () => createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function criarUsuario(ws: string, nome: string, role: string) {
  const email = `b21-02-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role })
  const navegador = novoCliente()
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  navegadores[id] = navegador
  return id
}

async function criarContatoComCard(nome: string, sufixo: string, atendente: string) {
  const contato = (await service.from("contacts")
    .insert({ workspace_id: empresa, name: nome, phone_number: `55218${sufixo}${String(ts).slice(-7)}` })
    .select("id").single()).data!.id
  const card = (await service.from("pipeline_cards")
    .insert({ workspace_id: empresa, contact_id: contato, etapa: "lead", atendente_id: atendente })
    .select("id").single()).data!.id
  await service.from("contact_tags").insert({ workspace_id: empresa, contact_id: contato, tag: `tag-${nome.toLowerCase().replace(/\s/g, "-")}` })
  await service.from("contact_purchases").insert({ workspace_id: empresa, contact_id: contato, data: "2026-10-01", valor: 100 })
  await service.from("pipeline_card_notes").insert({ workspace_id: empresa, card_id: card, texto: `nota de ${nome}`, autor_id: atendente })
  return { contato, card }
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Contatos B21 ${ts}` }).select("id").single()).data!.id
  outraEmpresa = (await service.from("workspaces").insert({ name: `Outra contatos B21 ${ts}` }).select("id").single()).data!.id
  gerente = await criarUsuario(empresa, "gerente", "gerente")
  ana = await criarUsuario(empresa, "ana", "atendente")
  bia = await criarUsuario(empresa, "bia", "atendente")
  forasteiro = await criarUsuario(outraEmpresa, "forasteiro", "atendente")
  sequencia = (await service.from("sequences").insert({ workspace_id: empresa, nome: "Seq B21" }).select("id").single()).data!.id
  ;({ contato: contatoAna, card: cardAna } = await criarContatoComCard("Cliente da Ana", "1", ana))
  ;({ contato: contatoBia, card: cardBia } = await criarContatoComCard("Cliente da Bia", "2", bia))
}, 90_000)

afterAll(async () => {
  const contatos = [contatoAna, contatoBia]
  await service.from("reminders").delete().in("contact_id", contatos)
  await service.from("sequence_runs").delete().in("contact_id", contatos)
  await service.from("sequences").delete().eq("id", sequencia)
  await service.from("pipeline_card_notes").delete().in("card_id", [cardAna, cardBia])
  await service.from("pipeline_card_history").delete().in("card_id", [cardAna, cardBia])
  await service.from("pipeline_cards").delete().in("id", [cardAna, cardBia])
  await service.from("contact_tags").delete().in("contact_id", contatos)
  await service.from("contact_purchases").delete().in("contact_id", contatos)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().in("workspace_id", [empresa, outraEmpresa])
  for (const id of [gerente, ana, bia, forasteiro]) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [empresa, outraEmpresa])
}, 60_000)

describe("B21-02 — Atendente só alcança os cards e contatos dele", { timeout: 40_000 }, () => {
  it("should deixar o atendente ler só os próprios contatos, tags, compras e notas no banco", async () => {
    const nav = navegadores[ana]
    const ids = async (tabela: string, coluna: string) =>
      ((await nav.from(tabela).select(coluna).eq("workspace_id", empresa)).data ?? []).map((r) => (r as unknown as Record<string, string>)[coluna])

    expect(await ids("contacts", "id")).toEqual([contatoAna])
    expect(await ids("contact_tags", "contact_id")).toEqual([contatoAna])
    expect(await ids("contact_purchases", "contact_id")).toEqual([contatoAna])
    expect(await ids("pipeline_card_notes", "card_id")).toEqual([cardAna])
    expect(await ids("pipeline_cards", "id")).toEqual([cardAna])
  })

  it("should deixar a gerência ver todos os contatos e notas da empresa", async () => {
    const { data: contatos } = await navegadores[gerente].from("contacts").select("id").eq("workspace_id", empresa)
    const { data: notas } = await navegadores[gerente].from("pipeline_card_notes").select("card_id").eq("workspace_id", empresa)
    expect((contatos ?? []).map((c) => c.id).sort()).toEqual([contatoAna, contatoBia].sort())
    expect((notas ?? []).map((n) => n.card_id).sort()).toEqual([cardAna, cardBia].sort())
  })

  it("should recusar perfil, tag, nota e painel de contato ou card de colega pelas actions", async () => {
    clienteDaVez = navegadores[ana]

    expect(await buscarDadosContato(contatoBia)).toBeNull()
    expect(await adicionarTagContato(contatoBia, "intrusa")).toEqual({ erro: "Contato não encontrado" })
    await removerTagContato(contatoBia, "tag-cliente-da-bia")
    await expect(adicionarNota(cardBia, "nota intrusa")).rejects.toThrow()
    expect(await buscarDadosPainel(cardBia)).toEqual({ historico: [], notas: [] })

    const { data: tags } = await service.from("contact_tags").select("tag").eq("contact_id", contatoBia)
    expect((tags ?? []).map((t) => t.tag)).toEqual(["tag-cliente-da-bia"])
    const { data: notas } = await service.from("pipeline_card_notes").select("texto").eq("card_id", cardBia)
    expect((notas ?? []).map((n) => n.texto)).toEqual(["nota de Cliente da Bia"])
  })

  it("should mostrar no Novo follow-up só os contatos dele e recusar follow-up para contato alheio", async () => {
    clienteDaVez = navegadores[ana]

    expect((await buscarContatosParaFollowUp("Cliente")).map((c) => c.id)).toEqual([contatoAna])
    expect(await criarFollowUp({ contactId: contatoBia, data: "2026-12-01", nota: "intruso" })).toEqual({ erro: "Contato não encontrado" })

    const { error } = await navegadores[ana].from("reminders").insert({
      workspace_id: empresa, contact_id: contatoBia, atendente_id: ana, origem: "avulso", instrucao: "x", due_at: new Date().toISOString(),
    })
    expect(error).not.toBeNull()
    const { error: emNomeDeOutro } = await navegadores[ana].from("reminders").insert({
      workspace_id: empresa, contact_id: contatoAna, atendente_id: bia, origem: "avulso", instrucao: "x", due_at: new Date().toISOString(),
    })
    expect(emNomeDeOutro).not.toBeNull()
    const { data } = await service.from("reminders").select("id").eq("contact_id", contatoBia)
    expect(data).toHaveLength(0)
  })

  it("should not deixar o atendente mexer em card alheio nem trocar atendente ou contato do próprio card pelo banco", async () => {
    const nav = navegadores[ana]
    await nav.from("pipeline_cards").update({ etapa: "perdido" }).eq("id", cardBia)
    const { error: trocaAtendente } = await nav.from("pipeline_cards").update({ atendente_id: bia }).eq("id", cardAna)
    const { error: trocaContato } = await nav.from("pipeline_cards").update({ contact_id: contatoBia }).eq("id", cardAna)
    expect(trocaAtendente).not.toBeNull()
    expect(trocaContato).not.toBeNull()

    const { data } = await service.from("pipeline_cards").select("id, etapa, atendente_id, contact_id").in("id", [cardAna, cardBia])
    const porId = Object.fromEntries((data ?? []).map((c) => [c.id, c]))
    expect(porId[cardBia]).toMatchObject({ etapa: "lead", atendente_id: bia })
    expect(porId[cardAna]).toMatchObject({ atendente_id: ana, contact_id: contatoAna })
  })

  it("should not deixar o atendente criar contato nem iniciar sequência para contato alheio pelo banco", async () => {
    const nav = navegadores[ana]
    const { error: contato } = await nav.from("contacts").insert({ workspace_id: empresa, name: "Novo", phone_number: `55217${String(ts).slice(-8)}` })
    expect(contato).not.toBeNull()
    const { error: execucao } = await nav.from("sequence_runs").insert({ workspace_id: empresa, sequence_id: sequencia, contact_id: contatoBia, atendente_id: ana })
    expect(execucao).not.toBeNull()
  })

  it("should deixar o atendente agir no que é dele", async () => {
    clienteDaVez = navegadores[ana]

    const perfil = await buscarDadosContato(contatoAna)
    expect(perfil?.nome).toBe("Cliente da Ana")
    expect(await adicionarTagContato(contatoAna, "propria")).toEqual({})
    await adicionarNota(cardAna, "nota própria")
    expect((await buscarDadosPainel(cardAna)).notas.map((n) => n.texto)).toEqual(["nota de Cliente da Ana", "nota própria"])
    expect(await criarFollowUp({ contactId: contatoAna, data: "2026-12-01", nota: "ligar" })).toEqual({})
  })

  it("should deixar a gerência reatribuir o card só para alguém da empresa", async () => {
    clienteDaVez = navegadores[gerente]

    await expect(atribuirAtendente(cardBia, forasteiro)).rejects.toThrow("Atendente não encontrado")
    await atribuirAtendente(cardBia, ana)
    const { data } = await service.from("pipeline_cards").select("atendente_id").eq("id", cardBia).single()
    expect(data!.atendente_id).toBe(ana)
  })
})
