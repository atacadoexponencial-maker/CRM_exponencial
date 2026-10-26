// @vitest-environment node
// B38-08 — vendas por campo e as colunas dos campos nos Excel, no Supabase real: a
// tabela agrupada pelo Porte (com a mesma conta da Variação por UF), o Excel dela e as
// colunas CNPJ e Porte nos Excel do RFV, das Vendas e dos Pedidos.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { criarCampo, listarCamposParaGerenciar } from "@/app/(auth)/configuracoes/campos/actions"
import { salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { buscarVendasPorCampo, buscarVisaoGeral, type VendasPorCampo } from "@/app/(auth)/relatorios/actions"
import { GET as excelPorCampo } from "@/app/(auth)/relatorios/vendas-por-campo/exportar/route"
import { GET as excelRfv } from "@/app/(auth)/relatorios/rfv/exportar/route"
import { GET as excelVendas } from "@/app/(auth)/relatorios/vendas/exportar/route"
import { GET as excelPedidos } from "@/app/(auth)/catalogo/pedidos/exportar/route"
import { urlDeExportacao, urlDeExportacaoPorCampo } from "@/lib/relatorios/exportar-vendas"
import { hojeNoFuso, periodoPadrao, variacaoPorChave } from "@/lib/relatorios/visao-geral"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const hoje = hojeNoFuso()
const periodo = periodoPadrao(hoje)

let ws = ""
let admin: SupabaseClient
const usuarios: string[] = []
const contatos: Record<string, string> = {}
let porteId = ""

const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(admin as never)

/** As linhas do .xlsx, com o cabeçalho na primeira. */
async function planilha(resposta: Response, aba?: string) {
  expect(resposta.status).toBe(200)
  const livro = XLSX.read(new Uint8Array(await resposta.arrayBuffer()), { type: "array", cellDates: true })
  return XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets[aba ?? livro.SheetNames[0]], { header: 1, raw: true })
}

