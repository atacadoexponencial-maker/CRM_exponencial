// @vitest-environment node
// B38-04 — campos personalizados nas automações, no Supabase real: o gatilho "dado do
// contato alterado" com campo personalizado (pelo perfil, pela automação e pelo
// cadastro), a condição "campo personalizado", a ação que preenche o campo, a
// conferência ao salvar e o freio da sequência. Fora da requisição, a fila roda na
// hora (`after` lança erro e o trabalho roda em seguida). Única coisa mockada:
// @/integrations/supabase/server, para injetar um cliente autenticado de verdade.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { carregarOpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/opcoes-editor"
import { fraseBloco } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
import { criarCampo, listarCamposParaGerenciar } from "@/app/(auth)/configuracoes/campos/actions"
import { camposDoContato, salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { criarContato } from "@/app/(auth)/contatos/actions"
import { JA_RODOU_NA_SEQUENCIA, processarAutomacoes } from "@/lib/automacoes"
import { formatarValor } from "@/lib/campos-personalizados"
import { campoPersonalizado } from "@/lib/filtro-contatos"
import type { Bloco, Fluxo, Parametros } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const posicao = { x: 0, y: 0 }

let ws = ""
let admin: SupabaseClient
const usuarios: string[] = []
const contatos: Record<string, string> = {}
const campos: Record<string, { id: string; tipo: string; opcoes: Array<{ id: string; nome: string }> }> = {}
const regras: Record<string, string> = {}

const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(admin as never)
const idDoCampo = (nome: string) => campoPersonalizado({ id: campos[nome].id, tipo: campos[nome].tipo })
const opcao = (campo: string, nome: string) => campos[campo].opcoes.find((o) => o.nome === nome)!.id

const gatilho = (tipo: "dado_contato_alterado" | "tag_adicionada", parametros: Parametros): Bloco =>
  ({ id: "g", tipo: "gatilho", gatilho: tipo, parametros, posicao })
const acao = (id: string, tipo: "adicionar_tag" | "alterar_dado_contato", parametros: Parametros): Bloco =>
  ({ id, tipo: "acao", acao: tipo, parametros, posicao })

/** Gatilho → ação, numa linha só. */
const fluxoSimples = (g: Bloco, a: Bloco): Fluxo => ({ blocos: [g, a], ligacoes: [{ de: g.id, saida: "proximo", para: a.id }] })

async function criarRegra(chave: string, fluxo: Fluxo) {
  comoAdmin()
  const r = await salvarRegra({ id: null, nome: `${chave} ${ts}`, fluxo, repeticao: { modo: "sempre" } })
  expect(r.erro).toBeUndefined()
  comoAdmin()
  expect(await alternarRegra(r.id!, true)).toEqual({})
  regras[chave] = r.id!
}

const temTag = async (contato: string, tag: string) =>
  ((await service.from("contact_tags").select("tag").eq("contact_id", contatos[contato]).eq("tag", tag)).data ?? []).length > 0

const tagAdicionada = (contato: string, tag: string) =>
  processarAutomacoes({ tipo: "tag_adicionada", workspaceId: ws, contactId: contatos[contato], tag })

async function execucoes(regra: string, contato: string) {
  const { data } = await service
    .from("automation_runs")
    .select("resultado, motivo, caminho, created_at")
    .eq("regra_id", regras[regra])
    .eq("contact_id", contatos[contato])
    .order("created_at")
  return data ?? []
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B38-04 ${ts}` }).select("id").single()).data!.id
  const email = `b38-04-admin-${ts}@campos-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.auth.signInWithPassword({ email, password: SENHA })

  comoAdmin()
  for (const [nome, tipo, opcoes] of [["Porte", "lista", ["Pequeno", "Grande"]], ["Cliente VIP", "sim_nao", []], ["Limite de crédito", "dinheiro", []]] as const) {
    expect((await criarCampo(nome, tipo, [...opcoes])).erro).toBeUndefined()
  }
  comoAdmin()
  for (const c of await listarCamposParaGerenciar()) campos[c.nome] = { id: c.id, tipo: c.tipo, opcoes: c.opcoes }

  for (const [i, nome] of ["Ana", "Bia", "Caio", "Duda", "Eva"].entries()) {
    contatos[nome] = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55319${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id
  }
}, 120_000)

afterAll(async () => {
  await service.from("automation_runs").delete().eq("workspace_id", ws)
  await service.from("automation_queue").delete().eq("workspace_id", ws)
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("contact_tags").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B38-04 — campos personalizados nas automações", { timeout: 120_000 }, () => {
  it("CA-B38-37: should rodar a automação quando o Porte muda para Grande pelo perfil, pela automação e pelo cadastro", async () => {
    await criarRegra("Quando Grande", fluxoSimples(gatilho("dado_contato_alterado", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Grande") }), acao("a", "adicionar_tag", { tag: "porte-grande" })))
    await criarRegra("Vira Grande", fluxoSimples(gatilho("tag_adicionada", { tag: "vira-grande" }), acao("a", "alterar_dado_contato", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Grande") })))

    // Pelo perfil (o Chat grava pela mesma action)
    comoAdmin()
    expect(await salvarCamposDoContato(contatos.Ana, { [campos.Porte.id]: opcao("Porte", "Grande") })).toEqual({})
    expect(await temTag("Ana", "porte-grande")).toBe(true)

    // O mesmo valor de antes não dispara
    await service.from("contact_tags").delete().eq("contact_id", contatos.Ana)
    comoAdmin()
    expect(await salvarCamposDoContato(contatos.Ana, { [campos.Porte.id]: opcao("Porte", "Grande") })).toEqual({})
    expect(await temTag("Ana", "porte-grande")).toBe(false)

    // Outro valor não dispara
    comoAdmin()
    expect(await salvarCamposDoContato(contatos.Bia, { [campos.Porte.id]: opcao("Porte", "Pequeno") })).toEqual({})
    expect(await temTag("Bia", "porte-grande")).toBe(false)

    // Por outra automação (PER-B38-13)
    await tagAdicionada("Caio", "vira-grande")
    expect(await temTag("Caio", "porte-grande")).toBe(true)

    // Pelo cadastro
    comoAdmin()
    const novo = await criarContato({ nome: "Loja Nova", telefone: `55319${String(ts).slice(-6)}9`, campos: { [campos.Porte.id]: opcao("Porte", "Grande") } })
    expect(novo.erro).toBeUndefined()
    contatos.Nova = novo.id!
    expect(await temTag("Nova", "porte-grande")).toBe(true)
  })

  it("CA-B38-38: should seguir pelo sim com Porte Grande e pelo não sem Porte, e o histórico mostrar a condição e o caminho", async () => {
    const fluxo: Fluxo = {
      blocos: [
        gatilho("tag_adicionada", { tag: "confere-porte" }),
        { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "campo_personalizado", campo: idDoCampo("Porte"), operador: "qualquer_de", valor: opcao("Porte", "Grande") }], posicao },
        acao("sim", "adicionar_tag", { tag: "sim-grande" }),
        acao("nao", "adicionar_tag", { tag: "nao-grande" }),
      ],
      ligacoes: [
        { de: "g", saida: "proximo", para: "c" },
        { de: "c", saida: "sim", para: "sim" },
        { de: "c", saida: "nao", para: "nao" },
      ],
    }
    await criarRegra("Confere Porte", fluxo)
    await tagAdicionada("Ana", "confere-porte")
    await tagAdicionada("Duda", "confere-porte")
    expect([await temTag("Ana", "sim-grande"), await temTag("Ana", "nao-grande")]).toEqual([true, false])
    expect([await temTag("Duda", "sim-grande"), await temTag("Duda", "nao-grande")]).toEqual([false, true])

    comoAdmin()
    const opcoes = await carregarOpcoesEditor(admin as never, ws)
    for (const [contato, saida] of [["Ana", "sim"], ["Duda", "nao"]] as const) {
      const [execucao] = await execucoes("Confere Porte", contato)
      const passos = execucao.caminho as Array<{ bloco: Bloco; saida?: string }>
      const condicao = passos.find((p) => p.bloco.tipo === "condicao")!
      expect(condicao.saida).toBe(saida)
      expect(fraseBloco(condicao.bloco, opcoes)).toBe("Se Porte é qualquer um de Grande")
      expect(passos.map((p) => p.bloco.id)).toEqual(["g", "c", saida])
    }
  })

  it("CA-B38-39: should marcar Cliente VIP: Sim no contato pela ação", async () => {
    await criarRegra("Marca VIP", fluxoSimples(gatilho("tag_adicionada", { tag: "vip" }), acao("a", "alterar_dado_contato", { campo: idDoCampo("Cliente VIP"), valor: "sim" })))
    await tagAdicionada("Duda", "vip")
    comoAdmin()
    const vip = (await camposDoContato(contatos.Duda))!.find((c) => c.nome === "Cliente VIP")!
    expect(`${vip.nome}: ${formatarValor(vip, vip.valor)}`).toBe("Cliente VIP: Sim")
  })

  it("CA-B38-40: should recusar salvar a ação com valor fora do formato do campo", async () => {
    comoAdmin()
    const r = await salvarRegra({
      id: null,
      nome: `Limite errado ${ts}`,
      fluxo: fluxoSimples(gatilho("tag_adicionada", { tag: "limite" }), acao("a", "alterar_dado_contato", { campo: idDoCampo("Limite de crédito"), valor: "muito" })),
      repeticao: { modo: "sempre" },
    })
    expect(r.erro).toBe("O dado do contato escolhido não pode receber esse valor. Confira o campo e o valor.")
  })

  it("CA-B38-62: should rodar cada automação uma vez na sequência e terminar com Porte Grande", async () => {
    await criarRegra("A", fluxoSimples(gatilho("dado_contato_alterado", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Grande") }), acao("a", "alterar_dado_contato", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Pequeno") })))
    await criarRegra("B", fluxoSimples(gatilho("dado_contato_alterado", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Pequeno") }), acao("a", "alterar_dado_contato", { campo: idDoCampo("Porte"), valor: opcao("Porte", "Grande") })))

    comoAdmin()
    expect(await salvarCamposDoContato(contatos.Eva, { [campos.Porte.id]: opcao("Porte", "Grande") })).toEqual({})

    const doA = await execucoes("A", "Eva")
    const doB = await execucoes("B", "Eva")
    expect(doA.map((e) => e.resultado)).toEqual(["concluida", "ignorada"])
    expect(doA[1].motivo).toBe(JA_RODOU_NA_SEQUENCIA)
    expect(doB.map((e) => e.resultado)).toEqual(["concluida"])
    comoAdmin()
    const porte = (await camposDoContato(contatos.Eva))!.find((c) => c.nome === "Porte")!
    expect(formatarValor(porte, porte.valor)).toBe("Grande")
  })
})
