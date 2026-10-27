// @vitest-environment node
// B41-01 — funis da empresa: criar, editar, adicionar contato, mover e tirar do funil,
// com as permissões e o isolamento entre empresas. Bate no Supabase real.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { adicionarEtapa, criarFunil, editarEtapa, listarFunisParaGerenciar, renomearFunil } from "@/app/(auth)/configuracoes/funis/actions"
import {
  adicionarContatoAoFunil,
  atribuirAtendente,
  buscarDadosPainel,
  listarCardsDoFunil,
  listarFunisDaEmpresa,
  moverCard,
  removerCardDoFunil,
} from "@/app/(auth)/pipeline/actions"
import { buscarDadosContato } from "@/app/(auth)/contatos/actions"

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
  const email = `b41-${chave}-${ts}@funis-test.com`
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
  const id = (await service.from("contacts").insert({ workspace_id: ws, name: nome, phone_number: `55219${String(ts).slice(-6)}${n}` }).select("id").single()).data!.id
  contatos[chave] = id
}

async function funilPorNome(nome: string) {
  const { data } = await service.from("funis").select("id, funil_etapas (id, nome, ordem)").eq("workspace_id", wsA).eq("nome", nome).single()
  return { id: data!.id as string, etapas: [...data!.funil_etapas].sort((a, b) => a.ordem - b.ordem) }
}

beforeAll(async () => {
  wsA = (await service.from("workspaces").insert({ name: `[TESTE] B41 A ${ts}` }).select("id").single()).data!.id
  wsB = (await service.from("workspaces").insert({ name: `[TESTE] B41 B ${ts}` }).select("id").single()).data!.id
  await criarPessoa("admin", wsA, "admin")
  await criarPessoa("gerente", wsA, "gerente")
  await criarPessoa("atendente1", wsA, "atendente")
  await criarPessoa("atendente2", wsA, "atendente")
  await criarPessoa("adminB", wsB, "admin")
  await criarContato("loja", wsA, "Loja Março", 1)
  await criarContato("bella", wsA, "Bella Kids", 2)
  await criarContato("rosa", wsA, "Rosa Modas", 3)
  await criarContato("sol", wsA, "Sol Atacado", 4)
  await criarContato("deB", wsB, "Loja da B", 5)
  await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.loja, funil: "entrada", etapa: "sondagem" })
  await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.sol, funil: "entrada", etapa: "lead" })
}, 120_000)

afterAll(async () => {
  for (const ws of [wsA, wsB]) {
    await service.from("pipeline_cards").delete().eq("workspace_id", ws)
    await service.from("funis").delete().eq("workspace_id", ws)
    await service.from("contacts").delete().eq("workspace_id", ws)
    await service.from("profiles").delete().eq("workspace_id", ws)
  }
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().in("id", [wsA, wsB])
}, 120_000)

