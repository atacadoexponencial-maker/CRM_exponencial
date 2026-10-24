// @vitest-environment node
// B43-03 — gatilho "Entrou no perfil RFV", no Supabase real: a conferência de
// madrugada anota quem mudou, o gatilho é salvo e conferido pelo servidor, e o
// disparo da hora roda cada automação no horário dela, uma vez por mudança.
//
// O banco é o da produção: a conferência roda só para as empresas de teste
// (`workspaceId`), e os dias são inventados (2030), para não tocar na conferência real.
// A "hora" é a do relógio passado às funções (Brasília = UTC-3).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { conferirPerfisRfv, dispararPerfisRfv } from "@/lib/automacoes/perfil-rfv"
import { deslocarMeses, hojeNoFuso } from "@/lib/relatorios/visao-geral"
import type { Fluxo } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const hoje = hojeNoFuso()
const posicao = { x: 0, y: 0 }

/** Relógio num dia inventado, na hora de Brasília pedida. */
const as = (dia: string, horaBrasilia: number) => new Date(`${dia}T${String(horaBrasilia + 3).padStart(2, "0")}:30:00Z`)
const D1 = "2030-01-01"
const D2 = "2030-01-02"
const D3 = "2030-01-03"

let ws = "", wsB = ""
let adminId = ""
const usuarios: string[] = []
const navegadores: Record<string, SupabaseClient> = {}
const ids: Record<string, string> = {}
const regras: Record<string, string> = {}

async function criarUsuario(nome: string) {
  const email = `b43-03-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role: "admin", status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = c
  return id
}
const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(navegadores[adminId] as never)

function compras(empresa: string, contato: string, n: number, valor: number, mesesDaUltima = 0) {
  return Array.from({ length: n }, (_, i) => ({
    workspace_id: empresa, contact_id: ids[contato], data: deslocarMeses(hoje, -(mesesDaUltima + i)), valor, origem: "manual",
  }))
}

async function criarContatos(empresa: string, nomes: string[], prefixo: string) {
  const { data, error } = await service
    .from("contacts")
    .insert(nomes.map((name, i) => ({ workspace_id: empresa, name, phone_number: `55${prefixo}${ts % 1e7}${String(i).padStart(2, "0")}` })))
    .select("id, name")
  if (error || !data) throw new Error(error?.message)
  for (const c of data) ids[c.name as string] = c.id as string
}

/** "Entrou no perfil RFV" → adicionar tag. */
function fluxoDePerfil(parametros: Record<string, string>, tag: string): Fluxo {
  return {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "entrou_perfil_rfv", parametros, posicao },
      { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag }, posicao },
    ],
    ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
  }
}

async function novaRegra(chave: string, parametros: Record<string, string>, tag: string) {
  comoAdmin()
  const r = await salvarRegra({ id: null, nome: chave, fluxo: fluxoDePerfil(parametros, tag), repeticao: { modo: "sempre" } })
  expect(r.erro).toBeUndefined()
  regras[chave] = r.id!
  comoAdmin()
  expect(await alternarRegra(r.id!, true)).toEqual({})
}

const temTag = async (contato: string, tag: string) =>
  ((await service.from("contact_tags").select("tag").eq("contact_id", ids[contato]).eq("tag", tag)).data ?? []).length > 0
const mudancasDe = async (empresa: string, dia: string) =>
  (await service.from("mudancas_perfil_rfv").select("contact_id, de, para").eq("workspace_id", empresa).eq("dia", dia)).data ?? []
const perfisAgora = async (empresa: string) =>
  Object.fromEntries(
    (((await service.rpc("perfis_rfv_do_workspace", { p_workspace: empresa })).data ?? []) as Array<{ contact_id: string; perfil: string }>).map(
      (r) => [r.contact_id, r.perfil]
    )
  )
const guardar = (contato: string, perfil: string) =>
  service.from("perfis_rfv_guardados").update({ perfil }).eq("contact_id", ids[contato])

// Empresa A: Ana, Bruno e Carla compram igual (bem, há 7 meses), atrás dos quatro do topo:
// Em Risco hoje. A base em volta dá os quintis. Nova nunca comprou. Lixo está na lixeira.
beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B43-03 ${ts}` }).select("id").single()).data!.id
  wsB = (await service.from("workspaces").insert({ name: `[TESTE] B43-03 B ${ts}` }).select("id").single()).data!.id
  adminId = await criarUsuario("Admin")

  await criarContatos(ws, ["Top 1", "Top 2", "Top 3", "Top 4", "Ana", "Bruno", "Carla", "Nova", "Lixo", ...Array.from({ length: 10 }, (_, i) => `Medio ${i}`)], "31")
  await criarContatos(wsB, ["Beto", "Top B", "Top B2", "Top B3", ...Array.from({ length: 5 }, (_, i) => `Medio B ${i}`)], "41")
  await service.from("contacts").update({ excluido_em: new Date().toISOString() }).eq("id", ids["Lixo"])

  const { error } = await service.from("contact_purchases").insert([
    ...compras(ws, "Top 1", 6, 1000),
    ...compras(ws, "Top 2", 6, 1000),
    ...compras(ws, "Top 3", 6, 1000),
    ...compras(ws, "Top 4", 6, 1000),
    ...["Ana", "Bruno", "Carla"].flatMap((n) => compras(ws, n, 4, 800, 7)),
    ...compras(ws, "Lixo", 4, 800, 7),
    ...Array.from({ length: 10 }, (_, i) => compras(ws, `Medio ${i}`, 2, 100, 1)).flat(),
    ...compras(wsB, "Top B", 6, 1000),
    ...compras(wsB, "Top B2", 6, 1000),
    ...compras(wsB, "Top B3", 6, 1000),
    ...compras(wsB, "Beto", 4, 800, 7),
    ...Array.from({ length: 5 }, (_, i) => compras(wsB, `Medio B ${i}`, 2, 100, 1)).flat(),
  ])
  if (error) throw new Error(error.message)
}, 120_000)

