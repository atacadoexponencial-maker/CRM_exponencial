// @vitest-environment node
// B41-06 — os funis da empresa no Dashboard (cards por etapa, com a escolha do funil)
// e no filtro de contatos (um campo por funil). Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarFunil } from "@/app/(auth)/configuracoes/funis/actions"
import { buscarPainelDashboard } from "@/app/(auth)/dashboard/actions"
import { filtrarContatos, valoresDoFiltro } from "@/app/(auth)/contatos/actions"
import { camposDosFunis, campoDoFunil, type Comparacao, type Filtro } from "@/lib/filtro-contatos"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()

let ws = ""
const usuarios: Record<string, string> = {}
const clientes: Record<string, SupabaseClient> = {}
const contatos: Record<string, string> = {}
let feira = ""
const etapa: Record<string, string> = {}

async function criarPessoa(chave: string, role: string) {
  const email = `b41-06-${chave}-${ts}@funis-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios[chave] = id
  await service.from("profiles").insert({ id, workspace_id: ws, name: `Pessoa ${chave}`, role, status: "active" })
  const c = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await c.auth.signInWithPassword({ email, password: SENHA })
  clientes[chave] = c
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

const filtroDe = (campo: string, comparacao: Comparacao, valores: string[] = []): Filtro => ({
  juncao: "e",
  grupos: [{ juncao: "e", condicoes: [{ campo, comparacao, valores }] }],
})
async function nomes(filtro: Filtro) {
  const r = await filtrarContatos({ filtro })
  if ("erro" in r) throw new Error(r.erro)
  return { nomes: r.contatos.map((c) => c.nome).sort(), total: r.total }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B41-06 ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin")
  await criarPessoa("ana", "atendente")
  for (const [i, nome] of ["Alfa", "Beta", "Gama", "Delta"].entries()) {
    contatos[nome] = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55719${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id
  }
  como("admin")
  feira = (await criarFunil("Feira de Março", [{ nome: "Convidado" }, { nome: "Confirmou" }])).id!
  const { data } = await service.from("funil_etapas").select("id, ordem").eq("funil_id", feira)
  const [convidado, confirmou] = [...data!].sort((a, b) => a.ordem - b.ordem)
  Object.assign(etapa, { convidado: convidado.id, confirmou: confirmou.id })

  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: contatos.Alfa, funil: feira, etapa: etapa.confirmou, atendente_id: usuarios.ana },
    { workspace_id: ws, contact_id: contatos.Beta, funil: feira, etapa: etapa.convidado },
    { workspace_id: ws, contact_id: contatos.Delta, funil: feira, etapa: etapa.convidado },
    { workspace_id: ws, contact_id: contatos.Gama, funil: "entrada", etapa: "lead" },
    { workspace_id: ws, contact_id: contatos.Alfa, funil: "entrada", etapa: "sondagem", atendente_id: usuarios.ana },
    { workspace_id: ws, contact_id: contatos.Delta, funil: "recompra", etapa: "ativos" },
  ])
}, 120_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("funis").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of Object.values(usuarios)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

const contagem = (etapas: Array<{ label: string; quantidade: number }>) => etapas.map((e) => [e.label, e.quantidade])

describe("B41-06 — Funis da empresa no Dashboard e no filtro", { timeout: 60_000 }, () => {
  it("CA-B41-37: should trazer o gráfico de Entrada como antes e o funil da empresa por etapa, respeitando o atendente", async () => {
    como("admin")
    const painel = (await buscarPainelDashboard({ periodo: "30d" }))!
    expect(painel.funilEntrada.find((e) => e.id === "lead")!.quantidade).toBe(1)
    expect(painel.funilEntrada.find((e) => e.id === "sondagem")!.quantidade).toBe(1)
    expect(painel.funilEntrada.reduce((s, e) => s + e.quantidade, 0)).toBe(2)
    expect(painel.funisDaEmpresa!.map((f) => f.nome)).toEqual(["Feira de Março"])
    expect(contagem(painel.funisDaEmpresa![0].etapas)).toEqual([["Convidado", 2], ["Confirmou", 1]])

    const doFiltro = (await buscarPainelDashboard({ periodo: "30d", atendenteId: usuarios.ana }))!
    expect(contagem(doFiltro.funisDaEmpresa![0].etapas)).toEqual([["Convidado", 0], ["Confirmou", 1]])

    como("ana")
    const daAna = (await buscarPainelDashboard({ periodo: "30d" }))!
    expect(contagem(daAna.funisDaEmpresa![0].etapas)).toEqual([["Convidado", 0], ["Confirmou", 1]])
  })

  it("CA-B41-39: should filtrar pela etapa e pelo funil da empresa, com o nome e as etapas atuais", async () => {
    como("admin")
    const campo = campoDoFunil(feira)
    expect(await nomes(filtroDe(campo, "na_etapa", [etapa.confirmou]))).toEqual({ nomes: ["Alfa"], total: 1 })
    expect(await nomes(filtroDe(campo, "fora_da_etapa", [etapa.confirmou]))).toEqual({ nomes: ["Beta", "Delta"], total: 2 })
    expect(await nomes(filtroDe(campo, "no_funil"))).toEqual({ nomes: ["Alfa", "Beta", "Delta"], total: 3 })
    expect(await nomes(filtroDe(campo, "fora_do_funil"))).toEqual({ nomes: ["Gama"], total: 1 })

    const valores = await valoresDoFiltro()
    const [campoDaFeira] = camposDosFunis(valores.funis)
    expect(campoDaFeira).toMatchObject({ id: campo, rotulo: "Etapa no funil Feira de Março", assunto: "Funil", tipo: "funil" })
    expect(campoDaFeira.opcoes).toEqual([{ valor: etapa.convidado, rotulo: "Convidado" }, { valor: etapa.confirmou, rotulo: "Confirmou" }])
  })

  it("CA-B41-40: should não trazer ninguém, sem erro, com etapa ou funil apagado no filtro", async () => {
    como("admin")
    const sobra = (await service.from("funil_etapas").insert({ funil_id: feira, workspace_id: ws, nome: "Vai sumir", ordem: 9 }).select("id").single()).data!.id
    await service.from("funil_etapas").delete().eq("id", sobra)
    expect(await nomes(filtroDe(campoDoFunil(feira), "na_etapa", [sobra]))).toEqual({ nomes: [], total: 0 })
    expect(await nomes(filtroDe(campoDoFunil(feira), "fora_da_etapa", [sobra]))).toEqual({ nomes: [], total: 0 })

    const apagado = "22222222-2222-4222-8222-222222222222"
    expect(await nomes(filtroDe(campoDoFunil(apagado), "no_funil"))).toEqual({ nomes: [], total: 0 })
    expect(await nomes(filtroDe(campoDoFunil(apagado), "fora_do_funil"))).toEqual({ nomes: [], total: 0 })
  })

  it("CA-B41-38: should dar as mesmas métricas do Dashboard com e sem os cards do funil da empresa", async () => {
    como("admin")
    const com = (await buscarPainelDashboard({ periodo: "30d" }))!
    await service.from("pipeline_cards").delete().eq("funil", feira)
    const sem = (await buscarPainelDashboard({ periodo: "30d" }))!
    expect(sem.metricas).toEqual(com.metricas)
    expect(sem.variacoes).toEqual(com.variacoes)
    expect(sem.funilEntrada).toEqual(com.funilEntrada)
    expect(contagem(sem.funisDaEmpresa![0].etapas)).toEqual([["Convidado", 0], ["Confirmou", 0]])
  })
})
