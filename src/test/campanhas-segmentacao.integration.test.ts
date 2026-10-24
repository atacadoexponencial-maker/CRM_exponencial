// @vitest-environment node
// B42-02 — a campanha escolhe quem recebe pelo filtro de Contatos, no banco de verdade.
// Única coisa mockada: @/integrations/supabase/server, para injetar um cliente
// autenticado de verdade no lugar do cliente baseado em cookies do SSR.
// A regra antiga da campanha (antes da B42-02) é refeita aqui, em `regraAntiga`, para
// conferir que a conversão das campanhas antigas dá o mesmo resultado (CA-B42-28).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn(async () => 0) }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  buscarCampanha,
  confirmarCampanha,
  contarDestinatarios,
  criarReenvioParaFalhos,
  relatorioCampanha,
  salvarRascunho,
  type DadosCampanha,
  type Segmento,
} from "@/app/(auth)/campanhas/actions"
import { filtrarContatos } from "@/app/(auth)/contatos/actions"
import { criarFunil } from "@/app/(auth)/configuracoes/funis/actions"
import { calcularClassificacao } from "@/app/(auth)/contatos/classificacao"
import { campoDoFunil, type Condicao, type Filtro } from "@/lib/filtro-contatos"
import { hojeNoFuso } from "@/lib/relatorios/visao-geral"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SENHA = "senha-test-123!"
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const final = String(ts).slice(-7)

const empresas: string[] = []
const usuarios: Record<string, string> = {}
const clientes: Record<string, SupabaseClient> = {}
const c: Record<string, string> = {}
let ws = ""
let ws2 = ""
let ws3 = ""
let feira = ""
let visitou = ""

