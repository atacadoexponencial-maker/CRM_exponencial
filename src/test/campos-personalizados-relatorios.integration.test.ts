// @vitest-environment node
// B38-07 — filtro por campo personalizado nos Relatórios e no Dashboard, no Supabase
// real: cada aba conta só os clientes que atendem, o RFV mantém o perfil da empresa
// toda e o filtro de atendente vale junto.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarCampo, listarCamposParaGerenciar } from "@/app/(auth)/configuracoes/campos/actions"
import { salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { buscarCarteiras, buscarCoorte, buscarFunilClientes, buscarRfv, buscarVisaoGeral } from "@/app/(auth)/relatorios/actions"
import { buscarPainelDashboard } from "@/app/(auth)/dashboard/actions"
import { hojeNoFuso, periodoPadrao } from "@/lib/relatorios/visao-geral"
import { campoPersonalizado } from "@/lib/filtro-contatos"
import type { FiltroPorCampo } from "@/lib/filtro-por-campo"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const hoje = hojeNoFuso()

let ws = ""
const usuarios: string[] = []
const pessoas: Record<string, { id: string; cliente: SupabaseClient }> = {}
const contatos: Record<string, string> = {}
let grande: FiltroPorCampo

async function criarPessoa(chave: string, role: string, nome: string) {
  const email = `b38-07-${chave}-${ts}@campos-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: nome, role, status: "active" })
  const cliente = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await cliente.auth.signInWithPassword({ email, password: SENHA })
  pessoas[chave] = { id, cliente }
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(pessoas[chave].cliente as never)

const nomes = (ids: string[]) => ids.map((id) => Object.entries(contatos).find(([, v]) => v === id)?.[0]).sort()

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B38-07 ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", "admin", "Admin")
  await criarPessoa("atendente", "atendente", "Atendente Teste")

  como("admin")
  expect((await criarCampo("Porte", "lista", ["Pequeno", "Grande"])).erro).toBeUndefined()
  como("admin")
  const porte = (await listarCamposParaGerenciar()).find((c) => c.nome === "Porte")!
  const opcao = (nome: string) => porte.opcoes.find((o) => o.nome === nome)!.id
  grande = { campo: campoPersonalizado(porte), valores: [opcao("Grande")] }

  // G1 e P1 são da carteira do Atendente Teste; G2 e N1, de ninguém. N1 não tem Porte.
  const dados: Array<[string, string | null, string | null, number]> = [
    ["G1", "Grande", pessoas.atendente.id, 100],
    ["G2", "Grande", null, 200],
    ["P1", "Pequeno", pessoas.atendente.id, 300],
    ["N1", null, null, 400],
  ]
  for (const [i, [nome, valorPorte, atendente, valor]] of dados.entries()) {
    contatos[nome] = (await service.from("contacts").insert({ workspace_id: ws, name: nome, atendente_id: atendente, phone_number: `55319${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id
    await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: contatos[nome], data: hoje, valor, origem: "manual", atendente_id: atendente })
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatos[nome], funil: "entrada", etapa: "lead", atendente_id: atendente })
    if (valorPorte) {
      como("admin")
      expect(await salvarCamposDoContato(contatos[nome], { [porte.id]: opcao(valorPorte) })).toEqual({})
    }
  }
}, 120_000)

afterAll(async () => {
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B38-07 — filtro por campo nos Relatórios e no Dashboard", { timeout: 90_000 }, () => {
  it("CA-B38-50: should contar só os clientes de Porte Grande na Visão Geral, na coorte, no funil e nas carteiras", async () => {
    como("admin")
    const visao = (await buscarVisaoGeral({ periodo: periodoPadrao(hoje), atendenteId: null, campo: grande }))!
    expect(nomes(visao.tabela.map((v) => v.contatoId))).toEqual(["G1", "G2"])
    como("admin")
    const semFiltro = (await buscarVisaoGeral({ periodo: periodoPadrao(hoje), atendenteId: null }))!
    expect(semFiltro.tabela).toHaveLength(4)

    como("admin")
    const coorte = (await buscarCoorte({ campo: grande }))!
    expect(coorte.coortes.reduce((t, c) => t + c.clientes, 0)).toBe(2)
    como("admin")
    const funil = (await buscarFunilClientes({ campo: grande }))!
    expect(funil.etapas[0].clientes).toBe(2)
    como("admin")
    const carteiras = (await buscarCarteiras({ campo: grande }))!
    expect(carteiras.painel.total.base).toBe(2)
  })

  it("CA-B38-51: should manter o perfil e as notas do cliente no RFV com o filtro por campo", async () => {
    como("admin")
    const todos = (await buscarRfv({}))!
    como("admin")
    const filtrado = (await buscarRfv({ campo: grande }))!
    expect(nomes(filtrado.clientes.map((c) => c.contatoId))).toEqual(["G1", "G2"])
    expect(filtrado.matriz.reduce((t, c) => t + c.clientes, 0)).toBe(2)
    for (const nome of ["G1", "G2"]) {
      const antes = todos.clientes.find((c) => c.contatoId === contatos[nome])!
      const depois = filtrado.clientes.find((c) => c.contatoId === contatos[nome])!
      expect({ perfil: depois.perfil, r: depois.r, f: depois.f, v: depois.v }).toEqual({ perfil: antes.perfil, r: antes.r, f: antes.f, v: antes.v })
    }
  })

  it("CA-B38-52: should contar no Dashboard só os cards e as compras dos contatos de Porte Grande", async () => {
    como("admin")
    const painel = (await buscarPainelDashboard({ periodo: "30d", campo: grande }))!
    expect(painel.metricas.receita.quantidadeCompras).toBe(2)
    expect(painel.metricas.receita.totalCompras).toBe(300)
    expect(painel.metricas.entrada.novosLeads).toBe(2)
    como("admin")
    const semFiltro = (await buscarPainelDashboard({ periodo: "30d" }))!
    expect(semFiltro.metricas.receita.quantidadeCompras).toBe(4)
  })

  it("CA-B38-53: should juntar o filtro por campo e o de atendente, pelo Admin e pelo próprio atendente", async () => {
    como("admin")
    const peloAdmin = (await buscarVisaoGeral({ periodo: periodoPadrao(hoje), atendenteId: pessoas.atendente.id, campo: grande }))!
    expect(nomes(peloAdmin.tabela.map((v) => v.contatoId))).toEqual(["G1"])
    como("atendente")
    const peloAtendente = (await buscarVisaoGeral({ periodo: periodoPadrao(hoje), atendenteId: null, campo: grande }))!
    expect(nomes(peloAtendente.tabela.map((v) => v.contatoId))).toEqual(["G1"])
    como("admin")
    const rfv = (await buscarRfv({ atendenteId: pessoas.atendente.id, campo: grande }))!
    expect(nomes(rfv.clientes.map((c) => c.contatoId))).toEqual(["G1"])
  })
})
