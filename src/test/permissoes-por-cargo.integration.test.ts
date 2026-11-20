// @vitest-environment node
// B63-01 — o que Atendente e Gerente veem segue a escolha da empresa para o cargo:
// só os atribuídos, os dele e os sem dono, ou todos. Bate no Supabase real: o client
// SSR é o "navegador" de quem age. Na B63-01 a escolha é gravada direto no banco; a
// B63-02 confere a leitura e a gravação pelas actions da tela de Permissões.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(async () => ({
    canal: "meta",
    enviarTexto: async () => ({ ok: true, mensagemId: `wamid.b63.${Math.random()}` }),
  })),
}))
vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
  transmitirContatoExcluido: vi.fn().mockResolvedValue(undefined),
  transmitirContatoRestaurado: vi.fn().mockResolvedValue(undefined),
}))

import { listarContatos, buscarDadosContato, filtrarContatos } from "@/app/(auth)/contatos/actions"
import { carregarMaisConversas, atribuirConversa, buscarConversa, enviarMensagem } from "@/app/(auth)/chat/actions"
import { listarCardsEntrada } from "@/app/(auth)/pipeline/actions"
import { listarLixeira } from "@/app/(auth)/contatos/lixeira/actions"
import { listarEsperandoResposta } from "@/app/(auth)/dashboard/actions"
import { carregarPermissoes, salvarPermissoes } from "@/app/(auth)/configuracoes/permissoes/actions"
import type { Alcance } from "@/lib/alcance"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const fim = String(ts).slice(-6)
const SENHA = "senha-segura-123"
let ws = "", adminId = "", anaId = "", colegaId = "", gerenteId = ""
// B63-02: a empresa B, recém-criada, com o padrão
let wsB = "", adminBId = "", atendenteBId = ""
const navegadores: Record<string, SupabaseClient> = {}
type Contato = { id: string; card: string; conversa: string }
// X é da Ana, Y do colega, Z sem dono; W, sem dono, está na lixeira
let x: Contato, y: Contato, z: Contato, w: Contato
let telefone = 0
const FUTURO = new Date(Date.now() + 86_400_000).toISOString()

async function criarPessoa(nome: string, role: string, empresa = ws) {
  const email = `b63-01-${nome.toLowerCase()}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role, status: "active" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await navegador.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  navegadores[id] = navegador
  return id
}
const entrarComo = (id: string) => { clienteDaVez = navegadores[id] }

/** Contato com um dono só: o mesmo no contato, no card da Entrada e na conversa, com uma mensagem sem resposta. */
async function contatoDe(nome: string, dono: string | null, empresa = ws): Promise<Contato> {
  telefone += 1
  const id = (await service.from("contacts").insert({ workspace_id: empresa, name: nome, phone_number: `55819${fim}${String(telefone).padStart(2, "0")}`, atendente_id: dono }).select("id").single()).data!.id
  const card = (await service.from("pipeline_cards").insert({ workspace_id: empresa, contact_id: id, funil: "entrada", etapa: "lead", atendente_id: dono }).select("id").single()).data!.id
  const conversa = (await service.from("conversations").insert({ workspace_id: empresa, contact_id: id, assigned_to: dono, status: dono ? "em_atendimento" : "em_espera" }).select("id").single()).data!.id
  await service.from("messages").insert({ workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto", content: `oi, aqui é ${nome}` })
  return { id, card, conversa }
}

async function escolher(cargo: "atendente" | "gerente", alcance: Alcance) {
  const { error } = await service.from("workspaces").update({ [`alcance_${cargo}`]: alcance }).eq("id", ws)
  if (error) throw new Error(error.message)
}

/** O que a pessoa vê nas três telas: ids das conversas, dos contatos e dos cards. */
async function oQueVe(id: string) {
  entrarComo(id)
  const [conversas, contatos, cards] = await Promise.all([carregarMaisConversas(FUTURO), listarContatos(), listarCardsEntrada()])
  return { conversas: conversas.map((c) => c.id), contatos: contatos.map((c) => c.id), cards: cards.map((c) => c.id) }
}

/** Ids e total que a busca ou o filtro de Contatos devolve a quem está logado. */
async function doFiltro(opcoes: Parameters<typeof filtrarContatos>[0]) {
  const r = await filtrarContatos(opcoes)
  if ("erro" in r) throw new Error(r.erro)
  return { ids: r.contatos.map((c) => c.id), total: r.total }
}
const PELO_NOME = { busca: "Zeca", limite: 50 } as Parameters<typeof filtrarContatos>[0]
const PELA_ETIQUETA = {
  filtro: { juncao: "e" as const, grupos: [{ juncao: "e" as const, condicoes: [{ campo: "etiqueta", comparacao: "tem", valores: ["vip-b63"] }] }] },
  limite: 50,
} as Parameters<typeof filtrarContatos>[0]

function confereQueVe(visto: Awaited<ReturnType<typeof oQueVe>>, quem: Contato[], naoVe: Contato[]) {
  for (const c of quem) {
    expect(visto.conversas).toContain(c.conversa)
    expect(visto.contatos).toContain(c.id)
    expect(visto.cards).toContain(c.card)
  }
  for (const c of naoVe) {
    expect(visto.conversas).not.toContain(c.conversa)
    expect(visto.contatos).not.toContain(c.id)
    expect(visto.cards).not.toContain(c.card)
  }
}

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B63-01 ${ts}` }).select("id").single()).data!.id
  adminId = await criarPessoa("Admin", "admin")
  anaId = await criarPessoa("Ana", "atendente")
  colegaId = await criarPessoa("Colega", "atendente")
  gerenteId = await criarPessoa("Gerente", "gerente")
  x = await contatoDe("Xavier", anaId)
  y = await contatoDe("Yara", colegaId)
  z = await contatoDe("Zeca", null)
  w = await contatoDe("Wanda", null)
  await service.from("contacts").update({ excluido_em: new Date().toISOString() }).eq("id", w.id)
  await service.from("contact_tags").insert({ workspace_id: ws, contact_id: z.id, tag: "vip-b63" })
  await service.from("contact_purchases").insert({ workspace_id: ws, contact_id: z.id, data: "2026-11-10", valor: 250 })
  await service.from("pipeline_card_notes").insert({ workspace_id: ws, card_id: z.card, autor_id: adminId, texto: "Nota do Zeca" })
}, 120_000)