/** Cada linha como objeto pelo título da coluna. */
const porTitulo = (linhas: unknown[][]) => linhas.slice(1).map((l) => Object.fromEntries((linhas[0] as string[]).map((t, i) => [t, l[i]])))

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B38-08 ${ts}` }).select("id").single()).data!.id
  const email = `b38-08-admin-${ts}@campos-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.auth.signInWithPassword({ email, password: SENHA })

  comoAdmin()
  expect((await criarCampo("CNPJ", "texto")).erro).toBeUndefined()
  comoAdmin()
  expect((await criarCampo("Porte", "lista", ["Pequeno", "Grande"])).erro).toBeUndefined()
  comoAdmin()
  const campos = await listarCamposParaGerenciar()
  const cnpj = campos.find((c) => c.nome === "CNPJ")!
  const porte = campos.find((c) => c.nome === "Porte")!
  porteId = porte.id
  const opcao = (nome: string) => porte.opcoes.find((o) => o.nome === nome)!.id

  // Loja Grande (com CNPJ), Loja Pequena e Loja Sem Porte, cada uma com uma compra no mês
  const dados: Array<[string, string | null, string | null, number, string]> = [
    ["Loja Grande", "Grande", "12.345.678/0001-90", 100, "SP"],
    ["Loja Pequena", "Pequeno", null, 200, "SP"],
    ["Loja Sem Porte", null, null, 300, "MG"],
  ]
  for (const [i, [nome, valorPorte, valorCnpj, valor, uf]] of dados.entries()) {
    contatos[nome] = (await service.from("contacts").insert({ workspace_id: ws, name: nome, uf, phone_number: `55319${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id
    await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: contatos[nome], data: hoje, valor, origem: "manual" })
    const valores: Record<string, string> = {}
    if (valorPorte) valores[porte.id] = opcao(valorPorte)
    if (valorCnpj) valores[cnpj.id] = valorCnpj
    if (Object.keys(valores).length > 0) {
      comoAdmin()
      expect(await salvarCamposDoContato(contatos[nome], valores)).toEqual({})
    }
  }
  await service.from("catalog_orders").insert({
    workspace_id: ws, number: 1, customer_name: "Loja Grande", customer_whatsapp: `55319${String(ts).slice(-6)}0`,
    pieces: 1, total: 100, status: "novo", contact_id: contatos["Loja Grande"],
  })
}, 120_000)

afterAll(async () => {
  await service.from("catalog_orders").delete().eq("workspace_id", ws)
  await service.from("contact_purchases").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B38-08 — vendas por campo e as colunas dos campos nos Excel", { timeout: 90_000 }, () => {
  it("CA-B38-54: should mostrar Grande, Pequeno e Sem valor com a conta da Variação por UF e o total do faturamento líquido", async () => {
    comoAdmin()
    const r = (await buscarVendasPorCampo({ periodo, atendenteId: null, agrupar: porteId })) as VendasPorCampo
    expect(r.variacao.linhas.map((l) => l.uf).sort()).toEqual(["Grande", "Pequeno", "Sem valor"])

    // A mesma conta da Variação por UF, aplicada aos mesmos grupos
    const grupo: Record<string, string> = { [contatos["Loja Grande"]]: "Grande", [contatos["Loja Pequena"]]: "Pequeno", [contatos["Loja Sem Porte"]]: "Sem valor" }
    comoAdmin()
    const visao = (await buscarVisaoGeral({ periodo, atendenteId: null }))!
    const vendas = visao.tabela.map((v) => ({ contact_id: v.contatoId, data: v.data, valor: v.valor })) as never
    const esperado = variacaoPorChave(vendas, periodo, hoje, (v) => [grupo[(v as { contact_id: string }).contact_id]])
    expect(r.variacao.linhas).toEqual(esperado.linhas)
    expect(r.variacao.total.vendas).toBe(visao.resumo.faturamentoLiquido)
    expect(r.somaPodePassar).toBe(false)
  })

  it("CA-B38-55: should baixar o Excel da tabela com as mesmas linhas e números, e o total", async () => {
    comoAdmin()
    const r = (await buscarVendasPorCampo({ periodo, atendenteId: null, agrupar: porteId })) as VendasPorCampo
    comoAdmin()
    const linhas = porTitulo(await planilha(await excelPorCampo(new Request(`http://localhost${urlDeExportacaoPorCampo(periodo, null, porteId, null)}`))))
    expect(linhas.map((l) => [l.Porte, l.Clientes, l.Vendas])).toEqual([...r.variacao.linhas, r.variacao.total].map((l) => [l.uf, l.clientes, l.vendas]))
  })

  it("CA-B38-56: should trazer as colunas CNPJ e Porte nos Excel do RFV, das Vendas e dos Pedidos", async () => {
    const confere = (linhas: unknown[][], coluna: string) => {
      const cabecalho = linhas[0] as string[]
      expect(cabecalho.slice(-2)).toEqual(["CNPJ", "Porte"])
      return porTitulo(linhas).map((l) => [l[coluna], l.CNPJ ?? null, l.Porte ?? null])
    }

    comoAdmin()
    const rfv = confere(await planilha(await excelRfv(new Request("http://localhost/relatorios/rfv/exportar?"))), "Cliente")
    expect(rfv.sort()).toEqual([
      ["Loja Grande", "12.345.678/0001-90", "Grande"],
      ["Loja Pequena", null, "Pequeno"],
      ["Loja Sem Porte", null, null],
    ])

    comoAdmin()
    const vendas = confere(await planilha(await excelVendas(new Request(`http://localhost${urlDeExportacao(periodo, null)}`))), "Contato")
    expect(vendas.sort()).toEqual(rfv.sort())

    comoAdmin()
    const pedidos = confere(await planilha(await excelPedidos(new Request("http://localhost/catalogo/pedidos/exportar?formato=xlsx&escopo=todos")), "Pedidos"), "Cliente")
    expect(pedidos).toEqual([["Loja Grande", "12.345.678/0001-90", "Grande"]])
  })
})
