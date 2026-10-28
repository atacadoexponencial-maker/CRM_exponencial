// @vitest-environment node
// B43-04 — proteções do disparo por perfil RFV, no Supabase real: quem saiu do perfil
// de destino antes do horário é pulado, a automação religada não dispara as mudanças
// dos dias em que estava desligada, e o histórico descreve a mudança que disparou.
//
// Como na B43-03: a conferência roda só para a empresa de teste, em dias inventados
// (2031), e a hora é a do relógio passado às funções (Brasília = UTC-3).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { fraseDoEvento } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
import { SAIU_DO_PERFIL } from "@/lib/automacoes"
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

const as = (dia: string, horaBrasilia: number) => new Date(`${dia}T${String(horaBrasilia + 3).padStart(2, "0")}:30:00Z`)

let ws = ""
let adminId = ""
const usuarios: string[] = []
const navegadores: Record<string, SupabaseClient> = {}
const ids: Record<string, string> = {}
const regras: Record<string, string> = {}

async function criarUsuario(nome: string) {
  const email = `b43-04-${nome.toLowerCase()}-${ts}@teste.com`
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

function compras(contato: string, n: number, valor: number, mesesDaUltima = 0) {
  return Array.from({ length: n }, (_, i) => ({
    workspace_id: ws, contact_id: ids[contato], data: deslocarMeses(hoje, -(mesesDaUltima + i)), valor, origem: "manual",
  }))
}

/** "Entrou no perfil Em Risco" no horário dado → adicionar tag. A regra nasce ligada; `ligar` falso a desliga. */
async function novaRegra(chave: string, hora: string, ligar: boolean) {
  const fluxo: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "entrou_perfil_rfv", parametros: { destinos: "em_risco", hora }, posicao },
      { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: chave }, posicao },
    ],
    ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
  }
  comoAdmin()
  const r = await salvarRegra({ id: null, nome: chave, fluxo, repeticao: { modo: "sempre" } })
  expect(r.erro).toBeUndefined()
  regras[chave] = r.id!
  // B48-08: a regra nova nasce desligada
  if (ligar) {
    comoAdmin()
    expect(await alternarRegra(r.id!, true)).toEqual({})
  }
}

const temTag = async (contato: string, tag: string) =>
  ((await service.from("contact_tags").select("tag").eq("contact_id", ids[contato]).eq("tag", tag)).data ?? []).length > 0
const guardar = (contato: string, perfil: string) =>
  service.from("perfis_rfv_guardados").update({ perfil }).eq("contact_id", ids[contato])
const execucoes = async (regra: string, contato: string) =>
  (await service.from("automation_runs").select("resultado, motivo, evento").eq("regra_id", regras[regra]).eq("contact_id", ids[contato])).data ?? []

// Ana, Bruno e Carla compram igual (bem, há 7 meses), atrás dos quatro do topo: Em Risco hoje.
beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B43-04 ${ts}` }).select("id").single()).data!.id
  adminId = await criarUsuario("Admin")

  const nomes = ["Top 1", "Top 2", "Top 3", "Top 4", "Ana", "Bruno", "Carla", ...Array.from({ length: 10 }, (_, i) => `Medio ${i}`)]
  const { data, error } = await service
    .from("contacts")
    .insert(nomes.map((name, i) => ({ workspace_id: ws, name, phone_number: `5561${ts % 1e7}${String(i).padStart(2, "0")}` })))
    .select("id, name")
  if (error || !data) throw new Error(error?.message)
  for (const c of data) ids[c.name as string] = c.id as string

  const { error: erroCompras } = await service.from("contact_purchases").insert([
    ...["Top 1", "Top 2", "Top 3", "Top 4"].flatMap((n) => compras(n, 6, 1000)),
    ...["Ana", "Bruno", "Carla"].flatMap((n) => compras(n, 4, 800, 7)),
    ...Array.from({ length: 10 }, (_, i) => compras(`Medio ${i}`, 2, 100, 1)).flat(),
  ])
  if (erroCompras) throw new Error(erroCompras.message)

  // Primeira conferência: só guarda
  await conferirPerfisRfv(as("2031-01-01", 3), ws)
}, 120_000)

afterAll(async () => {
  await service.from("automation_runs").delete().eq("workspace_id", ws)
  await service.from("automation_queue").delete().eq("workspace_id", ws)
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("mudancas_perfil_rfv").delete().eq("workspace_id", ws)
  await service.from("perfis_rfv_guardados").delete().eq("workspace_id", ws)
  await service.from("conferencias_perfil_rfv").delete().eq("workspace_id", ws)
  await service.from("contact_tags").delete().eq("workspace_id", ws)
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B43-04 — proteções e histórico do disparo por perfil", { timeout: 120_000 }, () => {
  it("CA-B43-19: should pular quem saiu do perfil de destino antes do horário", async () => {
    await novaRegra("reativar", "10", true)
    await guardar("Ana", "campeao")
    expect(await conferirPerfisRfv(as("2031-01-02", 3), ws)).toBe(1)

    // Às 8h a Ana compra bem e sai de Em Risco
    await service.from("contact_purchases").insert(compras("Ana", 3, 3000))
    const { data } = await service.rpc("perfis_rfv_do_workspace", { p_workspace: ws }).eq("contact_id", ids["Ana"])
    expect((data as Array<{ perfil: string }>)[0].perfil).not.toBe("em_risco")

    await dispararPerfisRfv(as("2031-01-02", 10), ws)
    expect(await temTag("Ana", "reativar")).toBe(false)
    // No histórico, a execução fica como ignorada, com o motivo, uma vez só
    await dispararPerfisRfv(as("2031-01-02", 10), ws)
    expect(await execucoes("reativar", "Ana")).toEqual([expect.objectContaining({ resultado: "ignorada", motivo: SAIU_DO_PERFIL })])
  })

  it("CA-B43-21: should rodar, ao ser ligada de novo, só para as mudanças do dia em que foi ligada", async () => {
    await novaRegra("desligada", "11", false)

    // Dia 3: o Bruno muda (e a Ana, pela compra do teste anterior), com a automação desligada
    await guardar("Bruno", "campeao")
    expect(await conferirPerfisRfv(as("2031-01-03", 3), ws)).toBeGreaterThanOrEqual(1)
    await dispararPerfisRfv(as("2031-01-03", 11), ws)

    // Dia 4: a Carla muda, e a automação é ligada antes das 11h
    await guardar("Carla", "precisa_atencao")
    expect(await conferirPerfisRfv(as("2031-01-04", 3), ws)).toBeGreaterThanOrEqual(1)
    comoAdmin()
    expect(await alternarRegra(regras["desligada"], true)).toEqual({})
    await dispararPerfisRfv(as("2031-01-04", 11), ws)

    expect(await temTag("Carla", "desligada")).toBe(true)
    expect(await temTag("Bruno", "desligada")).toBe(false)
  })

  it("CA-B43-23: should descrever no histórico a mudança que disparou a automação", async () => {
    await novaRegra("historico", "12", true)
    await guardar("Bruno", "campeao")
    expect(await conferirPerfisRfv(as("2031-01-05", 3), ws)).toBeGreaterThanOrEqual(1)
    await dispararPerfisRfv(as("2031-01-05", 12), ws)

    const [execucao] = await execucoes("historico", "Bruno")
    expect(execucao.resultado).toBe("concluida")
    expect(fraseDoEvento(execucao.evento as Record<string, string>)).toBe("Entrou em Em Risco (vindo de Campeão)")
  })
})