describe("B41-01 — Funis da empresa", { timeout: 60_000 }, () => {
  it("CA-B41-01: should criar o funil com as etapas na ordem e mostrá-lo na lista e no Pipeline", async () => {
    como("admin")
    const r = await criarFunil("Feira de Março", [
      { nome: "Convidado", cor: "verde" },
      { nome: "Confirmou", cor: "#0b1f4d" },
      { nome: "Visitou o estande" },
    ])
    expect(r.erro).toBeUndefined()
    expect(r.id).toBeTruthy()

    const lista = await listarFunisParaGerenciar()
    const feira = lista.funis.find((f) => f.nome === "Feira de Março")!
    expect(feira.etapas.map((e) => e.nome)).toEqual(["Convidado", "Confirmou", "Visitou o estande"])
    expect(feira.cards).toBe(0)

    const doPipeline = (await listarFunisDaEmpresa()).find((f) => f.id === r.id)!
    expect(doPipeline.nome).toBe("Feira de Março")
    expect(doPipeline.etapas.map((e) => e.label)).toEqual(["Convidado", "Confirmou", "Visitou o estande"])
    expect(doPipeline.etapas.map((e) => e.cor)).toEqual(["verde", "#0b1f4d", null])
  })

  it("CA-B41-02: should deixar o Gerente criar, renomear e acrescentar etapa", async () => {
    como("gerente")
    const r = await criarFunil("Lançamento", [{ nome: "Avisado" }])
    expect(r.erro).toBeUndefined()
    expect((await renomearFunil(r.id!, "Lançamento Verão")).erro).toBeUndefined()
    expect((await adicionarEtapa(r.id!, "Comprou", "laranja")).erro).toBeUndefined()

    const { data } = await service.from("funis").select("nome, funil_etapas (nome, cor, ordem)").eq("id", r.id!).single()
    expect(data!.nome).toBe("Lançamento Verão")
    expect([...data!.funil_etapas].sort((a, b) => a.ordem - b.ordem).map((e) => [e.nome, e.cor])).toEqual([["Avisado", null], ["Comprou", "laranja"]])
  })

  it("CA-B41-03: should recusar ao Atendente toda mudança em funis, inclusive direto no banco", async () => {
    const feira = await funilPorNome("Feira de Março")
    como("atendente1")
    expect((await criarFunil("Do atendente", [{ nome: "A" }])).erro).toBe("Sem permissão")
    expect((await renomearFunil(feira.id, "Outro nome")).erro).toBe("Sem permissão")
    expect((await adicionarEtapa(feira.id, "Nova", null)).erro).toBe("Sem permissão")
    expect((await editarEtapa(feira.etapas[0].id, { nome: "Mudou" })).erro).toBe("Sem permissão")
    expect((await listarFunisParaGerenciar()).funis).toEqual([])

    const cliente = pessoas.atendente1.cliente
    expect((await cliente.from("funis").insert({ workspace_id: wsA, nome: "Direto" })).error).not.toBeNull()
    expect((await cliente.from("funil_etapas").insert({ funil_id: feira.id, workspace_id: wsA, nome: "Direto", ordem: 9 })).error).not.toBeNull()
    expect((await cliente.rpc("criar_funil", { p_nome: "Por função", p_etapas: [{ nome: "A" }] })).error).not.toBeNull()
    const { data: mudou } = await cliente.from("funis").update({ nome: "Invadido" }).eq("id", feira.id).select("id")
    expect(mudou).toEqual([])

    const depois = await funilPorNome("Feira de Março")
    expect(depois.etapas.map((e) => e.nome)).toEqual(["Convidado", "Confirmou", "Visitou o estande"])
  })

  it("CA-B41-04: should recusar nome vazio, repetido ou de funil fixo", async () => {
    como("admin")
    const antes = (await service.from("funis").select("id").eq("workspace_id", wsA)).data!.length
    expect((await criarFunil("   ", [{ nome: "A" }])).erro).toBe("Informe o nome do funil.")
    expect((await criarFunil(" feira de MARÇO ", [{ nome: "A" }])).erro).toBe("Já existe um funil com esse nome.")
    expect((await criarFunil("entrada", [{ nome: "A" }])).erro).toBe("Entrada e Recompra são nomes dos funis fixos.")
    expect((await criarFunil(" RECOMPRA ", [{ nome: "A" }])).erro).toBe("Entrada e Recompra são nomes dos funis fixos.")
    expect((await criarFunil("x".repeat(41), [{ nome: "A" }])).erro).toBe("O nome passa de 40 caracteres.")
    expect((await service.from("funis").select("id").eq("workspace_id", wsA)).data!.length).toBe(antes)
  })

  it("CA-B41-05: should recusar funil sem etapa, etapa sem nome ou repetida", async () => {
    como("admin")
    const antes = (await service.from("funis").select("id").eq("workspace_id", wsA)).data!.length
    expect((await criarFunil("Sem etapas", [])).erro).toBe("O funil precisa de ao menos uma etapa.")
    expect((await criarFunil("Etapa vazia", [{ nome: "Ok" }, { nome: "  " }])).erro).toBe("Informe o nome da etapa.")
    expect((await criarFunil("Repetida", [{ nome: "Visita" }, { nome: " visita" }])).erro).toBe('A etapa "visita" aparece duas vezes.')
    expect((await service.from("funis").select("id").eq("workspace_id", wsA)).data!.length).toBe(antes)

    const feira = await funilPorNome("Feira de Março")
    expect((await adicionarEtapa(feira.id, "convidado", null)).erro).toBe("Já existe uma etapa com esse nome neste funil.")
    expect((await editarEtapa(feira.etapas[1].id, { nome: "" })).erro).toBe("Informe o nome da etapa.")
  })

  it("CA-B41-08: should recusar cor que não é cor e gravar cor pronta ou própria", async () => {
    como("admin")
    const feira = await funilPorNome("Feira de Março")
    expect((await criarFunil("Cor ruim", [{ nome: "A", cor: "azul" }])).erro).toBe("Cor inválida.")
    expect((await editarEtapa(feira.etapas[2].id, { cor: "#12345" })).erro).toBe("Cor inválida.")
    expect((await editarEtapa(feira.etapas[2].id, { cor: "#fff3b0" })).erro).toBeUndefined()
    const { data } = await service.from("funil_etapas").select("cor").eq("id", feira.etapas[2].id).single()
    expect(data!.cor).toBe("#fff3b0")
    // O banco também segura.
    expect((await service.from("funil_etapas").update({ cor: "roxo" }).eq("id", feira.etapas[2].id)).error).not.toBeNull()
  })

  it("CA-B41-13: should manter Entrada e Recompra fixos", async () => {
    como("admin")
    const lista = await listarFunisParaGerenciar()
    expect(lista.fixos.map((f) => f.id)).toEqual(["entrada", "recompra"])
    expect((await renomearFunil("entrada", "Outro")).erro).toBe("Funil fixo não pode ser mudado")
    expect((await adicionarEtapa("recompra", "Nova", null)).erro).toBe("Funil fixo não pode ser mudado")
    // Entrada continua só com as etapas dela.
    expect((await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.bella, funil: "entrada", etapa: "onboarding" })).error).not.toBeNull()
    expect((await service.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.bella, funil: "inventado", etapa: "lead" })).error).not.toBeNull()
  })

  it("CA-B41-14: should não deixar outra empresa ler, mudar ou usar o funil", async () => {
    const feira = await funilPorNome("Feira de Março")
    como("adminB")
    expect(await listarFunisDaEmpresa()).toEqual([])
    expect((await listarFunisParaGerenciar()).funis).toEqual([])
    expect(await listarCardsDoFunil(feira.id)).toEqual([])
    expect((await renomearFunil(feira.id, "Da B")).erro).toBe("Funil não encontrado")
    expect((await adicionarEtapa(feira.id, "Da B", null)).erro).toBe("Funil não encontrado")
    expect((await editarEtapa(feira.etapas[0].id, { nome: "Da B" })).erro).toBe("Etapa não encontrada")
    expect((await adicionarContatoAoFunil(feira.id, contatos.deB)).erro).toBe("Funil não encontrado")
    const { data: lidos } = await pessoas.adminB.cliente.from("funis").select("id").eq("id", feira.id)
    expect(lidos).toEqual([])
    // Nem com a chave de serviço o card de outra empresa entra no funil.
    expect((await service.from("pipeline_cards").insert({ workspace_id: wsB, contact_id: contatos.deB, funil: feira.id, etapa: feira.etapas[0].id })).error).not.toBeNull()
    expect((await funilPorNome("Feira de Março")).etapas[0].nome).toBe("Convidado")
  })

  it("CA-B41-15: should criar o card na primeira etapa, sem atendente, sem mexer no card de Entrada", async () => {
    const feira = await funilPorNome("Feira de Março")
    como("gerente")
    expect((await adicionarContatoAoFunil(feira.id, contatos.loja)).erro).toBeUndefined()

    const { data: cards } = await service.from("pipeline_cards").select("funil, etapa, atendente_id").eq("contact_id", contatos.loja)
    expect(cards).toContainEqual({ funil: feira.id, etapa: feira.etapas[0].id, atendente_id: null })
    expect(cards).toContainEqual({ funil: "entrada", etapa: "sondagem", atendente_id: null })

    const perfil = await buscarDadosContato(contatos.loja)
    expect(perfil!.timeline.map((e) => e.descricao)).toContain("Card criado no funil Feira de Março — etapa: Convidado")
  })

  it("CA-B41-16: should não pôr o contato duas vezes no mesmo funil, mas deixar em outro", async () => {
    const feira = await funilPorNome("Feira de Março")
    const lancamento = await funilPorNome("Lançamento Verão")
    como("admin")
    expect((await adicionarContatoAoFunil(feira.id, contatos.loja)).erro).toBe("Este contato já está neste funil.")
    const { data } = await service.from("pipeline_cards").select("id").eq("contact_id", contatos.loja).eq("funil", feira.id)
    expect(data).toHaveLength(1)
    expect((await adicionarContatoAoFunil(lancamento.id, contatos.loja)).erro).toBeUndefined()
  })

  it("CA-B41-17: should recusar ao Atendente adicionar contato ao funil", async () => {
    const feira = await funilPorNome("Feira de Março")
    como("atendente1")
    expect((await adicionarContatoAoFunil(feira.id, contatos.bella)).erro).toBe("Sem permissão")
    expect((await pessoas.atendente1.cliente.from("pipeline_cards").insert({ workspace_id: wsA, contact_id: contatos.bella, funil: feira.id, etapa: feira.etapas[0].id })).error).not.toBeNull()
  })

  it("CA-B41-18: should mover só entre etapas do mesmo funil, com o histórico", async () => {
    const feira = await funilPorNome("Feira de Março")
    const lancamento = await funilPorNome("Lançamento Verão")
    const { data: card } = await service.from("pipeline_cards").select("id").eq("contact_id", contatos.loja).eq("funil", feira.id).single()
    como("admin")
    await moverCard(card!.id, feira.etapas[1].id)
    const { data: movido } = await service.from("pipeline_cards").select("etapa").eq("id", card!.id).single()
    expect(movido!.etapa).toBe(feira.etapas[1].id)
    const painel = await buscarDadosPainel(card!.id)
    expect(painel.historico.map((h) => [h.deEtapa, h.etapa])).toEqual([["Convidado", "Confirmou"]])

    await expect(moverCard(card!.id, lancamento.etapas[0].id)).rejects.toThrow()
    await expect(moverCard(card!.id, "lead")).rejects.toThrow()
    const { data: ficou } = await service.from("pipeline_cards").select("etapa").eq("id", card!.id).single()
    expect(ficou!.etapa).toBe(feira.etapas[1].id)
  })

  it("CA-B41-19: should mostrar ao Atendente só os próprios cards do funil novo", async () => {
    const feira = await funilPorNome("Feira de Março")
    await service.from("pipeline_cards").insert([
      { workspace_id: wsA, contact_id: contatos.bella, funil: feira.id, etapa: feira.etapas[0].id, atendente_id: pessoas.atendente1.id },
      { workspace_id: wsA, contact_id: contatos.rosa, funil: feira.id, etapa: feira.etapas[0].id, atendente_id: pessoas.atendente2.id },
      { workspace_id: wsA, contact_id: contatos.sol, funil: feira.id, etapa: feira.etapas[0].id },
    ])
    // B45-02: o dono do contato é o mesmo do card
    await service.from("contacts").update({ atendente_id: pessoas.atendente1.id }).eq("id", contatos.bella)
    await service.from("contacts").update({ atendente_id: pessoas.atendente2.id }).eq("id", contatos.rosa)
    como("atendente1")
    // B45-03 (PER-B45-13): os cards sem atendente (Sol e Loja Março) também aparecem; o da colega, não
    expect((await listarCardsDoFunil(feira.id)).map((c) => c.contato.nome).sort()).toEqual(["Bella Kids", "Loja Março", "Sol Atacado"])
    como("admin")
    expect((await listarCardsDoFunil(feira.id)).map((c) => c.contato.nome).sort()).toEqual(["Bella Kids", "Loja Março", "Rosa Modas", "Sol Atacado"])
  })

  it("CA-B41-20: should atribuir e tirar do funil só aquele card", async () => {
    const feira = await funilPorNome("Feira de Março")
    const { data: card } = await service.from("pipeline_cards").select("id").eq("contact_id", contatos.sol).eq("funil", feira.id).single()
    como("gerente")
    await atribuirAtendente(card!.id, pessoas.atendente2.id)
    como("atendente2")
    // B45-03 (PER-B45-13): a Loja Março, sem atendente, também aparece
    expect((await listarCardsDoFunil(feira.id)).map((c) => c.contato.nome).sort()).toEqual(["Loja Março", "Rosa Modas", "Sol Atacado"])
    expect((await removerCardDoFunil(card!.id)).erro).toBe("Sem permissão")

    como("gerente")
    expect((await removerCardDoFunil(card!.id)).erro).toBeUndefined()
    const { data: sobrou } = await service.from("pipeline_cards").select("funil").eq("contact_id", contatos.sol)
    expect(sobrou).toEqual([{ funil: "entrada" }])
    const { data: contato } = await service.from("contacts").select("id").eq("id", contatos.sol).single()
    expect(contato!.id).toBe(contatos.sol)
    // Tirar do funil não vale para Entrada.
    const { data: entrada } = await service.from("pipeline_cards").select("id").eq("contact_id", contatos.sol).eq("funil", "entrada").single()
    expect((await removerCardDoFunil(entrada!.id)).erro).toBe("Card não encontrado")
  })
})
