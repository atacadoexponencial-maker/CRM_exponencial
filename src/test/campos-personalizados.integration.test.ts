// @vitest-environment node
// B38-01 — campos personalizados: criar e editar os campos da empresa, as opções das
// listas, e gravar os valores no contato, com as permissões de cada papel. Bate no
// Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  adicionarOpcao,
  criarCampo,
  listarCamposParaGerenciar,
  moverOpcao,
  renomearCampo,
  renomearOpcao,
  marcarNaLista,
  moverCampo,
} from "@/app/(auth)/configuracoes/campos/actions"
import { camposDoContato, listarCamposDaEmpresa, salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { criarContato as cadastrarContato, filtrarContatos, valoresDoFiltro } from "@/app/(auth)/contatos/actions"
import { listarFiltrosSalvos, salvarFiltro } from "@/app/(auth)/contatos/filtros-salvos"
import { contarDestinatarios } from "@/app/(auth)/campanhas/actions"
import { campoDoFiltro, campoPersonalizado, comparacoesDoCampo, type Comparacao, type Filtro } from "@/lib/filtro-contatos"
import { TIPOS_DE_CAMPO, formatarValor } from "@/lib/campos-personalizados"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()

type Pessoa = { id: string; cliente: SupabaseClient }
let wsA = "", wsB = "", wsC = "", wsD = ""
const pessoas: Record<string, Pessoa> = {}
const contatos: Record<string, string> = {}
const usuarios: string[] = []

async function criarPessoa(chave: string, ws: string, role: string) {
  const email = `b38-${chave}-${ts}@campos-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: ws, name: `Pessoa ${chave}`, role, status: "active" })
  const cliente = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await cliente.auth.signInWithPassword({ email, password: SENHA })
  pessoas[chave] = { id, cliente }
}

/** As ações passam a rodar como esta pessoa. */
function como(chave: string) {
  vi.mocked(createSsrClient).mockResolvedValue(pessoas[chave].cliente as never)
}

async function criarContato(chave: string, ws: string, nome: string, n: number) {
  contatos[chave] = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55218${String(ts).slice(-6)}${n}` }).select("id").single()).data!.id
}

async function campoPorNome(nome: string) {
  como("admin")
  return (await listarCamposParaGerenciar()).find((c) => c.nome === nome)!
}

async function valorNoContato(contato: string, campoNome: string, quem = "admin") {
  como(quem)
  const campo = (await camposDoContato(contatos[contato]))!.find((c) => c.nome === campoNome)!
  return { campo, texto: formatarValor(campo, campo.valor) }
}

