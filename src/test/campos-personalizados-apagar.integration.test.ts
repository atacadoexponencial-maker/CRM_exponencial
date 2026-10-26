// @vitest-environment node
// B38-06 — apagar campo e tirar opção, no Supabase real: o aviso de quantos contatos
// perdem o valor, o que acontece com os valores, e o bloqueio enquanto o campo ou a
// opção é usado numa automação, num filtro salvo ou numa campanha não enviada.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { apagarCampo, criarCampo, listarCamposParaGerenciar, resumoParaApagar, tirarOpcao } from "@/app/(auth)/configuracoes/campos/actions"
import { camposDoContato, salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { salvarFiltro } from "@/app/(auth)/contatos/filtros-salvos"
import { campoPersonalizado, type Filtro } from "@/lib/filtro-contatos"
import type { Fluxo } from "@/lib/fluxo-automacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const posicao = { x: 0, y: 0 }

let ws = ""
let adminId = ""
let admin: SupabaseClient
const usuarios: string[] = []
const contatos: string[] = []
const campos: Record<string, { id: string; tipo: string; opcoes: Array<{ id: string; nome: string }> }> = {}

const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(admin as never)
const opcao = (campo: string, nome: string) => campos[campo].opcoes.find((o) => o.nome === nome)!.id
const idDoFiltro = (nome: string) => campoPersonalizado({ id: campos[nome].id, tipo: campos[nome].tipo })

async function lerCampos() {
  comoAdmin()
  for (const c of await listarCamposParaGerenciar()) campos[c.nome] = { id: c.id, tipo: c.tipo, opcoes: c.opcoes }
}

async function preencher(contato: number, campo: string, valor: string | string[]) {
  comoAdmin()
  expect(await salvarCamposDoContato(contatos[contato], { [campos[campo].id]: valor })).toEqual({})
}

/** Gatilho de tag e uma condição pelo campo, com o valor dado. */
const fluxoComCondicao = (campo: string, valor: string): Fluxo => ({
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "tag_adicionada", parametros: { tag: "x" }, posicao },
    { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "campo_personalizado", campo: idDoFiltro(campo), operador: "qualquer_de", valor }], posicao },
    { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "ok" }, posicao },
  ],
  ligacoes: [
    { de: "g", saida: "proximo", para: "c" },
    { de: "c", saida: "sim", para: "a" },
  ],
})

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B38-06 ${ts}` }).select("id").single()).data!.id
  const email = `b38-06-admin-${ts}@campos-test.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Admin", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.auth.signInWithPassword({ email, password: SENHA })

  comoAdmin()
  for (const [nome, tipo, opcoes] of [
    ["Porte", "lista", ["Pequeno", "Rede"]],
    ["Linhas", "multipla", ["Jeans", "Rede"]],
    ["Aniversário da loja", "data", []],
    ["Tamanho", "lista", ["P", "G"]],
    ["Formato", "lista", ["Loja", "Rede"]],
  ] as const) {
    expect((await criarCampo(nome, tipo, [...opcoes])).erro).toBeUndefined()
  }
  await lerCampos()
  for (let i = 0; i < 5; i++) {
    contatos.push((await service.from("contacts").insert({ workspace_id: ws, name: `Loja ${i}`, phone_number: `55319${String(ts).slice(-6)}${i}` }).select("id").single()).data!.id)
  }
}, 120_000)

