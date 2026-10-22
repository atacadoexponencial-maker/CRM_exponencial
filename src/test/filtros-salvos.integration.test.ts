// @vitest-environment node
// B37-03 — filtros salvos no banco de verdade (tabela filtros_salvos e suas regras).
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  apagarFiltroSalvo,
  atualizarFiltroSalvo,
  listarFiltrosSalvos,
  moverFiltroSalvo,
  renomearFiltroSalvo,
  salvarFiltro,
} from "@/app/(auth)/contatos/filtros-salvos"
import { filtrarContatos } from "@/app/(auth)/contatos/actions"
import type { Condicao, Filtro } from "@/lib/filtro-contatos"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = { workspaceIds: [] as string[], userIds: [] as string[] }
const ts = Date.now()
const email = (quem: string) => `${quem}-${ts}@filtros-salvos-test.com`

async function criarWorkspace(nome: string) {
  const { data: ws } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}`)
  criados.workspaceIds.push(ws.id)
  return ws.id as string
}

async function criarUsuario(workspaceId: string, quem: string, role: "admin" | "gerente" | "atendente") {
  const { data: authData } = await serviceClient.auth.admin.createUser({
    email: email(quem),
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar user ${quem}`)
  await serviceClient.from("profiles").insert({ id: authData.user.id, workspace_id: workspaceId, name: quem, role, status: "active" })
  criados.userIds.push(authData.user.id)
  return authData.user.id
}

const clientes: Record<string, SupabaseClient> = {}

async function entrarComo(quem: string) {
  if (!clientes[quem]) {
    const client = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await client.auth.signInWithPassword({ email: email(quem), password: SENHA })
    if (error) throw new Error(`Falha ao autenticar ${quem}: ${error.message}`)
    clientes[quem] = client
  }
  mockSsrCreateClient.mockResolvedValue(clientes[quem] as never)
  return clientes[quem]
}

const cond = (campo: string, comparacao: Condicao["comparacao"], ...valores: string[]): Condicao => ({ campo, comparacao, valores })
const umGrupo = (juncao: "e" | "ou", ...condicoes: Condicao[]): Filtro => ({ juncao: "e", grupos: [{ juncao, condicoes }] })
const LOJISTAS_FORTALEZA = umGrupo("e", cond("cidade", "igual", "Fortaleza"), cond("tipo", "e", "lojista"))

let wsA: string
let contatoVip: string
let contatoRecife: string

beforeAll(async () => {
  wsA = await criarWorkspace("Empresa Salvos A")
  const wsB = await criarWorkspace("Empresa Salvos B")
  await criarUsuario(wsA, "admin-a", "admin")
  await criarUsuario(wsA, "gerente-a", "gerente")
  await criarUsuario(wsA, "atendente-a", "atendente")
  await criarUsuario(wsB, "admin-b", "admin")

  const { data } = await serviceClient
    .from("contacts")
    .insert([
      { workspace_id: wsA, name: "Loja VIP", phone_number: `5585${ts % 1e7}31`, cidade: "Fortaleza", tipo: "lojista" },
      { workspace_id: wsA, name: "Outro Recife", phone_number: `5581${ts % 1e7}32`, cidade: "Recife" },
    ])
    .select("id, name")
  contatoVip = data!.find((c) => c.name === "Loja VIP")!.id
  contatoRecife = data!.find((c) => c.name === "Outro Recife")!.id
  await serviceClient.from("contact_tags").insert({ workspace_id: wsA, contact_id: contatoVip, tag: "vip" })
}, 60_000)

afterAll(async () => {
  if (criados.workspaceIds.length > 0) {
    await serviceClient.from("filtros_salvos").delete().in("workspace_id", criados.workspaceIds)
    await serviceClient.from("contact_tags").delete().in("workspace_id", criados.workspaceIds)
    await serviceClient.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  }
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await serviceClient.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length > 0) await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
}, 60_000)

const salvoPorNome = async (nome: string) => (await listarFiltrosSalvos()).find((f) => f.nome === nome)