beforeAll(async () => {
  wsA = (await service.from("workspaces").insert({ name: `[TESTE] B38 A ${ts}` }).select("id").single()).data!.id
  wsB = (await service.from("workspaces").insert({ name: `[TESTE] B38 B ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", wsA, "admin")
  await criarPessoa("gerente", wsA, "gerente")
  await criarPessoa("atendente", wsA, "atendente")
  await criarPessoa("adminB", wsB, "admin")
  // B38-02: empresa só para conferir a ordem dos campos, começando do zero.
  wsC = (await service.from("workspaces").insert({ name: `[TESTE] B38 C ${ts}` }).select("id").single()).data!.id
  await criarPessoa("adminC", wsC, "admin")
  await criarContato("daC", wsC, "Loja da C", 3)
  // B38-02: contato que o atendente atende pela conversa (regra de pode_ver_contato).
  await criarContato("daConversa", wsA, "Loja da Conversa", 4)
  await service.from("conversations").insert({ workspace_id: wsA, contact_id: contatos.daConversa, assigned_to: pessoas.atendente.id })
  // B38-03: empresa com os dados do filtro; a empresa B ganha um contato (CA-B38-44).
  await criarContato("deB", wsB, "Loja da B", 5)
  wsD = (await service.from("workspaces").insert({ name: `[TESTE] B38 D ${ts}` }).select("id").single()).data!.id
  await criarPessoa("adminD", wsD, "admin")
  await criarPessoa("gerenteD", wsD, "gerente")
  await criarPessoa("atendenteD", wsD, "atendente")
  await criarContato("daCarteira", wsA, "Loja do Atendente", 1)
  await criarContato("outro", wsA, "Loja de Outro", 2)
  // O atendente atende o contato pelo card do funil (regra de pode_ver_contato).
  await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.daCarteira, funil: "entrada", etapa: "lead", atendente_id: pessoas.atendente.id })
}, 120_000)

afterAll(async () => {
  for (const ws of [wsA, wsB, wsC, wsD]) {
    await service.from("conversations").delete().eq("workspace_id", ws)
    await service.from("pipeline_cards").delete().eq("workspace_id", ws)
    await service.from("campos_personalizados").delete().eq("workspace_id", ws)
    await service.from("contacts").delete().eq("workspace_id", ws)
    await service.from("profiles").delete().eq("workspace_id", ws)
  }
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [wsA, wsB, wsC, wsD])
}, 120_000)

describe("B38-01 — campos personalizados", { timeout: 60_000 }, () => {
  it("CA-B38-01: should criar o campo de texto e mostrá-lo na lista com o tipo e 0 contatos preenchidos", async () => {
    como("admin")
    expect(await criarCampo("CNPJ", "texto")).toEqual({ id: expect.any(String) })
    const cnpj = (await listarCamposParaGerenciar()).find((c) => c.nome === "CNPJ")
    expect(cnpj).toMatchObject({ nome: "CNPJ", tipo: "texto", preenchidos: 0, opcoes: [] })
  })

  it("CA-B38-02: should deixar o Gerente criar e renomear um campo", async () => {
    como("gerente")
    const r = await criarCampo("Instagram", "link")
    expect(r.erro).toBeUndefined()
    expect(await renomearCampo(r.id!, "Instagram da loja")).toEqual({})
    const nomes = (await listarCamposParaGerenciar()).map((c) => c.nome)
    expect(nomes).toContain("Instagram da loja")
    expect(nomes).not.toContain("Instagram")
  })

  it("CA-B38-04: should oferecer os onze tipos na ordem da spec e criar um campo de cada", async () => {
    expect(TIPOS_DE_CAMPO.map((t) => t.rotulo)).toEqual([
      "Texto", "Texto longo", "Número", "Dinheiro", "Data", "Lista de opções", "Múltipla escolha", "Sim/não", "Link", "E-mail", "Telefone",
    ])
    como("admin")
    for (const t of TIPOS_DE_CAMPO) {
      const opcoes = t.id === "lista" || t.id === "multipla" ? ["Um", "Dois"] : []
      expect(await criarCampo(`Tipo ${t.rotulo}`, t.id, opcoes)).toEqual({ id: expect.any(String) })
    }
    const criados = (await listarCamposParaGerenciar()).filter((c) => c.nome.startsWith("Tipo "))
    expect(criados.map((c) => c.tipo)).toEqual(TIPOS_DE_CAMPO.map((t) => t.id))
    expect(criados.find((c) => c.tipo === "multipla")!.opcoes.map((o) => o.nome)).toEqual(["Um", "Dois"])
  })

  it("CA-B38-05: should recusar lista sem opção ou com opção repetida, sem criar nada", async () => {
    como("admin")
    expect(await criarCampo("Porte vazio", "lista", [])).toEqual({ erro: "A lista precisa de ao menos uma opção." })
    expect(await criarCampo("Linhas vazias", "multipla", [])).toEqual({ erro: "A lista precisa de ao menos uma opção." })
    expect(await criarCampo("Porte repetido", "lista", ["Grande", "grande "])).toEqual({ erro: 'A opção "grande" aparece duas vezes.' })
    expect(await criarCampo("Linhas repetidas", "multipla", ["Jeans", "Jeans"])).toEqual({ erro: 'A opção "Jeans" aparece duas vezes.' })
    const nomes = (await listarCamposParaGerenciar()).map((c) => c.nome)
    for (const n of ["Porte vazio", "Linhas vazias", "Porte repetido", "Linhas repetidas"]) expect(nomes).not.toContain(n)
  })

  it("CA-B38-06: should recusar criar ou renomear para um nome que já existe, com outra caixa ou espaço", async () => {
    como("admin")
    expect(await criarCampo("cnpj", "texto")).toEqual({ erro: "Já existe um campo com esse nome." })
    expect(await criarCampo("CNPJ ", "texto")).toEqual({ erro: "Já existe um campo com esse nome." })
    const instagram = await campoPorNome("Instagram da loja")
    expect(await renomearCampo(instagram.id, "cnpj")).toEqual({ erro: "Já existe um campo com esse nome." })
    expect((await listarCamposParaGerenciar()).filter((c) => c.nome.toLowerCase().trim() === "cnpj")).toHaveLength(1)
  })

  it("CA-B38-07: should recusar o nome de um dado fixo do contato", async () => {
    como("admin")
    expect(await criarCampo("Cidade", "texto")).toEqual({ erro: '"Cidade" já é o nome de um dado do sistema.' })
    expect(await criarCampo("Telefone", "telefone")).toEqual({ erro: '"Telefone" já é o nome de um dado do sistema.' })
    const nomes = (await listarCamposParaGerenciar()).map((c) => c.nome)
    expect(nomes).not.toContain("Cidade")
    expect(nomes).not.toContain("Telefone")
  })

  it("CA-B38-08: should recusar no banco a troca do tipo de um campo já criado", async () => {
    como("admin")
    const r = await criarCampo("Quantidade de lojas", "numero")
    const { error } = await pessoas.admin.cliente.from("campos_personalizados").update({ tipo: "texto" }).eq("id", r.id!)
    expect(error?.message).toContain("O tipo do campo não muda")
    expect((await campoPorNome("Quantidade de lojas")).tipo).toBe("numero")
  })

  it("CA-B38-09: should acrescentar, renomear e mover opções, e o contato passa a mostrar o nome novo", async () => {
    como("admin")
    const { id } = await criarCampo("Porte", "lista", ["Pequeno", "Médio", "Grande"])
    const porte = await campoPorNome("Porte")
    const medio = porte.opcoes.find((o) => o.nome === "Médio")!
    como("admin")
    expect(await salvarCamposDoContato(contatos.daCarteira, { [id!]: medio.id })).toEqual({})

    como("gerente")
    expect(await adicionarOpcao(id!, "Rede")).toEqual({})
    expect(await renomearOpcao(id!, medio.id, "Médio porte")).toEqual({})
    const grande = porte.opcoes.find((o) => o.nome === "Grande")!
    expect(await moverOpcao(id!, grande.id, "subir")).toEqual({})
    expect(await moverOpcao(id!, grande.id, "subir")).toEqual({})

    expect((await campoPorNome("Porte")).opcoes.map((o) => o.nome)).toEqual(["Grande", "Pequeno", "Médio porte", "Rede"])
    expect((await valorNoContato("daCarteira", "Porte")).texto).toBe("Médio porte")
  })

  it("CA-B38-18: should deixar o Gerente preencher um contato fora da carteira dele", async () => {
    const porte = await campoPorNome("Porte")
    const grande = porte.opcoes.find((o) => o.nome === "Grande")!
    como("gerente")
    expect(await salvarCamposDoContato(contatos.outro, { [porte.id]: grande.id })).toEqual({})
    expect((await valorNoContato("outro", "Porte", "gerente")).texto).toBe("Grande")
  })

  it("CA-B38-19: should deixar o Atendente preencher os campos de um contato que ele atende", async () => {
    const cnpj = await campoPorNome("CNPJ")
    como("atendente")
    expect(await salvarCamposDoContato(contatos.daCarteira, { [cnpj.id]: "12.345.678/0001-90" })).toEqual({})
    expect((await valorNoContato("daCarteira", "CNPJ", "atendente")).texto).toBe("12.345.678/0001-90")
  })

  it("CA-B38-20: should recusar o Atendente em contato que ele não atende, sem mudar o valor", async () => {
    const porte = await campoPorNome("Porte")
    const pequeno = porte.opcoes.find((o) => o.nome === "Pequeno")!
    como("atendente")
    expect(await camposDoContato(contatos.outro)).toBeNull()
    expect(await salvarCamposDoContato(contatos.outro, { [porte.id]: pequeno.id })).toEqual({ erro: "Contato não encontrado" })
    // Direto no banco, sem passar pela action, o RLS também recusa.
    const { error } = await pessoas.atendente.cliente
      .from("contato_campos")
      .upsert({ contact_id: contatos.outro, campo_id: porte.id, workspace_id: wsA, valor_opcoes: [pequeno.id] }, { onConflict: "contact_id,campo_id" })
    expect(error).not.toBeNull()
    expect((await valorNoContato("outro", "Porte")).texto).toBe("Grande")
  })

  it("CA-B38-21: should recusar no servidor os valores fora do formato, sem gravar nenhum", async () => {
    como("admin")
    const campos = await listarCamposParaGerenciar()
    const id = (nome: string) => campos.find((c) => c.nome === nome)!.id
    const r = await salvarCamposDoContato(contatos.outro, {
      [id("Tipo Número")]: "abc",
      [id("Tipo Dinheiro")]: "12,345",
      [id("Tipo E-mail")]: "fulano@",
      [id("Tipo Link")]: "não é link",
      [id("Tipo Telefone")]: "123",
      [id("CNPJ")]: "99.999.999/0001-99",
    })
    expect(r.erros).toEqual({
      [id("Tipo Número")]: "Digite um número.",
      [id("Tipo Dinheiro")]: "Digite um valor em reais, com até 2 casas depois da vírgula.",
      [id("Tipo E-mail")]: "E-mail inválido.",
      [id("Tipo Link")]: "Link inválido.",
      [id("Tipo Telefone")]: "Telefone inválido: use DDD e número, ou + e o código do país.",
    })
    expect((await valorNoContato("outro", "CNPJ")).texto).toBe("—")
  })

  it("CA-B38-23: should apagar o valor quando o campo é salvo vazio", async () => {
    const porte = await campoPorNome("Porte")
    como("admin")
    expect(await salvarCamposDoContato(contatos.outro, { [porte.id]: "" })).toEqual({})
    const { campo, texto } = await valorNoContato("outro", "Porte")
    expect(campo.valor).toBeNull()
    expect(texto).toBe("—")
    const { data } = await service.from("contato_campos").select("contact_id").eq("contact_id", contatos.outro).eq("campo_id", porte.id)
    expect(data).toEqual([])
  })
})

describe("B38-02 — campos no Chat, no cadastro e na lista", { timeout: 60_000 }, () => {
  it("CA-B38-11: should mudar a ordem dos campos na tela de campos, no perfil, no Chat e no cadastro", async () => {
    como("adminC")
    for (const [nome, tipo, opcoes] of [["CNPJ", "texto", []], ["Porte", "lista", ["Pequeno", "Grande"]], ["Instagram da loja", "link", []]] as const) {
      expect((await criarCampo(nome, tipo, [...opcoes])).erro).toBeUndefined()
    }
    const instagram = (await listarCamposParaGerenciar()).find((c) => c.nome === "Instagram da loja")!
    expect(await moverCampo(instagram.id, "subir")).toEqual({})
    expect(await moverCampo(instagram.id, "subir")).toEqual({})

    const esperado = ["Instagram da loja", "CNPJ", "Porte"]
    expect((await listarCamposParaGerenciar()).map((c) => c.nome)).toEqual(esperado)
    // O perfil e o painel do Chat leem os campos pela mesma action.
    expect((await camposDoContato(contatos.daC))!.map((c) => c.nome)).toEqual(esperado)
    expect((await listarCamposDaEmpresa()).map((c) => c.nome)).toEqual(esperado)
  })

  it("CA-B38-26: should gravar o Porte pelo Atendente da conversa e o perfil mostrar o mesmo valor", async () => {
    const porte = await campoPorNome("Porte")
    const pequeno = porte.opcoes.find((o) => o.nome === "Pequeno")!
    como("atendente")
    expect(await salvarCamposDoContato(contatos.daConversa, { [porte.id]: pequeno.id })).toEqual({})
    expect((await valorNoContato("daConversa", "Porte", "atendente")).texto).toBe("Pequeno")
    expect((await valorNoContato("daConversa", "Porte", "admin")).texto).toBe("Pequeno")
  })

  it("CA-B38-28: should criar o contato já com os campos preenchidos", async () => {
    const porte = await campoPorNome("Porte")
    const cnpj = await campoPorNome("CNPJ")
    const grande = porte.opcoes.find((o) => o.nome === "Grande")!
    como("admin")
    const r = await cadastrarContato({
      nome: "Loja Sol",
      telefone: `55219${String(ts).slice(-7, -1)}5`,
      campos: { [cnpj.id]: "12.345.678/0001-90", [porte.id]: grande.id },
    })
    expect(r.erro).toBeUndefined()
    contatos.sol = r.id!
    expect((await valorNoContato("sol", "CNPJ")).texto).toBe("12.345.678/0001-90")
    expect((await valorNoContato("sol", "Porte")).texto).toBe("Grande")
  })

  it("CA-B38-29: should criar o contato só com nome e telefone, com os campos vazios", async () => {
    como("admin")
    const r = await cadastrarContato({ nome: "Loja Lua", telefone: `55219${String(ts).slice(-7, -1)}6` })
    expect(r.erro).toBeUndefined()
    contatos.lua = r.id!
    como("admin")
    expect((await camposDoContato(r.id!))!.every((c) => c.valor === null)).toBe(true)
  })

  it("CA-B38-30: should recusar no servidor o e-mail fora do formato e não criar o contato", async () => {
    como("admin")
    const email = (await listarCamposParaGerenciar()).find((c) => c.tipo === "email")!
    const telefone = `55219${String(ts).slice(-7, -1)}7`
    const r = await cadastrarContato({ nome: "Loja Mar", telefone, campos: { [email.id]: "fulano@" } })
    expect(r).toEqual({ erros: { [email.id]: "E-mail inválido." } })
    const { data } = await service.from("contacts").select("id").eq("workspace_id", wsA).eq("phone_number", telefone)
    expect(data).toEqual([])
  })

  it("CA-B38-47: should trazer na lista só os campos marcados, para todos da empresa", async () => {
    const porte = await campoPorNome("Porte")
    const cnpj = await campoPorNome("CNPJ")
    como("admin")
    expect(await marcarNaLista(porte.id, true)).toEqual({})
    const daLista = async (quem: string) => {
      como(quem)
      const r = await filtrarContatos()
      if ("erro" in r) throw new Error(r.erro)
      return r.contatos.find((c) => c.id === contatos.daCarteira)!.campos!
    }
    const soPorte = await daLista("admin")
    expect(Object.keys(soPorte)).toEqual([porte.id])

    como("admin")
    expect(await marcarNaLista(cnpj.id, true)).toEqual({})
    como("admin")
    expect((await listarCamposDaEmpresa()).filter((c) => c.mostrarNaLista).map((c) => c.nome)).toEqual(["CNPJ", "Porte"])
    const doAtendente = await daLista("atendente")
    expect(Object.keys(doAtendente).sort()).toEqual([cnpj.id, porte.id].sort())
  })
})

describe("B38-03 — campos no filtro e nas campanhas", { timeout: 120_000 }, () => {
  // Empresa D: Porte com 5 Grande (2 em SP), 3 Pequeno e 4 sem valor (A, B, C e Vazio).
  // A, B e C têm os outros tipos; C fica sem nada.
  const campos: Record<string, { id: string; tipo: string; opcoes: Array<{ id: string; nome: string }> }> = {}
  const doD: Record<string, string> = {}
  const nomeDe = (id: string) => Object.entries(doD).find(([, v]) => v === id)?.[0]
  const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
  const opcao = (campo: string, nome: string) => campos[campo].opcoes.find((o) => o.nome === nome)!.id
  const so = (campo: string, comparacao: Comparacao, valores: string[] = []): Filtro => ({
    juncao: "e",
    grupos: [{ juncao: "e", condicoes: [{ campo: campoPersonalizado({ id: campos[campo].id, tipo: campos[campo].tipo }), comparacao, valores }] }],
  })

  async function nomes(filtro: Filtro, quem = "adminD", entre?: string[]) {
    como(quem)
    const r = await filtrarContatos({ filtro, limite: 200 })
    if ("erro" in r) throw new Error(r.erro)
    return r.contatos.map((c) => nomeDe(c.id)!).filter((n) => !entre || entre.includes(n)).sort()
  }

  beforeAll(async () => {
    como("adminD")
    const definicoes: Array<[string, string, string[]]> = [
      ["Porte", "lista", ["Pequeno", "Grande"]],
      ["Apelido", "texto", []],
      ["Endereço", "texto_longo", []],
      ["Lojas", "numero", []],
      ["Limite", "dinheiro", []],
      ["Aniversário", "data", []],
      ["Linhas", "multipla", ["Jeans", "Malha", "Praia"]],
      ["VIP", "sim_nao", []],
      ["Site", "link", []],
      ["E-mail fin", "email", []],
      ["Fone fin", "telefone", []],
    ]
    for (const [nome, tipo, opcoes] of definicoes) expect((await criarCampo(nome, tipo, opcoes)).erro).toBeUndefined()
    for (const c of await listarCamposParaGerenciar()) campos[c.nome] = { id: c.id, tipo: c.tipo, opcoes: c.opcoes }

    const pessoasD = ["G1", "G2", "G3", "G4", "G5", "P1", "P2", "P3", "A", "B", "C", "Vazio"]
    for (const [i, nome] of pessoasD.entries()) {
      const uf = nome === "G1" || nome === "G2" ? "SP" : "MG"
      doD[nome] = (await service.from("contacts").insert({ workspace_id: wsD, name: nome, uf, phone_number: `55319${String(ts).slice(-6)}${String(i).padStart(2, "0")}` }).select("id").single()).data!.id
    }
    const valor = (contato: string, campo: string, coluna: Record<string, unknown>) =>
      ({ contact_id: doD[contato], campo_id: campos[campo].id, workspace_id: wsD, ...coluna })
    const grande = opcao("Porte", "Grande"), pequeno = opcao("Porte", "Pequeno")
    const { error } = await service.from("contato_campos").insert([
      ...["G1", "G2", "G3", "G4", "G5"].map((n) => valor(n, "Porte", { valor_opcoes: [grande] })),
      ...["P1", "P2", "P3"].map((n) => valor(n, "Porte", { valor_opcoes: [pequeno] })),
      valor("A", "Apelido", { valor_texto: "Loja Bela" }),
      valor("B", "Apelido", { valor_texto: "Casa Rosa" }),
      valor("A", "Endereço", { valor_texto: "Rua das Flores, 10" }),
      valor("A", "Lojas", { valor_numero: 3 }),
      valor("B", "Lojas", { valor_numero: 10 }),
      valor("A", "Limite", { valor_numero: 1500.5 }),
      valor("B", "Limite", { valor_numero: 200 }),
      valor("A", "Aniversário", { valor_data: diasAtras(300) }),
      valor("B", "Aniversário", { valor_data: diasAtras(100) }),
      valor("A", "Linhas", { valor_opcoes: [opcao("Linhas", "Jeans"), opcao("Linhas", "Malha")] }),
      valor("B", "Linhas", { valor_opcoes: [opcao("Linhas", "Malha")] }),
      valor("A", "VIP", { valor_booleano: true }),
      valor("B", "VIP", { valor_booleano: false }),
      valor("A", "Site", { valor_texto: "https://loja.com" }),
      valor("B", "E-mail fin", { valor_texto: "fin@casa.com" }),
      valor("A", "Fone fin", { valor_texto: "21988887777" }),
    ])
    expect(error).toBeNull()
    // O Atendente D atende G1 e G3 (cards do funil).
    await service.from("pipeline_cards").insert([
      { workspace_id: wsD, contact_id: doD.G1, funil: "entrada", etapa: "lead", atendente_id: pessoas.atendenteD.id },
      { workspace_id: wsD, contact_id: doD.G3, funil: "entrada", etapa: "lead", atendente_id: pessoas.atendenteD.id },
    ])
  }, 120_000)

  it("CA-B38-31: should filtrar pelo Porte e contar os contatos, e trazer os 4 sem valor com está vazio", async () => {
    como("adminD")
    const r = await filtrarContatos({ filtro: so("Porte", "qualquer_de", [opcao("Porte", "Grande")]), limite: 200 })
    if ("erro" in r) throw new Error(r.erro)
    expect(r.total).toBe(5)
    expect(r.contatos.map((c) => nomeDe(c.id)).sort()).toEqual(["G1", "G2", "G3", "G4", "G5"])
    expect(await nomes(so("Porte", "vazio"))).toEqual(["A", "B", "C", "Vazio"])
  })

  it("CA-B38-32: should oferecer as comparações de cada tipo e trazer exatamente os contatos esperados", async () => {
    const comparacoes = (nome: string) => comparacoesDoCampo(campoDoFiltro(campoPersonalizado({ id: campos[nome].id, tipo: campos[nome].tipo }))!)
    expect(comparacoes("Apelido")).toEqual(["contem", "nao_contem", "igual", "nao_e", "vazio", "nao_vazio"])
    for (const n of ["Endereço", "Site", "E-mail fin", "Fone fin"]) expect(comparacoes(n)).toEqual(comparacoes("Apelido"))
    expect(comparacoes("Lojas")).toEqual(["igual", "maior", "menor", "entre", "vazio", "nao_vazio"])
    expect(comparacoes("Limite")).toEqual(comparacoes("Lojas"))
    expect(comparacoes("Aniversário")).toEqual(["antes", "depois", "entre", "ultimos_dias", "ha_mais_de_dias", "vazio", "nao_vazio"])
    expect(comparacoes("Porte")).toEqual(["qualquer_de", "nenhum_de", "vazio", "nao_vazio"])
    expect(comparacoes("Linhas")).toEqual(["tem_qualquer", "tem_todas", "nenhum_de", "vazio", "nao_vazio"])
    expect(comparacoes("VIP")).toEqual(["e", "vazio"])

    const ABC = ["A", "B", "C"]
    const casos: Array<[string, Comparacao, string[], string[]]> = [
      ["Apelido", "contem", ["loja"], ["A"]],
      ["Apelido", "nao_contem", ["loja"], ["B"]],
      ["Apelido", "igual", ["casa rosa"], ["B"]],
      ["Apelido", "nao_e", ["Casa Rosa"], ["A"]],
      ["Apelido", "vazio", [], ["C"]],
      ["Apelido", "nao_vazio", [], ["A", "B"]],
      ["Endereço", "contem", ["flores"], ["A"]],
      ["Endereço", "vazio", [], ["B", "C"]],
      ["Lojas", "igual", ["3"], ["A"]],
      ["Lojas", "maior", ["5"], ["B"]],
      ["Lojas", "menor", ["5"], ["A"]],
      ["Lojas", "entre", ["2", "4"], ["A"]],
      ["Lojas", "vazio", [], ["C"]],
      ["Lojas", "nao_vazio", [], ["A", "B"]],
      ["Limite", "maior", ["1000"], ["A"]],
      ["Limite", "igual", ["200"], ["B"]],
      ["Limite", "entre", ["100", "300"], ["B"]],
      ["Aniversário", "antes", [diasAtras(200)], ["A"]],
      ["Aniversário", "depois", [diasAtras(200)], ["B"]],
      ["Aniversário", "entre", [diasAtras(301), diasAtras(299)], ["A"]],
      ["Aniversário", "ultimos_dias", ["200"], ["B"]],
      ["Aniversário", "ha_mais_de_dias", ["200"], ["A"]],
      ["Aniversário", "vazio", [], ["C"]],
      ["Aniversário", "nao_vazio", [], ["A", "B"]],
      ["Linhas", "tem_qualquer", [opcao("Linhas", "Malha")], ["A", "B"]],
      ["Linhas", "tem_todas", [opcao("Linhas", "Jeans"), opcao("Linhas", "Malha")], ["A"]],
      ["Linhas", "nenhum_de", [opcao("Linhas", "Jeans")], ["B"]],
      ["Linhas", "vazio", [], ["C"]],
      ["Linhas", "nao_vazio", [], ["A", "B"]],
      ["VIP", "e", ["sim"], ["A"]],
      ["VIP", "e", ["nao"], ["B"]],
      ["VIP", "vazio", [], ["C"]],
      ["Site", "contem", ["loja.com"], ["A"]],
      ["Site", "vazio", [], ["B", "C"]],
      ["E-mail fin", "igual", ["fin@casa.com"], ["B"]],
      ["Fone fin", "contem", ["(21) 98888"], ["A"]],
      ["Fone fin", "igual", ["21988887777"], ["A"]],
    ]
    const divergentes: string[] = []
    for (const [campo, comparacao, valores, esperado] of casos) {
      const achados = await nomes(so(campo, comparacao, valores), "adminD", ABC)
      if (JSON.stringify(achados) !== JSON.stringify(esperado)) divergentes.push(`${campo} ${comparacao} ${valores.join(",")}: ${achados.join(",") || "nada"}`)
    }
    expect(divergentes).toEqual([])
    // Lista: "não é nenhum de" não traz quem está vazio.
    expect(await nomes(so("Porte", "nenhum_de", [opcao("Porte", "Grande")]))).toEqual(["P1", "P2", "P3"])
    expect(await nomes(so("Porte", "nao_vazio"))).toHaveLength(8)
  })

  it("CA-B38-33: should combinar o campo personalizado com a UF", async () => {
    const filtro: Filtro = {
      juncao: "e",
      grupos: [{
        juncao: "e",
        condicoes: [
          so("Porte", "qualquer_de", [opcao("Porte", "Grande")]).grupos[0].condicoes[0],
          { campo: "uf", comparacao: "qualquer_de", valores: ["SP"] },
        ],
      }],
    }
    expect(await nomes(filtro)).toEqual(["G1", "G2"])
  })

  it("CA-B38-34: should guardar o filtro salvo pelo Gerente e trazer os mesmos contatos depois de renomear", async () => {
    como("gerenteD")
    expect((await salvarFiltro("Lojas grandes", so("Porte", "qualquer_de", [opcao("Porte", "Grande")]))).erro).toBeUndefined()
    como("adminD")
    const salvo = (await listarFiltrosSalvos()).find((f) => f.nome === "Lojas grandes")!
    const grandes = ["G1", "G2", "G3", "G4", "G5"]
    expect(await nomes(salvo.filtro, "adminD")).toEqual(grandes)
    expect(await nomes(salvo.filtro, "gerenteD")).toEqual(grandes)

    como("adminD")
    expect(await renomearCampo(campos.Porte.id, "Porte da loja")).toEqual({})
    expect(await renomearOpcao(campos.Porte.id, opcao("Porte", "Grande"), "Grande porte")).toEqual({})
    expect(await nomes(salvo.filtro, "adminD")).toEqual(grandes)
  })

  it("CA-B38-35: should escolher o público da campanha com os mesmos contatos do filtro de Contatos", async () => {
    const filtro = so("Porte", "qualquer_de", [opcao("Porte", "Grande")])
    como("adminD")
    const publico = await contarDestinatarios({ filtro })
    expect(publico.total).toBe(5)
    expect(publico.amostra.map((d) => nomeDe(d.id)).sort()).toEqual(await nomes(filtro))
  })

  it("CA-B38-36: should trazer ao Atendente só os contatos que ele já via", async () => {
    expect(await nomes(so("Porte", "qualquer_de", [opcao("Porte", "Grande")]), "atendenteD")).toEqual(["G1", "G3"])
  })

  it("CA-B38-44: should esconder da empresa B os campos e os valores da A, e recusar o filtro e a gravação com o campo da A", async () => {
    // O campo e o contato são da empresa D; quem pede é o Admin da empresa B.
    const porteA = { ...campos["Porte da loja"] ?? campos.Porte }
    como("adminB")
    expect(await listarCamposParaGerenciar()).toEqual([])
    expect(await camposDoContato(doD.G1)).toBeNull()
    expect((await valoresDoFiltro()).campos).toEqual([])
    const filtro: Filtro = { juncao: "e", grupos: [{ juncao: "e", condicoes: [{ campo: campoPersonalizado(porteA), comparacao: "nao_vazio", valores: [] }] }] }
    expect(await filtrarContatos({ filtro })).toEqual({ erro: "Não foi possível aplicar o filtro." })
    expect(await salvarCamposDoContato(contatos.deB, { [porteA.id]: porteA.opcoes[0].id })).toEqual({ erro: "Campo não encontrado" })
    const { error } = await pessoas.adminB.cliente
      .from("contato_campos")
      .insert({ contact_id: contatos.deB, campo_id: porteA.id, workspace_id: wsB, valor_opcoes: [porteA.opcoes[0].id] })
    expect(error).not.toBeNull()
  })
})
