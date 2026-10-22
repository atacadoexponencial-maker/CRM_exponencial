// @vitest-environment node
// B37-01 — filtro avançado de contatos no banco de verdade (função filtrar_contatos).
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { filtrarContatos, type OpcoesDoFiltro } from "@/app/(auth)/contatos/actions"
import type { Condicao, Filtro } from "@/lib/filtro-contatos"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = {
  workspaceIds: [] as string[],
  userIds: [] as string[],
  conversationIds: [] as string[],
  cardIds: [] as string[],
}

const ts = Date.now()
const email = (quem: string) => `${quem}-${ts}@filtro-contatos-test.com`
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

async function criarWorkspace(nome: string) {
  const { data: ws } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}`)
  criados.workspaceIds.push(ws.id)
  return ws.id as string
}

async function criarUsuario(workspaceId: string, quem: string, role: "admin" | "atendente") {
  const { data: authData } = await serviceClient.auth.admin.createUser({
    email: email(quem),
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar user ${quem}`)
  await serviceClient.from("profiles").insert({
    id: authData.user.id,
    workspace_id: workspaceId,
    name: quem,
    role,
    status: "active",
  })
  criados.userIds.push(authData.user.id)
  return authData.user.id
}

type DadosContato = {
  name: string
  phone_number: string
  cidade?: string | null
  tipo?: string | null
  created_at?: string
  excluido_em?: string | null
}

async function criarContatos(workspaceId: string, contatos: DadosContato[]) {
  const { data, error } = await serviceClient
    .from("contacts")
    .insert(contatos.map((c) => ({ workspace_id: workspaceId, ...c })))
    .select("id, name")
  if (error || !data) throw new Error(`Falha ao criar contatos: ${error?.message}`)
  return Object.fromEntries(data.map((c) => [c.name as string, c.id as string]))
}