async function criarPessoa(chave: string, empresa: string, role: "admin" | "atendente", nome = `Pessoa ${chave}`) {
  const email = `b42-02-${chave}-${ts}@campanhas-test.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios[chave] = id
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role, status: "active" })
  const cliente = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(error.message)
  clientes[chave] = cliente
}
const como = (chave: string) => vi.mocked(createSsrClient).mockResolvedValue(clientes[chave] as never)

async function criarEmpresa(nome: string) {
  const id = (await service.from("workspaces").insert({ name: `[TESTE] B42-02 ${nome} ${ts}` }).select("id").single()).data!.id as string
  empresas.push(id)
  return id
}

type NovoContato = { name: string; phone_number: string; cidade?: string; tipo?: string; atendente_id?: string; excluido_em?: string }
async function criarContatos(empresa: string, lista: NovoContato[]) {
  const { data, error } = await service.from("contacts").insert(lista.map((x) => ({ workspace_id: empresa, ...x }))).select("id, name")
  if (error || !data) throw new Error(error?.message)
  for (const x of data) c[x.name as string] = x.id as string
}
const tel = (ddd: string, i: number) => `55${ddd}${final}${String(i).padStart(2, "0")}`

const cond = (campo: string, comparacao: Condicao["comparacao"], ...valores: string[]): Condicao => ({ campo, comparacao, valores })
const umGrupo = (...condicoes: Condicao[]): Filtro => ({ juncao: "e", grupos: [{ juncao: "e", condicoes }] })
const ordenados = (lista: string[]) => [...lista].sort()

async function contar(segmento: Segmento) {
  const r = await contarDestinatarios(segmento)
  return { total: r.total, ids: ordenados(r.amostra.map((d) => d.id)) }
}

const dados = (nome: string, segmento: Segmento): DadosCampanha => ({
  nome, segmento, tipoMensagem: "texto", conteudo: "Oi!", arquivoUrl: null, arquivoNome: null,
})
const amanha = () => new Date(Date.now() + 86_400_000).toISOString()

async function campanhaPeloNome(nome: string) {
  return (await service.from("campaigns").select("id").eq("workspace_id", ws).eq("nome", nome).single()).data!.id as string
}
async function destinatariosGravados(campanha: string) {
  const { data } = await service.from("campaign_recipients").select("contact_id").eq("campaign_id", campanha)
  return ordenados((data ?? []).map((r) => r.contact_id as string))
}

/** A regra da campanha antes da B42-02, como estava em actions.ts. */
async function regraAntiga(segmento: Segmento) {
  const { data: contatos } = await service
    .from("contacts")
    .select("id, phone_number, tipo, cidade, atendente_id")
    .eq("workspace_id", ws)
    .is("excluido_em", null)
  let lista = (contatos ?? []).filter((x) => /^55\d{10,11}$/.test(x.phone_number as string))
  if (segmento.tipos?.length) lista = lista.filter((x) => segmento.tipos!.includes(x.tipo as string))
  // ilike: ignora maiúscula, não ignora acento
  if (segmento.cidade?.trim()) lista = lista.filter((x) => String(x.cidade ?? "").toLowerCase().includes(segmento.cidade!.trim().toLowerCase()))
  if (segmento.atendenteId) lista = lista.filter((x) => x.atendente_id === segmento.atendenteId)
  if (segmento.tags?.length) {
    const { data: tags } = await service.from("contact_tags").select("contact_id").eq("workspace_id", ws).in("tag", segmento.tags)
    const comTag = new Set((tags ?? []).map((t) => t.contact_id))
    lista = lista.filter((x) => comTag.has(x.id))
  }
  if (segmento.classificacoes?.length) {
    const { data: cards } = await service.from("pipeline_cards").select("contact_id, funil, etapa").in("contact_id", lista.map((x) => x.id))
    lista = lista.filter((x) =>
      segmento.classificacoes!.includes(calcularClassificacao((cards ?? []).filter((k) => k.contact_id === x.id).map((k) => ({ funil: k.funil, etapa: k.etapa }))))
    )
  }
  return ordenados(lista.map((x) => x.id as string))
}

beforeAll(async () => {
  ws = await criarEmpresa("A")
  ws2 = await criarEmpresa("B")
  ws3 = await criarEmpresa("C")
  await criarPessoa("admin", ws, "admin")
  await criarPessoa("ana", ws, "atendente", "Ana")
  await criarPessoa("admin2", ws2, "admin")
  await criarPessoa("admin3", ws3, "admin")

  await criarContatos(ws, [
    { name: "FL", phone_number: tel("85", 1), cidade: "Fortaleza", tipo: "lojista" },
    { name: "FR", phone_number: tel("85", 2), cidade: "Fortaleza", tipo: "revendedor" },
    { name: "RL", phone_number: tel("81", 3), cidade: "Recife", tipo: "lojista" },
    { name: "SP", phone_number: tel("11", 4), cidade: "São Paulo", tipo: "lojista", atendente_id: usuarios.ana },
    { name: "Feira", phone_number: tel("11", 5) },
    { name: "Neg2", phone_number: tel("84", 6), cidade: "Natal" },
    { name: "Invalido", phone_number: "5585123", cidade: "Fortaleza", tipo: "lojista" },
    { name: "Lixeira", phone_number: tel("85", 8), cidade: "Fortaleza", tipo: "lojista", excluido_em: new Date().toISOString() },
    { name: "Sem nada", phone_number: tel("11", 9) },
  ])
  await criarContatos(ws2, [{ name: "FL2", phone_number: tel("85", 21), cidade: "Fortaleza", tipo: "lojista" }])
  await criarContatos(ws3, [
    ...Array.from({ length: 30 }, (_, i) => ({ name: `C3 ${i}`, phone_number: tel("31", 30 + i) })),
    { name: "C3 invalido", phone_number: "553112" },
    { name: "C3 lixeira", phone_number: tel("31", 99), excluido_em: new Date().toISOString() },
  ])

  como("admin")
  feira = (await criarFunil("Feira de Março", [{ nome: "Convidado" }, { nome: "Visitou o estande" }])).id!
  visitou = (await service.from("funil_etapas").select("id").eq("funil_id", feira).eq("nome", "Visitou o estande").single()).data!.id

  await service.from("pipeline_cards").insert([
    { workspace_id: ws, contact_id: c.FL, funil: "entrada", etapa: "negociacao" },
    { workspace_id: ws, contact_id: c.Neg2, funil: "entrada", etapa: "negociacao" },
    { workspace_id: ws, contact_id: c.Invalido, funil: "entrada", etapa: "negociacao" },
    { workspace_id: ws, contact_id: c.Lixeira, funil: "entrada", etapa: "negociacao" },
    { workspace_id: ws, contact_id: c.RL, funil: "recompra", etapa: "reposicao" },
    { workspace_id: ws, contact_id: c.Feira, funil: feira, etapa: visitou },
    { workspace_id: ws2, contact_id: c.FL2, funil: "entrada", etapa: "negociacao" },
  ])
  await service.from("contact_tags").insert([
    { workspace_id: ws, contact_id: c.FL, tag: "VIP" },
    { workspace_id: ws, contact_id: c.SP, tag: "VIP" },
    { workspace_id: ws, contact_id: c.Invalido, tag: "VIP" },
    { workspace_id: ws, contact_id: c.Lixeira, tag: "VIP" },
    { workspace_id: ws2, contact_id: c.FL2, tag: "VIP" },
  ])
  await service.from("contact_purchases").insert([
    { workspace_id: ws, contact_id: c.FL, data: hojeNoFuso(), valor: 100, origem: "manual" },
    { workspace_id: ws2, contact_id: c.FL2, data: hojeNoFuso(), valor: 100, origem: "manual" },
  ])
  await service.from("whatsapp_connections").insert({
    workspace_id: ws, canal: "gateway", status: "connected", phone_number: `5511${final}00`, instance_id: `inst_b42_${ts}`, instance_token: "token",
  })
}, 180_000)

afterAll(async () => {
  await service.from("campaigns").delete().in("workspace_id", empresas)
  await service.from("whatsapp_connections").delete().in("workspace_id", empresas)
  await service.from("contact_purchases").delete().in("workspace_id", empresas)
  await service.from("contact_tags").delete().in("workspace_id", empresas)
  await service.from("pipeline_cards").delete().in("workspace_id", empresas)
  await service.from("funis").delete().in("workspace_id", empresas)
  await service.from("contacts").delete().in("workspace_id", empresas)
  await service.from("profiles").delete().in("workspace_id", empresas)
  for (const id of Object.values(usuarios)) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", empresas)
}, 120_000)

describe("B42-02 — campanha pelo filtro de Contatos, no banco", { timeout: 60_000 }, () => {
  it("CA-B42-02: should contar exatamente os contatos da etapa de Entrada, de Recompra e do funil novo", async () => {
    como("admin")
    // Entrada não tem "Proposta": a etapa do exemplo aqui é Negociação.
    expect(await contar({ filtro: umGrupo(cond("etapa_entrada", "na_etapa", "negociacao")) })).toEqual({ total: 2, ids: ordenados([c.FL, c.Neg2]) })
    expect(await contar({ filtro: umGrupo(cond("etapa_recompra", "na_etapa", "reposicao")) })).toEqual({ total: 1, ids: [c.RL] })
    expect(await contar({ filtro: umGrupo(cond(campoDoFunil(feira), "na_etapa", visitou)) })).toEqual({ total: 1, ids: [c.Feira] })
  })

  it("CA-B42-03: should combinar grupos com E e OU na campanha", async () => {
    como("admin")
    const filtro: Filtro = {
      juncao: "e",
      grupos: [
        { juncao: "ou", condicoes: [cond("cidade", "igual", "Fortaleza"), cond("cidade", "igual", "Recife")] },
        { juncao: "e", condicoes: [cond("tipo", "e", "lojista")] },
      ],
    }
    const r = await contar({ filtro })
    expect(r.ids).toEqual(ordenados([c.FL, c.RL]))
    expect(r.ids).not.toContain(c.FR)
  })

  it("CA-B42-04: should trazer na campanha os contatos da lista de Contatos, menos o telefone inválido", async () => {
    como("admin")
    const filtro: Filtro = {
      juncao: "e",
      grupos: [
        { juncao: "e", condicoes: [cond("cidade", "contem", "Forta")] },
        { juncao: "ou", condicoes: [cond("etiqueta", "tem", "VIP"), cond("qtd_compras", "maior", "0"), cond("etapa_entrada", "no_funil")] },
      ],
    }
    const lista = await filtrarContatos({ filtro, limite: 200 })
    if ("erro" in lista) throw new Error(lista.erro)
    const daLista = ordenados(lista.contatos.map((x) => x.id))
    expect(daLista).toEqual(ordenados([c.FL, c.Invalido]))

    const r = await contar({ filtro })
    expect(r.ids).toEqual(daLista.filter((id) => id !== c.Invalido))
    expect(r.total).toBe(1)
  })

  it("CA-B42-05: should deixar fora da contagem e da confirmação quem está na lixeira", async () => {
    como("admin")
    const filtro = umGrupo(cond("cidade", "igual", "Fortaleza"), cond("tipo", "e", "lojista"))
    const r = await contar({ filtro })
    expect(r.ids).toEqual([c.FL])

    expect(await confirmarCampanha(null, dados(`Lixeira ${ts}`, { filtro }), amanha())).toEqual({})
    expect(await destinatariosGravados(await campanhaPeloNome(`Lixeira ${ts}`))).toEqual([c.FL])
  })

  it("CA-B42-07: should mandar para todos os contatos válidos fora da lixeira quando não há filtro", async () => {
    como("admin3")
    expect((await contarDestinatarios({ filtro: { juncao: "e", grupos: [] } })).total).toBe(30)
    expect((await contarDestinatarios({})).total).toBe(30)
  })

  it("CA-B42-10: should guardar o filtro no rascunho e reabrir igual", async () => {
    como("admin")
    const filtro: Filtro = {
      juncao: "ou",
      grupos: [
        { juncao: "e", condicoes: [cond("cidade", "igual", "Fortaleza"), cond("tipo", "e", "lojista")] },
        { juncao: "ou", condicoes: [cond("etapa_recompra", "na_etapa", "reposicao"), cond(campoDoFunil(feira), "na_etapa", visitou)] },
      ],
    }
    const antes = await contar({ filtro })
    const salvo = await salvarRascunho(null, dados(`Rascunho ${ts}`, { filtro }))
    expect(salvo.erro).toBeUndefined()

    const aberta = await buscarCampanha(salvo.id!)
    expect(aberta!.segmento).toEqual({ filtro })
    expect(await contar(aberta!.segmento)).toEqual(antes)
    expect(antes.ids).toEqual(ordenados([c.FL, c.RL, c.Feira]))
  })

  it("CA-B42-14: should recusar ao Atendente contar e salvar campanha pelo servidor", async () => {
    como("ana")
    expect(await contarDestinatarios({ filtro: umGrupo(cond("cidade", "contem", "a")) })).toEqual({ total: 0, amostra: [] })
    expect(await salvarRascunho(null, dados(`Da Ana ${ts}`, { filtro: umGrupo(cond("cidade", "contem", "a")) }))).toEqual({ erro: "Sem permissão" })
    const { count } = await service.from("campaigns").select("id", { count: "exact", head: true }).eq("nome", `Da Ana ${ts}`)
    expect(count).toBe(0)
  })

  it("CA-B42-15: should contar só contatos da própria empresa, também em etiqueta, compras, funil e perfil RFV", async () => {
    como("admin")
    const condicoes = [
      cond("cidade", "igual", "Fortaleza"),
      cond("etiqueta", "tem", "VIP"),
      cond("qtd_compras", "maior", "0"),
      cond("etapa_entrada", "na_etapa", "negociacao"),
      cond("perfil_rfv", "nao_vazio"),
    ]
    expect((await contar({ filtro: umGrupo(...condicoes) })).ids).toEqual([c.FL])
    for (const uma of condicoes) {
      const r = await contar({ filtro: umGrupo(uma) })
      expect(r.ids, uma.campo).not.toContain(c.FL2)
      expect(r.ids.length, uma.campo).toBeGreaterThan(0)
    }
  })

  it("CA-B42-27: should abrir o rascunho antigo com o filtro equivalente", async () => {
    como("admin")
    const { data } = await service
      .from("campaigns")
      .insert({
        workspace_id: ws, nome: `Antiga ${ts}`, status: "rascunho", conteudo: "Oi",
        segmento: { tipos: ["lojista", "revendedor"], tags: ["VIP"], cidade: "Forta", atendenteId: usuarios.ana },
      })
      .select("id")
      .single()

    const aberta = await buscarCampanha(data!.id)
    expect(aberta!.segmento).toEqual({
      filtro: umGrupo(
        cond("tipo", "qualquer_de", "lojista", "revendedor"),
        cond("etiqueta", "tem_qualquer", "VIP"),
        cond("cidade", "contem", "Forta"),
        cond("atendente", "e", usuarios.ana)
      ),
    })
  })

  it("CA-B42-28: should contar pelos filtros antigos convertidos os mesmos contatos da regra antiga", async () => {
    como("admin")
    const { data: cardsFL } = await service.from("pipeline_cards").select("funil, etapa").eq("contact_id", c.FL)
    const classificacaoDeFL = calcularClassificacao((cardsFL ?? []).map((k) => ({ funil: k.funil, etapa: k.etapa })))
    const antigos: Segmento[] = [
      {},
      { tipos: ["lojista"] },
      { tipos: ["lojista", "revendedor"] },
      { cidade: "forta" },
      { tags: ["VIP"] },
      { atendenteId: usuarios.ana },
      { classificacoes: [classificacaoDeFL] },
      { classificacoes: ["sem_historico"] },
      { tipos: ["lojista"], cidade: "Forta", tags: ["VIP"] },
      { tipos: ["lojista"], classificacoes: [classificacaoDeFL, "sem_historico"], tags: ["VIP"], atendenteId: usuarios.ana },
    ]
    for (const segmento of antigos) {
      const antes = await regraAntiga(segmento)
      const agora = await contar(segmento)
      expect(agora.ids, JSON.stringify(segmento)).toEqual(antes)
    }

    // A única diferença: a cidade passa a ignorar acento.
    expect(await regraAntiga({ cidade: "Sao Paulo" })).toEqual([])
    expect((await contar({ cidade: "Sao Paulo" })).ids).toEqual([c.SP])
  })

  it("CA-B42-30: should manter o relatório e o reenvio da campanha antiga enviada", async () => {
    como("admin")
    const antiga = (await service
      .from("campaigns")
      .insert({ workspace_id: ws, nome: `Enviada ${ts}`, status: "enviada", conteudo: "Oi", segmento: { tipos: ["lojista"] }, enviada_em: new Date().toISOString() })
      .select("id")
      .single()).data!.id
    await service.from("campaign_recipients").insert([
      { campaign_id: antiga, workspace_id: ws, contact_id: c.FL, nome_snapshot: "FL", telefone_snapshot: tel("85", 1), status: "enviado" },
      { campaign_id: antiga, workspace_id: ws, contact_id: c.RL, nome_snapshot: "RL", telefone_snapshot: tel("81", 3), status: "falhou" },
      { campaign_id: antiga, workspace_id: ws, contact_id: c.FR, nome_snapshot: "FR", telefone_snapshot: tel("85", 2), status: "falhou" },
    ])

    const relatorio = await relatorioCampanha(antiga)
    expect(ordenados(relatorio!.destinatarios.map((d) => d.telefone))).toEqual(ordenados([tel("85", 1), tel("81", 3), tel("85", 2)]))

    const reenvio = await criarReenvioParaFalhos(antiga)
    expect(reenvio.erro).toBeUndefined()
    const aberto = await buscarCampanha(reenvio.id!)
    expect(aberto!.segmento).toEqual({ reenvioDe: antiga })
    expect(await contar(aberto!.segmento)).toEqual({ total: 2, ids: ordenados([c.RL, c.FR]) })
  })

  // Por último: mexe nas etapas dos contatos.
  it("CA-B42-11: should manter os destinatários da confirmação quando o segmento muda depois", async () => {
    como("admin")
    const filtro = umGrupo(cond("etapa_entrada", "na_etapa", "negociacao"))
    expect(await confirmarCampanha(null, dados(`Agendada ${ts}`, { filtro }), amanha())).toEqual({})
    const campanha = await campanhaPeloNome(`Agendada ${ts}`)
    const fotografados = await destinatariosGravados(campanha)
    expect(fotografados).toEqual(ordenados([c.FL, c.Neg2]))

    // Depois da confirmação: Neg2 sai da etapa e um contato novo entra nela.
    await service.from("pipeline_cards").update({ etapa: "nutricao" }).eq("contact_id", c.Neg2).eq("funil", "entrada")
    await criarContatos(ws, [{ name: "Novo", phone_number: tel("85", 50) }])
    await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: c.Novo, funil: "entrada", etapa: "negociacao" })
    expect((await contar({ filtro })).ids).toEqual(ordenados([c.FL, c.Novo]))

    expect(await destinatariosGravados(campanha)).toEqual(fotografados)
    const relatorio = await relatorioCampanha(campanha)
    expect(ordenados(relatorio!.destinatarios.map((d) => d.telefone))).toEqual(ordenados([tel("85", 1), tel("84", 6)]))
  })
})