afterAll(async () => {
  const empresas = [ws, wsB].filter(Boolean)
  await service.from("carteira_historico").delete().in("workspace_id", empresas)
  const { data: conversas } = await service.from("conversations").select("id").in("workspace_id", empresas)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().in("workspace_id", empresas)
  await service.from("contact_purchases").delete().in("workspace_id", empresas)
  await service.from("contacts").delete().in("workspace_id", empresas)
  for (const id of [adminId, anaId, colegaId, gerenteId, adminBId, atendenteBId].filter(Boolean)) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", empresas)
}, 120_000)

describe("B63-01 — Cada cargo vê o que a empresa escolheu", { timeout: 60_000 }, () => {
  it("CA-B63-07: should mostrar à atendente em 'Só os atribuídos a ele' só a X, sem a Y nem a Z", async () => {
    // Elas existem: o banco, sem regra, acha as três
    const { data } = await service.from("conversations").select("id").in("id", [x.conversa, y.conversa, z.conversa])
    expect(data).toHaveLength(3)

    await escolher("atendente", "atribuidos")
    confereQueVe(await oQueVe(anaId), [x], [y, z])
  })

  it("CA-B63-08: should mostrar à atendente em 'Os dele e os sem dono' a X e a Z, sem a Y", async () => {
    await escolher("atendente", "atribuidos_e_sem_dono")
    confereQueVe(await oQueVe(anaId), [x, z], [y])
  })

  it("CA-B63-09: should mostrar à atendente em 'Todos da empresa' a X, a Y e a Z, e recusar ela atribuir a Y a si mesma", async () => {
    await escolher("atendente", "todos")
    confereQueVe(await oQueVe(anaId), [x, y, z], [])

    entrarComo(anaId)
    await expect(atribuirConversa(y.conversa, anaId)).rejects.toThrow("Sem permissão")
    const { data: conversa } = await service.from("conversations").select("assigned_to").eq("id", y.conversa).single()
    const { data: contato } = await service.from("contacts").select("atendente_id").eq("id", y.id).single()
    expect([conversa?.assigned_to, contato?.atendente_id]).toEqual([colegaId, colegaId])
  })

  it("CA-B63-10: should esconder do gerente em 'Só os atribuídos a ele' a X, a Y e a Z", async () => {
    await escolher("gerente", "atribuidos")
    confereQueVe(await oQueVe(gerenteId), [], [x, y, z])
    await escolher("gerente", "todos")
  })

  it("CA-B63-11: should mostrar ao admin a X, a Y e a Z com os dois cargos em 'Só os atribuídos a ele'", async () => {
    await escolher("atendente", "atribuidos")
    await escolher("gerente", "atribuidos")
    confereQueVe(await oQueVe(adminId), [x, y, z], [])
    await escolher("gerente", "todos")
  })

  it("CA-B63-12: should não deixar a Z aparecer para a atendente por endereço, busca, filtro, compras, notas, lixeira nem contagem", async () => {
    await escolher("atendente", "atribuidos")

    // Tudo isto existe: o banco, sem regra, acha cada um
    const existem = await Promise.all([
      service.from("contact_tags").select("tag").eq("contact_id", z.id),
      service.from("contact_purchases").select("id").eq("contact_id", z.id),
      service.from("pipeline_card_notes").select("id").eq("card_id", z.card),
      service.from("contacts").select("id").eq("id", w.id).not("excluido_em", "is", null),
    ])
    expect(existem.map((r) => r.data?.length)).toEqual([1, 1, 1, 1])
    // E quem vê tudo abre a Z pelo endereço e a acha pela busca, pelo filtro e na contagem
    entrarComo(adminId)
    expect((await buscarConversa(z.conversa))?.id).toBe(z.conversa)
    expect(await doFiltro(PELO_NOME)).toEqual({ ids: [z.id], total: 1 })
    expect(await doFiltro(PELA_ETIQUETA)).toEqual({ ids: [z.id], total: 1 })
    expect((await listarEsperandoResposta()).conversas.map((c) => c.conversaId)).toContain(z.conversa)

    entrarComo(anaId)
    expect(await buscarConversa(z.conversa)).toBeNull()
    expect(await buscarDadosContato(z.id)).toBeNull()
    expect(await doFiltro(PELO_NOME)).toEqual({ ids: [], total: 0 })
    expect(await doFiltro(PELA_ETIQUETA)).toEqual({ ids: [], total: 0 })

    const navegador = navegadores[anaId]
    const [tags, compras, notas] = await Promise.all([
      navegador.from("contact_tags").select("tag").eq("contact_id", z.id),
      navegador.from("contact_purchases").select("id").eq("contact_id", z.id),
      navegador.from("pipeline_card_notes").select("id").eq("card_id", z.card),
    ])
    expect([tags.data, compras.data, notas.data]).toEqual([[], [], []])

    expect((await listarLixeira()).map((c) => c.id)).not.toContain(w.id)

    const esperando = await listarEsperandoResposta()
    expect(esperando.conversas.map((c) => c.conversaId)).toEqual([x.conversa])
    expect(esperando.total).toBe(1)
  })

  it("CA-B63-13: should tirar da tela da Ana a conversa, o contato e o card que o admin atribui ao colega", async () => {
    await escolher("atendente", "atribuidos")
    confereQueVe(await oQueVe(anaId), [x], [])

    entrarComo(adminId)
    await atribuirConversa(x.conversa, colegaId)

    confereQueVe(await oQueVe(anaId), [], [x])
    confereQueVe(await oQueVe(colegaId), [x, y], [z])
  })
})

