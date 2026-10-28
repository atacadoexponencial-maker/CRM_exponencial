// @vitest-environment node
// B41-04 — funis da empresa nas automações, de ponta a ponta no Supabase real: o
// gatilho e a condição de etapa, a ação "Mover card", a conferência ao salvar e ao
// ligar, e o que acontece com a automação quando o funil ou a etapa é apagado.
// Fora de uma requisição, a fila das automações roda na hora (fila.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { carregarOpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/opcoes-editor"
import { referenciasQueSumiram } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { resumoRegra } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
import { apagarEtapa, apagarFunil, automacoesQueUsam, criarFunil, editarEtapa, renomearFunil } from "@/app/(auth)/configuracoes/funis/actions"
import { adicionarContatoAoFunil, moverCard } from "@/app/(auth)/pipeline/actions"
import { executarAcao } from "@/lib/automacoes/acoes"
import { verificacaoVale } from "@/lib/automacoes/verificacoes"
import type { ServiceClient } from "@/lib/automacoes/contexto"
import type { BlocoAcao, Fluxo } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const posicao = { x: 0, y: 0 }

let ws = "", wsB = ""
const usuarios: string[] = []
const clientes: Record<string, SupabaseClient> = {}
const contatos: Record<string, string> = {}
let feira = ""
const etapa: Record<string, string> = {}
const regras: Record<string, string> = {}

async function criarPessoa(chave: string, role: string) {
  const email = `b41-04-${chave}-${ts}@funis-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: chave, role, status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[chave] = c
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

const gatilhoEAcao = (gatilho: Record<string, string>, acao: BlocoAcao["acao"], parametros: Record<string, string>): Fluxo => ({
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "card_movido", parametros: gatilho, posicao },
    { id: "a", tipo: "acao", acao, parametros, posicao },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
})

async function novaRegra(chave: string, nome: string, fluxo: Fluxo) {
  como("admin")
  const r = await salvarRegra({ id: null, nome, fluxo, repeticao: { modo: "sempre" } })
  expect(r.erro).toBeUndefined()
  regras[chave] = r.id!
  // B48-08: a regra nova nasce desligada
  como("admin")
  expect(await alternarRegra(r.id!, true)).toEqual({})
}

const temTag = async (contato: string, tag: string) =>
  ((await service.from("contact_tags").select("tag").eq("contact_id", contato).eq("tag", tag)).data ?? []).length > 0
const cardDe = async (contato: string, funil: string) =>
  (await service.from("pipeline_cards").select("id, etapa").eq("contact_id", contato).eq("funil", funil).maybeSingle()).data
const ativa = async (chave: string) => (await service.from("automation_flows").select("ativa").eq("id", regras[chave]).single()).data!.ativa
const contexto = (contato: string) => ({
  supabase: service as unknown as ServiceClient,
  gatilho: { tipo: "card_movido" as const, workspaceId: ws, contactId: contato, cardId: "00000000-0000-4000-8000-000000000000", funil: "entrada", etapa: "lead" },
})

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B41-04 ${ts}` }).select("id").single()).data!.id
  wsB = (await service.from("workspaces").insert({ name: `[TESTE] B41-04 B ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin")
  await criarPessoa("gerente", "gerente")
  for (const [i, nome] of ["um", "dois", "tres", "quatro"].entries()) {
    contatos[nome] = (await service.from("contacts").insert({ workspace_id: ws, name: `Contato ${nome}`, phone_number: `55519${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id
  }
  await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatos.tres, funil: "entrada", etapa: "lead" })

  como("admin")
  const r = await criarFunil("Feira de Março", [{ nome: "Convidado" }, { nome: "Confirmou" }, { nome: "Visitou o estande" }])
  feira = r.id!
  const { data } = await service.from("funil_etapas").select("id, ordem").eq("funil_id", feira)
  const [convidado, confirmou, visitou] = [...data!].sort((a, b) => a.ordem - b.ordem)
  Object.assign(etapa, { convidado: convidado.id, confirmou: confirmou.id, visitou: visitou.id })
}, 120_000)

afterAll(async () => {
  for (const w of [ws, wsB]) {
    await service.from("automation_runs").delete().eq("workspace_id", w)
    await service.from("automation_queue").delete().eq("workspace_id", w)
    await service.from("automation_flows").delete().eq("workspace_id", w)
    await service.from("contact_tags").delete().eq("workspace_id", w)
    await service.from("pipeline_cards").delete().eq("workspace_id", w)
    await service.from("funis").delete().eq("workspace_id", w)
    await service.from("contacts").delete().eq("workspace_id", w)
    await service.from("profiles").delete().eq("workspace_id", w)
  }
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [ws, wsB])
}, 120_000)

