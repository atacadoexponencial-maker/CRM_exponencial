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
} from "@/app/(auth)/configuracoes/campos/actions"
import { camposDoContato, salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { TIPOS_DE_CAMPO, formatarValor } from "@/lib/campos-personalizados"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()

type Pessoa = { id: string; cliente: SupabaseClient }
let wsA = "", wsB = ""
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
  await criarContato("daCarteira", wsA, "Loja do Atendente", 1)
  await criarContato("outro", wsA, "Loja de Outro", 2)
  // O atendente atende o contato pelo card do funil (regra de pode_ver_contato).
  await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.daCarteira, funil: "entrada", etapa: "lead", atendente_id: pessoas.atendente.id })
}, 120_000)

afterAll(async () => {
  for (const ws of [wsA, wsB]) {
    await service.from("pipeline_cards").delete().eq("workspace_id", ws)
    await service.from("campos_personalizados").delete().eq("workspace_id", ws)
    await service.from("contacts").delete().eq("workspace_id", ws)
    await service.from("profiles").delete().eq("workspace_id", ws)
  }
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [wsA, wsB])
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