const guardado = async (empresa: string) =>
  (await service.from("workspaces").select("alcance_atendente, alcance_gerente").eq("id", empresa).single()).data

describe("B63-02 — Tela de Permissões pelo servidor", { timeout: 60_000 }, () => {
  let xB: Contato, zB: Contato

  beforeAll(async () => {
    // Recém-criada como no cadastro: só o nome, o resto é o padrão do banco
    wsB = (await service.from("workspaces").insert({ name: `[TESTE] B63-02 B ${ts}` }).select("id").single()).data!.id
    adminBId = await criarPessoa("AdminB", "admin", wsB)
    atendenteBId = await criarPessoa("AtendenteB", "atendente", wsB)
    xB = await contatoDe("Xuxa B", atendenteBId, wsB)
    zB = await contatoDe("Zilda B", null, wsB)
  }, 120_000)

  it("CA-B63-05: should abrir a tela da empresa recém-criada com Atendente em 'atribuidos' e Gerente em 'todos'", async () => {
    expect(await guardado(wsB)).toEqual({ alcance_atendente: "atribuidos", alcance_gerente: "todos" })
    entrarComo(adminBId)
    expect(await carregarPermissoes()).toEqual({ atendente: "atribuidos", gerente: "todos" })
  })

  it("CA-B63-01: should trazer para a tela do Admin a escolha gravada da empresa", async () => {
    await escolher("atendente", "atribuidos_e_sem_dono")
    await escolher("gerente", "todos")
    entrarComo(adminId)
    expect(await carregarPermissoes()).toEqual({ atendente: "atribuidos_e_sem_dono", gerente: "todos" })
  })

  it("CA-B63-02: should recusar ao Gerente e ao Atendente abrir e salvar as permissões, sem mudar a escolha guardada", async () => {
    await escolher("atendente", "atribuidos_e_sem_dono")
    const antes = await guardado(ws)
    for (const id of [gerenteId, anaId]) {
      entrarComo(id)
      expect(await carregarPermissoes()).toBeNull()
      expect(await salvarPermissoes({ atendente: "todos", gerente: "atribuidos" })).toEqual({ erro: "Sem permissão" })
    }
    expect(await guardado(ws)).toEqual(antes)
  })

  it("CA-B63-03: should tirar do Chat da atendente a conversa sem dono depois de o Admin salvar 'Só os atribuídos a ele'", async () => {
    await escolher("atendente", "atribuidos_e_sem_dono")
    expect((await oQueVe(anaId)).conversas).toContain(z.conversa)

    entrarComo(adminId)
    expect(await salvarPermissoes({ atendente: "atribuidos", gerente: "todos" })).toEqual({})
    expect(await guardado(ws)).toEqual({ alcance_atendente: "atribuidos", alcance_gerente: "todos" })

    expect((await oQueVe(anaId)).conversas).not.toContain(z.conversa)
  })

  it("B63-02, cenário de erro: should recusar opção fora das três sem gravar", async () => {
    entrarComo(adminId)
    const antes = await guardado(ws)
    expect(await salvarPermissoes({ atendente: "qualquer" as never, gerente: "todos" })).toEqual({ erro: "Escolha uma das opções." })
    expect(await guardado(ws)).toEqual(antes)
  })

  it("CA-B63-04: should manter o atendente da empresa B vendo só o dele quando o Admin da A salva", async () => {
    await escolher("atendente", "todos")
    confereQueVe(await oQueVe(atendenteBId), [xB], [zB])

    entrarComo(adminId)
    expect(await salvarPermissoes({ atendente: "atribuidos_e_sem_dono", gerente: "todos" })).toEqual({})

    expect(await guardado(wsB)).toEqual({ alcance_atendente: "atribuidos", alcance_gerente: "todos" })
    confereQueVe(await oQueVe(atendenteBId), [xB], [zB])
  })
})