describe("B41-04 — Funis da empresa nas automações", { timeout: 90_000 }, () => {
  it("CA-B41-33: should recusar salvar com etapa de outro funil, funil de outra empresa ou funil apagado", async () => {
    como("admin")
    const salvar = (fluxo: Fluxo) => salvarRegra({ id: null, nome: "Recusada", fluxo, repeticao: { modo: "sempre" } })

    expect((await salvar(gatilhoEAcao({ funil: feira, etapa: "lead" }, "adicionar_tag", { tag: "x" }))).erro).toBeTruthy()

    const deB = (await service.from("funis").insert({ workspace_id: wsB, nome: "Da B" }).select("id").single()).data!.id
    const etapaB = (await service.from("funil_etapas").insert({ funil_id: deB, workspace_id: wsB, nome: "Etapa B", ordem: 0 }).select("id").single()).data!.id
    expect((await salvar(gatilhoEAcao({ funil: deB, etapa: etapaB }, "adicionar_tag", { tag: "x" }))).erro).toContain("precisa de ajuste")

    const apagado = await criarFunil("Apagado", [{ nome: "Só" }])
    const etapaApagada = (await service.from("funil_etapas").select("id").eq("funil_id", apagado.id!).single()).data!.id
    await service.from("funis").delete().eq("id", apagado.id!)
    expect((await salvar(gatilhoEAcao({ funil: "entrada", etapa: "lead" }, "mover_card", { funil: apagado.id!, etapa: etapaApagada }))).erro).toBe(
      'O bloco "Mover card para etapa" precisa de ajuste: o funil ou a etapa escolhida foi apagada. Escolha de novo.'
    )
    expect((await service.from("automation_flows").select("id").eq("workspace_id", ws)).data).toEqual([])
  })

  it("CA-B41-30: should rodar a automação quando uma pessoa move o card para a etapa, e só então", async () => {
    await novaRegra("tag", "Confirmou na feira", gatilhoEAcao({ funil: feira, etapa: etapa.confirmou }, "adicionar_tag", { tag: "confirmou-feira" }))
    await novaRegra("leva", "Sondagem leva à feira", gatilhoEAcao({ funil: "entrada", etapa: "sondagem" }, "mover_card", { funil: feira, etapa: etapa.confirmou }))

    como("gerente")
    expect((await adicionarContatoAoFunil(feira, contatos.um)).erro).toBeUndefined()
    expect((await adicionarContatoAoFunil(feira, contatos.dois)).erro).toBeUndefined()
    expect(await temTag(contatos.um, "confirmou-feira")).toBe(false)

    await moverCard((await cardDe(contatos.um, feira))!.id, etapa.confirmou)
    expect(await temTag(contatos.um, "confirmou-feira")).toBe(true)

    await moverCard((await cardDe(contatos.dois, feira))!.id, etapa.visitou)
    expect(await temTag(contatos.dois, "confirmou-feira")).toBe(false)

    // Quem moveu para "Confirmou" foi outra automação: a de tag não roda (regra da B11)
    await moverCard((await cardDe(contatos.tres, "entrada"))!.id, "sondagem")
    expect((await cardDe(contatos.tres, feira))?.etapa).toBe(etapa.confirmou)
    expect(await temTag(contatos.tres, "confirmou-feira")).toBe(false)
  })

  it("CA-B41-31: should conferir a etapa do funil da empresa na condição", async () => {
    const v = { id: "v", tipo: "card_etapa" as const, operador: "esta_em", valor: `${feira}:${etapa.confirmou}` }
    expect(await verificacaoVale(contexto(contatos.um), v)).toBe(true)
    expect(await verificacaoVale(contexto(contatos.quatro), v)).toBe(false)
    expect(await verificacaoVale(contexto(contatos.dois), v)).toBe(false)
  })

  it("CA-B41-32: should criar o card na etapa ou mover o que existe, com histórico e sem disparar outra automação", async () => {
    const naFila = async () => ((await service.from("automation_queue").select("id").eq("workspace_id", ws)).data ?? []).length
    const antes = await naFila()
    const mover = (para: string): BlocoAcao => ({ id: "a", tipo: "acao", acao: "mover_card", parametros: { funil: feira, etapa: para }, posicao })

    expect(await executarAcao(contexto(contatos.quatro), mover(etapa.convidado))).toEqual({ ok: true })
    expect((await cardDe(contatos.quatro, feira))?.etapa).toBe(etapa.convidado)

    expect(await executarAcao(contexto(contatos.quatro), mover(etapa.confirmou))).toEqual({ ok: true })
    const card = (await cardDe(contatos.quatro, feira))!
    expect(card.etapa).toBe(etapa.confirmou)
    const { data: hist } = await service.from("pipeline_card_history").select("de_etapa, para_etapa, alterado_por").eq("card_id", card.id)
    expect(hist).toEqual([{ de_etapa: etapa.convidado, para_etapa: etapa.confirmou, alterado_por: null }])

    expect(await naFila()).toBe(antes)
    expect(await temTag(contatos.quatro, "confirmou-feira")).toBe(false)
  })

  it("CA-B41-06: should manter cards e automação funcionando depois de renomear o funil e a etapa", async () => {
    como("admin")
    expect((await renomearFunil(feira, "Feira de Abril")).erro).toBeUndefined()
    expect((await editarEtapa(etapa.confirmou, { nome: "Confirmado" })).erro).toBeUndefined()
    expect((await cardDe(contatos.um, feira))?.etapa).toBe(etapa.confirmou)

    expect(await alternarRegra(regras.tag, true)).toEqual({})
    await moverCard((await cardDe(contatos.dois, feira))!.id, etapa.confirmou)
    expect(await temTag(contatos.dois, "confirmou-feira")).toBe(true)

    const opcoes = await carregarOpcoesEditor(clientes.admin as never, ws)
    const { data } = await service.from("automation_flows").select("fluxo").eq("id", regras.tag).single()
    expect(resumoRegra(data!.fluxo as unknown as Fluxo, opcoes)).toContain('Quando o card entrar em "Confirmado" (Feira de Abril)')
  })

  it("CA-B41-11: should avisar e desligar a automação ao apagar a etapa ou o funil que ela usa", async () => {
    await novaRegra("visita", "Visitou vai para convidado", gatilhoEAcao({ funil: "entrada", etapa: "negociacao" }, "mover_card", { funil: feira, etapa: etapa.visitou }))
    expect(await ativa("visita")).toBe(true)

    como("gerente")
    expect((await automacoesQueUsam({ etapa: etapa.visitou })).automacoes!.map((a) => a.nome)).toEqual(["Visitou vai para convidado"])
    const r = await apagarEtapa(etapa.visitou, null)
    expect(r.erro).toBeUndefined()
    expect(r.desligadas).toEqual(["Visitou vai para convidado"])
    expect(await ativa("visita")).toBe(false)
    expect(await ativa("tag")).toBe(true)

    const opcoes = await carregarOpcoesEditor(clientes.admin as never, ws)
    const { data } = await service.from("automation_flows").select("fluxo").eq("id", regras.visita).single()
    expect(referenciasQueSumiram(data!.fluxo as unknown as Fluxo, opcoes).a[0]).toBe("Mover card para etapa: precisa de ajuste, o funil ou a etapa escolhida foi apagada")

    // Funil inteiro
    como("admin")
    const lanc = await criarFunil("Lançamento", [{ nome: "Avisado" }])
    const avisado = (await service.from("funil_etapas").select("id").eq("funil_id", lanc.id!).single()).data!.id
    await novaRegra("lanc", "Avisa lançamento", gatilhoEAcao({ funil: lanc.id!, etapa: avisado }, "adicionar_tag", { tag: "lancamento" }))
    como("gerente")
    expect((await automacoesQueUsam({ funil: lanc.id! })).automacoes!.map((a) => a.nome)).toEqual(["Avisa lançamento"])
    expect(await apagarFunil(lanc.id!)).toEqual({ cards: 0, desligadas: ["Avisa lançamento"] })
    expect(await ativa("lanc")).toBe(false)
  })

  it("CA-B41-41: should recusar ligar a automação marcada até alguém escolher outra etapa", async () => {
    como("admin")
    const recusa = await alternarRegra(regras.visita, true)
    expect(recusa.erro).toBe('Não dá para ativar: O bloco "Mover card para etapa" precisa de ajuste: o funil ou a etapa escolhida foi apagada. Escolha de novo.')
    expect(await ativa("visita")).toBe(false)

    const corrigido = gatilhoEAcao({ funil: "entrada", etapa: "negociacao" }, "mover_card", { funil: feira, etapa: etapa.convidado })
    expect((await salvarRegra({ id: regras.visita, nome: "Visitou vai para convidado", fluxo: corrigido, repeticao: { modo: "sempre" } })).erro).toBeUndefined()
    expect(await alternarRegra(regras.visita, true)).toEqual({})
    expect(await ativa("visita")).toBe(true)
    const opcoes = await carregarOpcoesEditor(clientes.admin as never, ws)
    expect(referenciasQueSumiram(corrigido, opcoes)).toEqual({})
  })
})
