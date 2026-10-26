// @vitest-environment node
// B38-05 — variáveis com texto reserva, no Supabase real: o texto que a automação e a
// campanha montam para cada contato, a troca da variável ao renomear o campo, a
// recusa de texto sem reserva (automação, campanha, mensagem rápida e lembrete) e os
// textos antigos que não saem até ganhar o reserva. Nenhuma mensagem é enviada: o
// texto é montado pelas mesmas funções do envio, e as campanhas pendentes não rodam
// (o motor delas está mockado, porque rodaria sobre o banco inteiro).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/campanhas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/campanhas")>()),
  processarCampanhasPendentes: vi.fn(async () => 0),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import { carregarOpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/opcoes-editor"
import { referenciasQueSumiram } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { criarCampo, renomearCampo } from "@/app/(auth)/configuracoes/campos/actions"
import { criarMensagemRapida } from "@/app/(auth)/configuracoes/mensagens-rapidas/actions"
import { listarCampanhas, salvarRascunho } from "@/app/(auth)/campanhas/actions"
import { salvarCamposDoContato } from "@/app/(auth)/contatos/campos-personalizados"
import { enviarMensagemRapida, enviarTexto, preencherVariaveis } from "@/lib/automacoes/envio"
import { criarLembrete } from "@/lib/automacoes/lembrete"
import type { ContextoDaExecucao } from "@/lib/automacoes/contexto"
import { campanhaPodeEnviar, substituirVariaveis, variaveisDosCamposDosContatos } from "@/lib/campanhas"
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
const contatos: Record<string, string> = {}
let limiteId = ""

const comoAdmin = () => vi.mocked(createSsrClient).mockResolvedValue(admin as never)

/** O contexto do motor para o contato, sem conversa (o vendedor vem do card). */
const contexto = (contato: string): ContextoDaExecucao =>
  ({ supabase: service, gatilho: { tipo: "tag_adicionada", workspaceId: ws, contactId: contatos[contato], tag: "x" } }) as unknown as ContextoDaExecucao

/** O texto da campanha para o contato, como o motor das campanhas monta. */
async function textoDaCampanha(conteudo: string, contato: string, nomeContato: string, nomeVendedor: string) {
  const campos = (await variaveisDosCamposDosContatos(service as never, ws, [contatos[contato]])).get(contatos[contato]) ?? {}
  return substituirVariaveis(conteudo, { nomeContato, nomeVendedor, campos })
}

const fluxoDeMensagem = (texto: string, acao: "enviar_mensagem" | "criar_lembrete" = "enviar_mensagem"): Fluxo => ({
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "tag_adicionada", parametros: { tag: "x" }, posicao },
    { id: "a", tipo: "acao", acao, parametros: { texto }, posicao },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
})

beforeAll(async () => {
  ws = (await service.from("workspaces").insert({ name: `[TESTE] B38-05 ${ts}` }).select("id").single()).data!.id
  const email = `b38-05-admin-${ts}@campos-test.com`
  adminId = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(adminId)
  await service.from("profiles").insert({ id: adminId, workspace_id: ws, name: "Bruno", role: "admin", status: "active" })
  admin = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.auth.signInWithPassword({ email, password: SENHA })

  comoAdmin()
  limiteId = (await criarCampo("Limite de crédito", "dinheiro")).id!
  contatos.Ana = (await service.from("contacts").insert({ workspace_id: ws, name: "Ana Souza", phone_number: `55319${String(ts).slice(-6)}1` }).select("id").single()).data!.id
  contatos.SemNome = (await service.from("contacts").insert({ workspace_id: ws, name: null, phone_number: `55319${String(ts).slice(-6)}2` }).select("id").single()).data!.id
  // Ana tem limite e vendedor (o Bruno, atendente do card); o contato sem nome não tem nada
  comoAdmin()
  expect(await salvarCamposDoContato(contatos.Ana, { [limiteId]: "1500" })).toEqual({})
  await service.from("pipeline_cards").insert({ workspace_id: ws, contact_id: contatos.Ana, funil: "entrada", etapa: "lead", atendente_id: adminId })
}, 120_000)

afterAll(async () => {
  await service.from("reminders").delete().eq("workspace_id", ws)
  await service.from("automation_runs").delete().eq("workspace_id", ws)
  await service.from("automation_queue").delete().eq("workspace_id", ws)
  await service.from("automation_flows").delete().eq("workspace_id", ws)
  await service.from("campaigns").delete().eq("workspace_id", ws)
  await service.from("quick_replies").delete().eq("workspace_id", ws)
  await service.from("pipeline_cards").delete().eq("workspace_id", ws)
  await service.from("campos_personalizados").delete().eq("workspace_id", ws)
  await service.from("contacts").delete().eq("workspace_id", ws)
  await service.from("profiles").delete().eq("workspace_id", ws)
  for (const id of usuarios) await service.auth.admin.deleteUser(id)
  await service.from("workspaces").delete().eq("id", ws)
}, 120_000)