/** O dono gravado na conversa, no contato e no card. */
async function donos(c: Contato) {
  const [conversa, contato, card] = await Promise.all([
    service.from("conversations").select("assigned_to").eq("id", c.conversa).single(),
    service.from("contacts").select("atendente_id").eq("id", c.id).single(),
    service.from("pipeline_cards").select("atendente_id").eq("id", c.card).single(),
  ])
  return [conversa.data?.assigned_to, contato.data?.atendente_id, card.data?.atendente_id]
}

describe("B63-03 — Quem responde conversa sem dono vira o dono", { timeout: 60_000 }, () => {
  it("CA-B63-14: should fazer do Admin o dono da conversa, do contato e do card ao responder a conversa sem dono, e tirá-la da atendente", async () => {
    const nina = await contatoDe("Nina", null)
    await escolher("atendente", "atribuidos_e_sem_dono")
    expect(await donos(nina)).toEqual([null, null, null])
    expect((await oQueVe(anaId)).conversas).toContain(nina.conversa)

    entrarComo(adminId)
    expect((await enviarMensagem(nina.conversa, "Oi, Nina! Posso ajudar?")).erro).toBeUndefined()

    expect(await donos(nina)).toEqual([adminId, adminId, adminId])
    const { data: historico } = await service.from("carteira_historico").select("de_atendente_id, para_atendente_id, motivo").eq("contact_id", nina.id)
    expect(historico).toEqual([{ de_atendente_id: null, para_atendente_id: adminId, motivo: "pelo_chat" }])
    confereQueVe(await oQueVe(anaId), [], [nina])
  })

  it("CA-B63-15: should manter com o colega a conversa dele quando o Admin e o Gerente respondem", async () => {
    await escolher("gerente", "todos")
    expect(await donos(y)).toEqual([colegaId, colegaId, colegaId])

    for (const id of [adminId, gerenteId]) {
      entrarComo(id)
      expect((await enviarMensagem(y.conversa, "Oi, Yara!")).erro).toBeUndefined()
    }

    const { data: enviadas } = await service.from("messages").select("id").eq("conversation_id", y.conversa).eq("direction", "enviada")
    expect(enviadas).toHaveLength(2)
    expect(await donos(y)).toEqual([colegaId, colegaId, colegaId])
  })
})