afterAll(async () => {
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("filtros_salvos").delete().eq("workspace_id", ws)
  await service.from("campaigns").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B38-06 — apagar campo e tirar opção", { timeout: 90_000 }, () => {
  it("CA-B38-10: should avisar quantos perdem a opção e, tirada, deixar a lista vazia e a múltipla com as outras", async () => {
    for (const i of [0, 1, 2]) await preencher(i, "Porte", opcao("Porte", "Rede"))
    await preencher(3, "Porte", opcao("Porte", "Pequeno"))
    await preencher(0, "Linhas", [opcao("Linhas", "Jeans"), opcao("Linhas", "Rede")])

    comoAdmin()
    expect(await resumoParaApagar(campos.Porte.id, opcao("Porte", "Rede"))).toEqual({ preenchidos: 3, usadoEm: { automacoes: [], filtros: [], campanhas: [] } })
    comoAdmin()
    expect(await tirarOpcao(campos.Porte.id, opcao("Porte", "Rede"))).toEqual({})
    comoAdmin()
    expect(await tirarOpcao(campos.Linhas.id, opcao("Linhas", "Rede"))).toEqual({})

    const porte = async (i: number) => {
      comoAdmin()
      return (await camposDoContato(contatos[i]))!.find((c) => c.nome === "Porte")!.valor
    }
    for (const i of [0, 1, 2]) expect(await porte(i)).toBeNull()
    expect((await porte(3))?.opcoes).toEqual([opcao("Porte", "Pequeno")])
    comoAdmin()
    const linhas = (await camposDoContato(contatos[0]))!.find((c) => c.nome === "Linhas")!
    expect(linhas.valor?.opcoes).toEqual([opcao("Linhas", "Jeans")])
    expect(linhas.opcoes.map((o) => o.nome)).toEqual(["Jeans"])
  })

  it("CA-B38-12: should avisar quantos perdem o valor e, apagado, tirar o campo e os valores", async () => {
    for (const i of [0, 1, 2, 3]) await preencher(i, "Aniversário da loja", "2026-04-03")
    comoAdmin()
    expect(await resumoParaApagar(campos["Aniversário da loja"].id)).toEqual({ preenchidos: 4, usadoEm: { automacoes: [], filtros: [], campanhas: [] } })
    // Pedir o resumo (a confirmação aberta) não muda nada
    comoAdmin()
    expect((await listarCamposParaGerenciar()).find((c) => c.nome === "Aniversário da loja")?.preenchidos).toBe(4)

    comoAdmin()
    expect(await apagarCampo(campos["Aniversário da loja"].id)).toEqual({})
    comoAdmin()
    expect((await listarCamposParaGerenciar()).map((c) => c.nome)).not.toContain("Aniversário da loja")
    comoAdmin()
    expect((await camposDoContato(contatos[0]))!.map((c) => c.nome)).not.toContain("Aniversário da loja")
    const { data } = await service.from("contato_campos").select("contact_id").eq("campo_id", campos["Aniversário da loja"].id)
    expect(data).toEqual([])
  })

  it("CA-B38-13: should recusar apagar o campo em uso e listar onde, e apagar depois que ele sai dos três", async () => {
    comoAdmin()
    const regra = await salvarRegra({ id: null, nome: "Boas-vindas atacado", fluxo: fluxoComCondicao("Tamanho", opcao("Tamanho", "G")), repeticao: { modo: "sempre" } })
    expect(regra.erro).toBeUndefined()
    const filtro: Filtro = { juncao: "e", grupos: [{ juncao: "e", condicoes: [{ campo: idDoFiltro("Tamanho"), comparacao: "qualquer_de", valores: [opcao("Tamanho", "G")] }] }] }
    comoAdmin()
    expect((await salvarFiltro("Lojas grandes", filtro)).erro).toBeUndefined()
    const campanha = (await service.from("campaigns").insert({
      workspace_id: ws, nome: "Promoção de março", status: "agendada", tipo_mensagem: "texto", conteudo: "Oi",
      segmento: { filtro }, agendada_para: new Date(Date.now() + 86_400_000).toISOString(), criado_por: adminId,
    } as never).select("id").single()).data!.id

    comoAdmin()
    expect(await apagarCampo(campos.Tamanho.id)).toEqual({
      erro: "O campo está em uso. Tire o campo dos lugares abaixo antes de apagar.",
      usadoEm: { automacoes: ["Boas-vindas atacado"], filtros: ["Lojas grandes"], campanhas: ["Promoção de março"] },
    })
    comoAdmin()
    expect((await listarCamposParaGerenciar()).map((c) => c.nome)).toContain("Tamanho")

    await service.from("automation_flows").delete().eq("id", regra.id!)
    await service.from("filtros_salvos").delete().eq("workspace_id", ws).eq("nome", "Lojas grandes")
    await service.from("campaigns").update({ status: "enviada" }).eq("id", campanha)
    comoAdmin()
    expect(await apagarCampo(campos.Tamanho.id)).toEqual({})
  })

  it("CA-B38-45: should recusar tirar a opção em uso e tirar depois que a condição deixa de usá-la", async () => {
    comoAdmin()
    const regra = await salvarRegra({ id: null, nome: "Atacado em rede", fluxo: fluxoComCondicao("Formato", opcao("Formato", "Rede")), repeticao: { modo: "sempre" } })
    expect(regra.erro).toBeUndefined()

    comoAdmin()
    expect(await tirarOpcao(campos.Formato.id, opcao("Formato", "Rede"))).toEqual({
      erro: "A opção está em uso. Tire a opção dos lugares abaixo antes.",
      usadoEm: { automacoes: ["Atacado em rede"], filtros: [], campanhas: [] },
    })
    // A outra opção do mesmo campo não está em uso
    comoAdmin()
    expect((await resumoParaApagar(campos.Formato.id, opcao("Formato", "Loja"))).usadoEm).toEqual({ automacoes: [], filtros: [], campanhas: [] })

    comoAdmin()
    expect((await salvarRegra({ id: regra.id!, nome: "Atacado em rede", fluxo: fluxoComCondicao("Formato", opcao("Formato", "Loja")), repeticao: { modo: "sempre" } })).erro).toBeUndefined()
    comoAdmin()
    expect(await tirarOpcao(campos.Formato.id, opcao("Formato", "Rede"))).toEqual({})
  })
})