describe("B38-05 — variáveis com texto reserva", { timeout: 90_000 }, () => {
  it("CA-B38-42: should montar a mensagem da automação e da campanha com o valor do campo no formato do tipo", async () => {
    const texto = "Seu limite é {{limite_de_credito|a combinar}}"
    expect((await preencherVariaveis(contexto("Ana"), contatos.Ana, texto)).replace(/\s/g, " ")).toBe("Seu limite é R$ 1.500,00")
    expect((await textoDaCampanha(texto, "Ana", "Ana Souza", "Bruno")).replace(/\s/g, " ")).toBe("Seu limite é R$ 1.500,00")
  })

  it("CA-B38-43: should usar o texto reserva quando o contato não tem o campo", async () => {
    const texto = "Seu limite é {{limite_de_credito|a combinar}}"
    expect(await preencherVariaveis(contexto("SemNome"), contatos.SemNome, texto)).toBe("Seu limite é a combinar")
    expect(await textoDaCampanha(texto, "SemNome", "", "")).toBe("Seu limite é a combinar")
  })

  it("CA-B38-60: should usar o reserva nas variáveis que já existem quando falta nome ou vendedor", async () => {
    const texto = "Olá {{nome_contato|cliente}}, aqui é {{nome_vendedor|a equipe}}"
    expect(await preencherVariaveis(contexto("SemNome"), contatos.SemNome, texto)).toBe("Olá cliente, aqui é a equipe")
    expect(await preencherVariaveis(contexto("Ana"), contatos.Ana, texto)).toBe("Olá Ana Souza, aqui é Bruno")
    expect(await preencherVariaveis(contexto("SemNome"), contatos.SemNome, "Oi {{primeiro_nome|cliente}}")).toBe("Oi cliente")
    expect(await preencherVariaveis(contexto("Ana"), contatos.Ana, "Oi {{primeiro_nome|cliente}}")).toBe("Oi Ana")
    expect(await textoDaCampanha(texto, "SemNome", "", "")).toBe("Olá cliente, aqui é a equipe")
    expect(await textoDaCampanha(texto, "Ana", "Ana Souza", "Bruno")).toBe("Olá Ana Souza, aqui é Bruno")
  })

  it("CA-B38-48: should recusar no servidor a automação e a campanha com variável sem reserva", async () => {
    comoAdmin()
    const regra = await salvarRegra({ id: null, nome: `Sem reserva ${ts}`, fluxo: fluxoDeMensagem("Olá {{nome_contato}}"), repeticao: { modo: "sempre" } })
    expect(regra.erro).toBe("A variável {{nome_contato}} está sem texto reserva. Use o botão da variável para pôr o reserva.")
    comoAdmin()
    const campanha = await salvarRascunho(null, {
      nome: "Sem reserva",
      segmento: {},
      tipoMensagem: "texto",
      conteudo: "Seu limite é {{limite_de_credito}}",
      arquivoUrl: null,
      arquivoNome: null,
    } as never)
    expect(campanha.erro).toBe("A variável {{limite_de_credito}} está sem texto reserva. Use o botão da variável para pôr o reserva.")
  })

  it("CA-B38-61: should marcar e não enviar a automação, a campanha e a mensagem rápida antigas sem reserva", async () => {
    // Gravados por fora, como os salvos antes desta mudança
    const fluxo = fluxoDeMensagem("Olá {{nome_contato}}")
    await service.from("automation_flows").insert({ workspace_id: ws, nome: `Antiga ${ts}`, fluxo: fluxo as never, gatilho_tipo: "tag_adicionada", ativa: false })
    await service.from("campaigns").insert({ workspace_id: ws, nome: "Antiga", status: "agendada", conteudo: "Olá {{nome_contato}}", tipo_mensagem: "texto", segmento: {}, agendada_para: new Date(Date.now() - 60_000).toISOString(), criado_por: adminId } as never)

    comoAdmin()
    const opcoes = await carregarOpcoesEditor(admin as never, ws)
    expect(Object.values(referenciasQueSumiram(fluxo, opcoes)).flat()).toEqual(["Mensagem: precisa de ajuste, {{nome_contato}} sem texto reserva"])
    expect(await enviarTexto(contexto("Ana"), contatos.Ana, "Olá {{nome_contato}}")).toEqual({ ok: false, motivo: "Precisa de ajuste: {{nome_contato}} sem texto reserva" })

    comoAdmin()
    const antiga = (await listarCampanhas()).find((c) => c.nome === "Antiga")!
    expect(antiga.precisaDeAjuste).toBe(true)
    expect(campanhaPodeEnviar("Olá {{nome_contato}}")).toBe(false)
    expect(campanhaPodeEnviar("Olá {{nome_contato|cliente}}")).toBe(true)
  })

  it("CA-B38-63: should recusar a mensagem rápida sem reserva, salvar a com reserva e não enviar a antiga", async () => {
    comoAdmin()
    expect(await criarMensagemRapida("/ola", "Olá {{nome_contato}}")).toEqual({
      erro: "A variável {{nome_contato}} está sem texto reserva. Use o botão da variável para pôr o reserva.",
    })
    comoAdmin()
    const certa = await criarMensagemRapida("/ola", "Olá {{nome_contato|cliente}}")
    expect(certa.erro).toBeUndefined()

    const antiga = (await service.from("quick_replies").insert({ workspace_id: ws, title: "/antiga", content: "Olá {{nome_contato}}" }).select("id").single()).data!.id
    expect(await enviarMensagemRapida(contexto("Ana"), contatos.Ana, antiga)).toEqual({ ok: false, motivo: "Precisa de ajuste: {{nome_contato}} sem texto reserva" })
  })

  it("CA-B38-64: should recusar o lembrete sem reserva e criar com reserva para o contato sem nome", async () => {
    comoAdmin()
    const recusa = await salvarRegra({ id: null, nome: `Lembrete ${ts}`, fluxo: fluxoDeMensagem("Ligar para {{primeiro_nome}}", "criar_lembrete"), repeticao: { modo: "sempre" } })
    expect(recusa.erro).toBe("A variável {{primeiro_nome}} está sem texto reserva. Use o botão da variável para pôr o reserva.")

    const r = await criarLembrete(contexto("SemNome"), contatos.SemNome, { texto: "Ligar para {{primeiro_nome|o cliente}}" })
    expect(r.ok).toBe(true)
    const { data } = await service.from("reminders").select("instrucao").eq("contact_id", contatos.SemNome)
    expect(data!.map((l) => l.instrucao)).toEqual(["Ligar para o cliente"])
  })

  it("CA-B38-46: should trocar a variável nos textos da automação, da campanha agendada e da mensagem rápida ao renomear", async () => {
    const texto = "Seu limite é {{limite_de_credito|a combinar}}"
    comoAdmin()
    const regra = await salvarRegra({ id: null, nome: `Limite ${ts}`, fluxo: fluxoDeMensagem(texto), repeticao: { modo: "sempre" } })
    expect(regra.erro).toBeUndefined()
    const base = { workspace_id: ws, tipo_mensagem: "texto", segmento: {}, conteudo: texto, criado_por: adminId }
    const agendada = (await service.from("campaigns").insert({ ...base, nome: "Agendada", status: "agendada", agendada_para: new Date(Date.now() + 86_400_000).toISOString() } as never).select("id").single()).data!.id
    const enviada = (await service.from("campaigns").insert({ ...base, nome: "Enviada", status: "enviada" } as never).select("id").single()).data!.id
    const rapida = (await service.from("quick_replies").insert({ workspace_id: ws, title: "/limite", content: texto }).select("id").single()).data!.id

    comoAdmin()
    expect(await renomearCampo(limiteId, "Limite")).toEqual({})

    const novo = "Seu limite é {{limite|a combinar}}"
    const { data: fluxo } = await service.from("automation_flows").select("fluxo").eq("id", regra.id!).single()
    const acao = (fluxo!.fluxo as unknown as Fluxo).blocos.find((b) => b.tipo === "acao")!
    expect(acao.tipo === "acao" && acao.parametros.texto).toBe(novo)
    expect((await service.from("campaigns").select("conteudo").eq("id", agendada).single()).data!.conteudo).toBe(novo)
    expect((await service.from("campaigns").select("conteudo").eq("id", enviada).single()).data!.conteudo).toBe(texto)
    expect((await service.from("quick_replies").select("content").eq("id", rapida).single()).data!.content).toBe(novo)
    // A mensagem enviada depois sai com o valor do campo
    expect((await preencherVariaveis(contexto("Ana"), contatos.Ana, novo)).replace(/\s/g, " ")).toBe("Seu limite é R$ 1.500,00")
  })
})