async function entrarComo(quem: string) {
  const client = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email: email(quem), password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${quem}: ${error.message}`)
  mockSsrCreateClient.mockResolvedValue(client as never)
}

async function filtrar(opcoes: OpcoesDoFiltro) {
  const r = await filtrarContatos({ limite: 200, ...opcoes })
  if ("erro" in r) throw new Error(r.erro)
  return { ids: r.contatos.map((c) => c.id), total: r.total }
}

const cond = (campo: string, comparacao: Condicao["comparacao"], ...valores: string[]): Condicao => ({ campo, comparacao, valores })
const umGrupo = (juncao: "e" | "ou", ...condicoes: Condicao[]): Filtro => ({ juncao: "e", grupos: [{ juncao, condicoes }] })
const ordenados = (ids: string[]) => [...ids].sort()

let A: Record<string, string>
let B: Record<string, string>
let maisAntigoDeB: string

beforeAll(async () => {
  const wsA = await criarWorkspace("Empresa Filtro A")
  const wsB = await criarWorkspace("Empresa Filtro B")
  await criarUsuario(wsA, "admin-a", "admin")
  await criarUsuario(wsB, "admin-b", "admin")
  const atendente1 = await criarUsuario(wsA, "atendente-1", "atendente")
  const atendente2 = await criarUsuario(wsA, "atendente-2", "atendente")

  A = await criarContatos(wsA, [
    { name: "Maria Loj", phone_number: `5585${ts % 1e7}01`, cidade: "Fortaleza", tipo: "lojista", created_at: diasAtras(3) },
    { name: "Maria Rev", phone_number: `5585${ts % 1e7}02`, cidade: "Fortaleza", tipo: "revendedor", created_at: diasAtras(2) },
    { name: "Ana Recife", phone_number: `5581${ts % 1e7}03`, cidade: "Recife", tipo: "lojista", created_at: diasAtras(1) },
    { name: "Sem Cidade", phone_number: `5511${ts % 1e7}04`, cidade: null, created_at: diasAtras(4) },
    { name: "Crato Novo", phone_number: `5588${ts % 1e7}05`, cidade: "Crato", created_at: diasAtras(5) },
    { name: "Crato Velho", phone_number: `5588${ts % 1e7}06`, cidade: "Crato", created_at: diasAtras(40) },
    {
      name: "Na Lixeira", phone_number: `5585${ts % 1e7}07`, cidade: "Fortaleza", tipo: "lojista",
      created_at: diasAtras(1), excluido_em: new Date().toISOString(),
    },
  ])

  // Empresa B: 55 contatos; o mais antigo é o único de Sobral (fora dos 50 primeiros).
  B = await criarContatos(
    wsB,
    Array.from({ length: 55 }, (_, i) => ({
      name: `B ${String(i).padStart(2, "0")}`,
      phone_number: `5511${ts % 1e7}${String(i).padStart(3, "0")}`,
      cidade: i === 54 ? "Sobral" : "Quixadá",
      created_at: diasAtras(i + 1),
    }))
  )
  maisAntigoDeB = B["B 54"]

  // Maria Loj é do Atendente 1 (conversa); Ana Recife, do Atendente 2 (card).
  const { data: conv } = await serviceClient
    .from("conversations")
    .insert({ workspace_id: wsA, contact_id: A["Maria Loj"], status: "em_espera", assigned_to: atendente1 })
    .select()
    .single()
  if (conv) criados.conversationIds.push(conv.id)
  const { data: card } = await serviceClient
    .from("pipeline_cards")
    .insert({ workspace_id: wsA, contact_id: A["Ana Recife"], etapa: "lead", funil: "entrada", atendente_id: atendente2 })
    .select()
    .single()
  if (card) criados.cardIds.push(card.id)
}, 60_000)

afterAll(async () => {
  if (criados.cardIds.length > 0) await serviceClient.from("pipeline_cards").delete().in("id", criados.cardIds)
  if (criados.conversationIds.length > 0) await serviceClient.from("conversations").delete().in("id", criados.conversationIds)
  if (criados.workspaceIds.length > 0) await serviceClient.from("contacts").delete().in("workspace_id", criados.workspaceIds)
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await serviceClient.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length > 0) await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
}, 60_000)

describe("B37-01 — filtro avançado de contatos no banco", { timeout: 30_000 }, () => {
  it("CA-B37-05: should trazer só quem satisfaz todas as condições de um grupo com E", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ filtro: umGrupo("e", cond("cidade", "igual", "Fortaleza"), cond("tipo", "e", "lojista")) })
    expect(r.ids).toEqual([A["Maria Loj"]])
  })

  it("CA-B37-06: should trazer quem satisfaz qualquer condição de um grupo com OU", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ filtro: umGrupo("ou", cond("cidade", "igual", "Fortaleza"), cond("cidade", "igual", "Recife")) })
    expect(ordenados(r.ids)).toEqual(ordenados([A["Maria Loj"], A["Maria Rev"], A["Ana Recife"]]))
  })

  it("CA-B37-07: should combinar grupos entre si", async () => {
    await entrarComo("admin-a")
    const filtro: Filtro = {
      juncao: "e",
      grupos: [
        { juncao: "ou", condicoes: [cond("cidade", "igual", "Fortaleza"), cond("cidade", "igual", "Recife")] },
        { juncao: "e", condicoes: [cond("tipo", "e", "lojista")] },
      ],
    }
    const r = await filtrar({ filtro })
    expect(ordenados(r.ids)).toEqual(ordenados([A["Maria Loj"], A["Ana Recife"]]))
    expect(r.ids).not.toContain(A["Maria Rev"])
  })

  it("CA-B37-08: should achar o contato que está além dos 50 primeiros da lista", async () => {
    await entrarComo("admin-b")
    const primeiraPagina = await filtrar({ limite: 50 })
    expect(primeiraPagina.ids).not.toContain(maisAntigoDeB)
    expect(primeiraPagina.total).toBe(55)

    const r = await filtrar({ filtro: umGrupo("e", cond("cidade", "igual", "Sobral")), limite: 50 })
    expect(r.ids).toEqual([maisAntigoDeB])
    expect(r.total).toBe(1)
  })

  it("CA-B37-14: should valer a busca por nome junto com o filtro", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ filtro: umGrupo("e", cond("tipo", "e", "lojista")), busca: "Maria" })
    expect(r.ids).toEqual([A["Maria Loj"]])
  })

  it("CA-B37-15: should ordenar o mesmo conjunto filtrado na ordem escolhida", async () => {
    await entrarComo("admin-a")
    const filtro = umGrupo("ou", cond("cidade", "igual", "Fortaleza"), cond("cidade", "igual", "Recife"))
    const recente = await filtrar({ filtro, ordem: "recente" })
    const nome = await filtrar({ filtro, ordem: "nome" })

    expect(ordenados(nome.ids)).toEqual(ordenados(recente.ids))
    expect(recente.ids).toEqual([A["Ana Recife"], A["Maria Rev"], A["Maria Loj"]])
    expect(nome.ids).toEqual([A["Ana Recife"], A["Maria Loj"], A["Maria Rev"]])
  })

  it("CA-B37-16: should deixar o atendente filtrar só dentro dos próprios contatos", async () => {
    await entrarComo("atendente-1")
    const r = await filtrar({ filtro: umGrupo("e", cond("tipo", "e", "lojista")) })
    expect(r.ids).toEqual([A["Maria Loj"]])
    expect(r.ids).not.toContain(A["Ana Recife"])
    expect(r.total).toBe(1)
  })

  it("CA-B37-17: should deixar de fora o contato na lixeira, também na contagem", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({ filtro: umGrupo("e", cond("cidade", "igual", "Fortaleza")) })
    expect(r.ids).not.toContain(A["Na Lixeira"])
    expect(r.total).toBe(2)
  })

  it("CA-B37-21: should filtrar pela data de cadastro nos últimos N dias", async () => {
    await entrarComo("admin-a")
    const r = await filtrar({
      filtro: umGrupo("e", cond("cidade", "igual", "Crato"), cond("data_cadastro", "ultimos_dias", "30")),
    })
    expect(r.ids).toEqual([A["Crato Novo"]])
  })

  it("CA-B37-37: should não trazer quem tem o campo vazio numa comparação negativa", async () => {
    await entrarComo("admin-a")
    const negativa = await filtrar({ filtro: umGrupo("e", cond("cidade", "nao_contem", "Fortaleza")) })
    expect(negativa.ids).toContain(A["Ana Recife"])
    expect(negativa.ids).not.toContain(A["Maria Loj"])
    expect(negativa.ids).not.toContain(A["Sem Cidade"])

    const vazio = await filtrar({ filtro: umGrupo("e", cond("cidade", "vazio")) })
    expect(vazio.ids).toEqual([A["Sem Cidade"]])
  })
})