afterAll(async () => {
  for (const w of [ws, wsB]) {
    await service.from("automation_runs").delete().eq("workspace_id", w)
    await service.from("automation_queue").delete().eq("workspace_id", w)
    await service.from("automation_flows").delete().eq("workspace_id", w)
    await service.from("mudancas_perfil_rfv").delete().eq("workspace_id", w)
    await service.from("perfis_rfv_guardados").delete().eq("workspace_id", w)
    await service.from("conferencias_perfil_rfv").delete().eq("workspace_id", w)
    await service.from("contact_tags").delete().eq("workspace_id", w)
    await service.from("contact_purchases").delete().eq("workspace_id", w)
    await service.from("contacts").delete().eq("workspace_id", w)
    await service.from("profiles").delete().eq("workspace_id", w)
  }
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [ws, wsB])
}, 120_000)

describe("B43-03 — gatilho Entrou no perfil RFV", { timeout: 120_000 }, () => {
  it("CA-B43-10: should só guardar os perfis na primeira conferência da empresa, sem anotar mudança", async () => {
    expect(await conferirPerfisRfv(as(D1, 3), ws)).toBe(0)
    expect(await conferirPerfisRfv(as(D1, 3), wsB)).toBe(0)

    expect(await mudancasDe(ws, D1)).toEqual([])
    const { data: guardados } = await service.from("perfis_rfv_guardados").select("contact_id, perfil").eq("workspace_id", ws)
    const agora = await perfisAgora(ws)
    // Todo contato fora da lixeira fica guardado, com o perfil da hora ou "sem_compras"
    expect(guardados).toHaveLength(18)
    for (const g of guardados!) expect(g.perfil).toBe(agora[g.contact_id] ?? "sem_compras")
    expect(guardados!.find((g) => g.contact_id === ids["Nova"])?.perfil).toBe("sem_compras")
  })

  it("CA-B43-08: should anotar quem mudou de perfil, de qual para qual, e só eles", async () => {
    const agora = await perfisAgora(ws)
    for (const n of ["Ana", "Bruno", "Carla"]) expect(agora[ids[n]], n).toBe("em_risco")

    // Na conferência "de ontem", Ana e Bruno eram Campeões e Carla, Precisa de Atenção
    await guardar("Ana", "campeao")
    await guardar("Bruno", "campeao")
    await guardar("Carla", "precisa_atencao")
    // Lixo, na lixeira, estava guardado com outro perfil (CA-B43-11)
    await service.from("perfis_rfv_guardados").insert({ contact_id: ids["Lixo"], workspace_id: ws, perfil: "campeao" })
    // Na empresa B, o Beto também mudou (CA-B43-12)
    expect((await perfisAgora(wsB))[ids["Beto"]]).toBe("em_risco")
    await guardar("Beto", "campeao")

    expect(await conferirPerfisRfv(as(D2, 3), ws)).toBe(3)
    expect(await conferirPerfisRfv(as(D2, 3), wsB)).toBe(1)

    const mudancas = await mudancasDe(ws, D2)
    expect(mudancas).toHaveLength(3)
    expect(mudancas).toContainEqual({ contact_id: ids["Ana"], de: "campeao", para: "em_risco" })
    expect(mudancas).toContainEqual({ contact_id: ids["Carla"], de: "precisa_atencao", para: "em_risco" })
    // O guardado passa a ser o perfil novo
    expect((await service.from("perfis_rfv_guardados").select("perfil").eq("contact_id", ids["Ana"]).single()).data!.perfil).toBe("em_risco")
    // Rodar de novo no mesmo dia não confere outra vez
    expect(await conferirPerfisRfv(as(D2, 5), ws)).toBe(0)
  })

  it("CA-B43-11: should deixar de fora o contato na lixeira", async () => {
    const mudancas = await mudancasDe(ws, D2)
    expect(mudancas.map((m) => m.contact_id)).not.toContain(ids["Lixo"])
    expect((await service.from("perfis_rfv_guardados").select("perfil").eq("contact_id", ids["Lixo"]).single()).data!.perfil).toBe("campeao")
  })

  it("CA-B43-13: should gravar destino, origem e horário do gatilho", async () => {
    await novaRegra("veio-de-campeao", { destinos: "em_risco", origens: "campeao", hora: "10" }, "veio-de-campeao")
    const { data } = await service.from("automation_flows").select("fluxo, gatilho_tipo").eq("id", regras["veio-de-campeao"]).single()
    expect(data!.gatilho_tipo).toBe("entrou_perfil_rfv")
    const gatilho = (data!.fluxo as unknown as Fluxo).blocos.find((b) => b.tipo === "gatilho")
    expect(gatilho && "parametros" in gatilho ? gatilho.parametros : null).toEqual({ destinos: "em_risco", origens: "campeao", hora: "10" })
  })

  it("CA-B43-14: should recusar no servidor o gatilho sem perfil de destino e não gravar nada", async () => {
    const antes = (await service.from("automation_flows").select("id").eq("workspace_id", ws)).data!.length
    comoAdmin()
    const r = await salvarRegra({ id: null, nome: "Sem destino", fluxo: fluxoDePerfil({ hora: "10" }, "x"), repeticao: { modo: "sempre" } })
    expect(r.erro).toContain("Escolha ao menos um perfil de destino.")
    comoAdmin()
    const origemNoDestino = await salvarRegra({ id: null, nome: "Igual", fluxo: fluxoDePerfil({ destinos: "em_risco", origens: "em_risco", hora: "10" }, "x"), repeticao: { modo: "sempre" } })
    expect(origemNoDestino.erro).toBeTruthy()
    expect((await service.from("automation_flows").select("id").eq("workspace_id", ws)).data!.length).toBe(antes)
  })

  it("CA-B43-16: should rodar às 10h para quem entrou no perfil, e não antes", async () => {
    await novaRegra("reativar", { destinos: "em_risco", hora: "10" }, "reativar")

    await dispararPerfisRfv(as(D2, 9), ws)
    expect(await temTag("Ana", "reativar")).toBe(false)
    expect(await temTag("Bruno", "reativar")).toBe(false)

    await dispararPerfisRfv(as(D2, 10), ws)
    expect(await temTag("Ana", "reativar")).toBe(true)
    expect(await temTag("Bruno", "reativar")).toBe(true)
  })

  it("CA-B43-17: should respeitar o vindo de: roda para a Ana (de Campeão) e não para a Carla", async () => {
    expect(await temTag("Ana", "veio-de-campeao")).toBe(true)
    expect(await temTag("Carla", "veio-de-campeao")).toBe(false)
  })

  it("CA-B43-12: should manter as mudanças e os disparos de cada empresa na própria empresa", async () => {
    expect((await mudancasDe(ws, D2)).map((m) => m.contact_id)).not.toContain(ids["Beto"])
    expect((await mudancasDe(wsB, D2)).map((m) => m.contact_id)).toEqual([ids["Beto"]])
    // A regra da A já rodou às 10h: o Beto, da B, não ganhou a tag
    expect(await temTag("Beto", "reativar")).toBe(false)
  })

  it("CA-B43-20: should não rodar de novo para a mesma mudança quando o disparo se repete", async () => {
    const execucoes = async () =>
      (await service.from("automation_runs").select("id").eq("regra_id", regras["reativar"]).eq("contact_id", ids["Ana"])).data!.length
    expect(await execucoes()).toBe(1)

    await dispararPerfisRfv(as(D2, 10), ws)
    await dispararPerfisRfv(as(D2, 10), ws)
    expect(await execucoes()).toBe(1)
  })

  it("CA-B43-09: should anotar a primeira compra como entrada no perfil, vindo de Sem compras", async () => {
    await service.from("contact_purchases").insert(compras(ws, "Nova", 1, 50))
    const perfilNovo = (await perfisAgora(ws))[ids["Nova"]]
    expect(perfilNovo).toBeTruthy()

    expect(await conferirPerfisRfv(as(D3, 3), ws)).toBeGreaterThanOrEqual(1)
    expect(await mudancasDe(ws, D3)).toContainEqual({ contact_id: ids["Nova"], de: "sem_compras", para: perfilNovo })
  })

  it("CA-B43-18: should esperar a conferência do dia seguinte para disparar a mudança causada por compra", async () => {
    // Recomeça com um contato sem compras, numa conferência já feita no dia
    await criarContatos(ws, ["Primeira"], "51")
    await service.from("perfis_rfv_guardados").insert({ contact_id: ids["Primeira"], workspace_id: ws, perfil: "sem_compras" })
    await novaRegra("boas-vindas", { destinos: "recentes", hora: "9" }, "boas-vindas")

    // Compra registrada "às 16h" do dia D3, depois da conferência das 3h
    await service.from("contact_purchases").insert(compras(ws, "Primeira", 1, 50))
    expect((await perfisAgora(ws))[ids["Primeira"]]).toBe("recentes")
    await dispararPerfisRfv(as(D3, 16), ws)
    await dispararPerfisRfv(as(D3, 9), ws)
    expect(await temTag("Primeira", "boas-vindas")).toBe(false)

    // Dia seguinte: a conferência das 3h anota, e às 9h dispara
    const D4 = "2030-01-04"
    await conferirPerfisRfv(as(D4, 3), ws)
    await dispararPerfisRfv(as(D4, 9), ws)
    expect(await temTag("Primeira", "boas-vindas")).toBe(true)
  })
})