describe("B37-03 — filtros salvos no banco", { timeout: 30_000 }, () => {
  it("CA-B37-23: should deixar Admin e Gerente salvar o filtro com nome", async () => {
    await entrarComo("gerente-a")
    const r = await salvarFiltro("Lojistas de Fortaleza", LOJISTAS_FORTALEZA)
    expect(r.erro).toBeUndefined()
    const salvo = r.filtros?.find((f) => f.nome === "Lojistas de Fortaleza")
    expect(salvo?.filtro).toEqual(LOJISTAS_FORTALEZA)

    await entrarComo("admin-a")
    const doAdmin = await salvarFiltro("Do admin", umGrupo("e", cond("cidade", "igual", "Recife")))
    expect(doAdmin.erro).toBeUndefined()
    expect(doAdmin.filtros?.map((f) => f.nome)).toEqual(expect.arrayContaining(["Lojistas de Fortaleza", "Do admin"]))
  })

  it("CA-B37-24: should recusar nome repetido, sem diferença de maiúscula ou acento", async () => {
    await entrarComo("admin-a")
    const r = await salvarFiltro("  lojistas de FORTALÉZA ", LOJISTAS_FORTALEZA)
    expect(r.erro).toBe("Já existe um filtro com esse nome.")

    const outro = await salvoPorNome("Do admin")
    const renomeado = await renomearFiltroSalvo(outro!.id, "Lojistas de Fortaleza")
    expect(renomeado.erro).toBe("Já existe um filtro com esse nome.")
    expect((await listarFiltrosSalvos()).filter((f) => f.nome.toLowerCase().startsWith("lojistas"))).toHaveLength(1)
  })

  it("CA-B37-27: should valer a versão atualizada do filtro salvo para todos da empresa", async () => {
    await entrarComo("gerente-a")
    const salvo = await salvoPorNome("Lojistas de Fortaleza")
    const ajustado: Filtro = umGrupo("e", ...LOJISTAS_FORTALEZA.grupos[0].condicoes, cond("nome", "contem", "Loja"))
    const r = await atualizarFiltroSalvo(salvo!.id, ajustado)
    expect(r.erro).toBeUndefined()

    await entrarComo("admin-a")
    expect((await salvoPorNome("Lojistas de Fortaleza"))?.filtro).toEqual(ajustado)
  })

  it("CA-B37-28: should renomear o filtro salvo mantendo as condições", async () => {
    await entrarComo("admin-a")
    const antes = await salvoPorNome("Lojistas de Fortaleza")
    const r = await renomearFiltroSalvo(antes!.id, "Lojistas CE")
    expect(r.erro).toBeUndefined()
    const depois = await salvoPorNome("Lojistas CE")
    expect(depois?.id).toBe(antes!.id)
    expect(depois?.filtro).toEqual(antes!.filtro)
    expect(await salvoPorNome("Lojistas de Fortaleza")).toBeUndefined()
  })

  it("CA-B37-30: should mostrar o filtro salvo pelo Gerente para o Admin e o Atendente", async () => {
    await entrarComo("admin-a")
    expect(await salvoPorNome("Lojistas CE")).toBeDefined()
    await entrarComo("atendente-a")
    expect(await salvoPorNome("Lojistas CE")).toBeDefined()
  })

  it("CA-B37-31: should recusar no servidor salvar, atualizar, renomear, mover e apagar vindo do Atendente", async () => {
    const atendente = await entrarComo("atendente-a")
    const salvo = await salvoPorNome("Lojistas CE")
    const SEM = "Só Admin e Gerente mudam os filtros salvos."

    expect((await salvarFiltro("Do atendente", LOJISTAS_FORTALEZA)).erro).toBe(SEM)
    expect((await atualizarFiltroSalvo(salvo!.id, LOJISTAS_FORTALEZA)).erro).toBe(SEM)
    expect((await renomearFiltroSalvo(salvo!.id, "Meu")).erro).toBe(SEM)
    expect((await moverFiltroSalvo(salvo!.id, "direita")).erro).toBe(SEM)
    expect((await apagarFiltroSalvo(salvo!.id)).erro).toBe(SEM)

    // Direto no banco, sem passar pela action, a RLS também barra.
    const insert = await atendente
      .from("filtros_salvos")
      .insert({ workspace_id: wsA, nome: "Pelo banco", nome_chave: "pelo banco", filtro: LOJISTAS_FORTALEZA })
    expect(insert.error).not.toBeNull()
    const update = await atendente.from("filtros_salvos").update({ nome: "Pelo banco" }).eq("id", salvo!.id).select("id")
    expect(update.data ?? []).toHaveLength(0)
    const del = await atendente.from("filtros_salvos").delete().eq("id", salvo!.id).select("id")
    expect(del.data ?? []).toHaveLength(0)

    await entrarComo("admin-a")
    expect((await salvoPorNome("Lojistas CE"))?.filtro).toEqual(salvo!.filtro)
  })

  it("CA-B37-32: should esconder o filtro salvo de outra empresa", async () => {
    await entrarComo("admin-a")
    const salvo = await salvoPorNome("Lojistas CE")

    const adminB = await entrarComo("admin-b")
    expect(await listarFiltrosSalvos()).toEqual([])
    const direto = await adminB.from("filtros_salvos").select("id, filtro").eq("id", salvo!.id)
    expect(direto.data ?? []).toHaveLength(0)
    expect((await renomearFiltroSalvo(salvo!.id, "Invadido")).erro).toBe("Filtro não encontrado.")
    expect((await atualizarFiltroSalvo(salvo!.id, LOJISTAS_FORTALEZA)).erro).toBe("Filtro não encontrado.")
    expect((await apagarFiltroSalvo(salvo!.id)).erro).toBe("Filtro não encontrado.")

    await entrarComo("admin-a")
    expect((await salvoPorNome("Lojistas CE"))?.nome).toBe("Lojistas CE")
  })

  it("CA-B37-33: should não trazer ninguém pela condição cuja etiqueta foi apagada", async () => {
    await entrarComo("admin-a")
    const soVip = umGrupo("e", cond("etiqueta", "tem", "vip"))
    const vipOuRecife = umGrupo("ou", cond("etiqueta", "tem", "vip"), cond("cidade", "igual", "Recife"))
    await salvarFiltro("Com VIP", soVip)
    await salvarFiltro("VIP ou Recife", vipOuRecife)

    const antes = await filtrarContatos({ filtro: (await salvoPorNome("Com VIP"))!.filtro })
    expect("erro" in antes ? [] : antes.contatos.map((c) => c.id)).toEqual([contatoVip])

    await serviceClient.from("contact_tags").delete().eq("contact_id", contatoVip).eq("tag", "vip")

    const depois = await filtrarContatos({ filtro: (await salvoPorNome("Com VIP"))!.filtro })
    expect("erro" in depois ? null : depois.total).toBe(0)
    const comOu = await filtrarContatos({ filtro: (await salvoPorNome("VIP ou Recife"))!.filtro })
    expect("erro" in comOu ? [] : comOu.contatos.map((c) => c.id)).toEqual([contatoRecife])
  })

  it("CA-B37-38: should deixar Admin e Gerente escolher a ordem, com filtro novo no fim", async () => {
    await entrarComo("gerente-a")
    for (const nome of ["A ordem", "B ordem", "C ordem"]) {
      expect((await salvarFiltro(nome, umGrupo("e", cond("cidade", "contem", nome)))).erro).toBeUndefined()
    }
    const daOrdem = (lista: { nome: string }[]) => lista.map((f) => f.nome).filter((n) => n.endsWith(" ordem"))
    expect(daOrdem(await listarFiltrosSalvos())).toEqual(["A ordem", "B ordem", "C ordem"])

    const c = await salvoPorNome("C ordem")
    await moverFiltroSalvo(c!.id, "esquerda")
    await moverFiltroSalvo(c!.id, "esquerda")
    await entrarComo("admin-a")
    expect(daOrdem(await listarFiltrosSalvos())).toEqual(["C ordem", "A ordem", "B ordem"])

    await salvarFiltro("D ordem", umGrupo("e", cond("cidade", "contem", "D")))
    const todos = await listarFiltrosSalvos()
    expect(todos.at(-1)?.nome).toBe("D ordem")

    await entrarComo("atendente-a")
    expect((await moverFiltroSalvo(c!.id, "direita")).erro).toBe("Só Admin e Gerente mudam os filtros salvos.")
    expect(daOrdem(await listarFiltrosSalvos())).toEqual(["C ordem", "A ordem", "B ordem", "D ordem"])
  })
})
