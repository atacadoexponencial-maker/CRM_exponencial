"use server"

// Automações em fluxo (B11-10): a lista e o editor gravam em `automation_flows`.
// As regras da primeira versão (`automations`) saíram na B11-13.
//
// Histórico (B11-03): o motor grava cada execução em `automation_runs`; aqui a
// lista conta as execuções e a página de histórico as lê.
// Horário comercial (B11-08): gravado em `business_hours`, lido pela condição.
// Arquivo da ação "enviar imagem ou documento" (B11-07): sobe na hora em que o
// admin escolhe, e a ação guarda o endereço.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 5, 6, 8, 10 e 14.

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import {
  ARQUIVO_GRANDE_DEMAIS,
  BUCKET_DOS_ARQUIVOS,
  LIMITE_DO_ARQUIVO,
  arquivoDaAutomacaoValido,
  classificacaoValida,
  dadoDoContatoValido,
  etapaValida,
  gatilhoDeDadoValido,
  pastaDosArquivos,
  referenciasDoFluxo,
  tipoDeContatoValido,
} from "@/lib/automacoes/referencias"
import { simularFluxo } from "@/lib/automacoes/simulacao"
import type { PassoGravado, ResultadoExecucao } from "@/lib/automacoes/execucoes"
import {
  lerRepeticao,
  problemasDoFluxo,
  repeticaoPadrao,
  type BlocoGatilho,
  type Fluxo,
  type Repeticao,
  type ResultadoSimulacao,
} from "@/lib/fluxo-automacao"
import { normalizarTexto } from "@/lib/catalogo/planilha"
import { problemaDoHorario } from "@/lib/horario-comercial"
import { chaveDoUsuario, passouDoLimite, registrarTentativa } from "@/lib/limite-de-tentativas"
import { sessaoAtual } from "@/lib/sessao"
import type { ContatoTeste } from "./components/editor-fluxo"
import type { RegraListada } from "./components/lista-regras"

const CAMINHO_LISTA = "/configuracoes/automacoes"
const SEM_PERMISSAO = "Sem permissão"

/** A regra como o editor recebe: `id` nulo enquanto não foi salva. */
export interface RegraDoEditor {
  id: string | null
  nome: string
  fluxo: Fluxo
  repeticao: Repeticao
}

/** Uma execução como a página de histórico mostra. */
export interface ExecucaoListada {
  id: string
  quando: string
  regraId: string
  regraNome: string
  /** A regra não existe mais. */
  regraExcluida: boolean
  contato: { id: string; nome: string } | null
  evento: Record<string, string>
  resultado: ResultadoExecucao
  motivo: string | null
  caminho: PassoGravado[]
}

export interface FiltrosDoHistorico {
  regraId?: string
  resultado?: ResultadoExecucao
  dias: 7 | 30
}

const DIA_EM_MS = 86_400_000

/**
 * Padrão do `ilike` que acha o nome com ou sem acento: vogal, "c" e "n" (com ou sem
 * acento) viram `_`, que casa com uma letra qualquer. O resultado passa depois por
 * `normalizarTexto` (B22-35).
 */
function padraoSemAcento(texto: string): string {
  return texto.replace(/[aeioucnáàâãäéèêëíìîïóòôõöúùûüçñ]/giu, "_")
}

const NOME_MAXIMO = 120
const SUFIXO_DA_COPIA = " (cópia)"

/** O nome da cópia sempre termina em "(cópia)": o original encurta para caber (B22-18). */
function nomeDaCopia(nome: string): string {
  return `${nome.slice(0, NOME_MAXIMO - SUFIXO_DA_COPIA.length).trimEnd()}${SUFIXO_DA_COPIA}`
}

async function adminDaSessao() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || perfil?.role !== "admin") return null
  return { supabase, workspaceId: perfil.workspace_id, usuarioId: user.id }
}

// B22-29: limites para uma automação não pesar o sistema (decididos pelo Luan em 14/10)
const TAMANHO_MAXIMO_DO_FLUXO = 200 * 1024
const AUTOMACOES_POR_EMPRESA = 100
const TESTES_POR_MINUTO = 10

const FLUXO_GRANDE_DEMAIS = "A automação passou do tamanho máximo (200 KB). Encurte os textos ou divida em duas."
const LIMITE_DE_AUTOMACOES = `A empresa chegou ao limite de ${AUTOMACOES_POR_EMPRESA} automações. Exclua uma para criar outra.`

/** Tamanho do fluxo como chega do editor, antes de qualquer conferência. */
const grandeDemais = (fluxo: unknown) => (JSON.stringify(fluxo ?? null)?.length ?? 0) > TAMANHO_MAXIMO_DO_FLUXO

async function chegouAoLimiteDeAutomacoes({ supabase, workspaceId }: Admin): Promise<boolean> {
  const { count } = await supabase
    .from("automation_flows")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
  return (count ?? 0) >= AUTOMACOES_POR_EMPRESA
}

type Admin = NonNullable<Awaited<ReturnType<typeof adminDaSessao>>>

const paraJson = (fluxo: Fluxo) => fluxo as unknown as Json

export async function listarRegras(): Promise<RegraListada[]> {
  const admin = await adminDaSessao()
  if (!admin) return []
  const { supabase, workspaceId } = admin

  const { data: fluxos } = await supabase
    .from("automation_flows")
    .select("id, nome, ativa, fluxo, created_at")
    .eq("workspace_id", workspaceId)

  const execucoes = await execucoesPorRegra(admin)
  const regras: RegraListada[] = []
  const criadaEm = new Map<string, string>()
  for (const f of fluxos ?? []) {
    // B22-25: fluxo gravado por fora do editor aparece com o problema, para dar
    // para pausar e excluir pela tela, em vez de sumir da lista
    const fluxo = lerFluxo(f.fluxo)
    criadaEm.set(f.id, f.created_at)
    regras.push({
      id: f.id,
      nome: f.nome,
      ativa: f.ativa,
      fluxo,
      problema: fluxo ? (problemasDoFluxo(fluxo)[0] ?? null) : "O fluxo está fora do formato e não pode ser aberto no editor",
      execucoes7dias: execucoes.get(f.id)?.ultimos7dias ?? 0,
      ultimaExecucao: execucoes.get(f.id)?.ultima ?? null,
    })
  }

  // Na ordem de criação, como o motor roda
  const quando = (r: RegraListada) => criadaEm.get(r.id) ?? ""
  return regras.sort((a, b) => (quando(a) < quando(b) ? -1 : quando(a) > quando(b) ? 1 : 0))
}

/**
 * Execuções que contaram (concluídas e com falha) nos últimos 30 dias, por
 * regra: quantas nos últimos 7 dias e a mais recente. As ignoradas pela proteção
 * não contam como execução.
 */
async function execucoesPorRegra({ supabase, workspaceId }: Admin) {
  const agora = Date.now()
  const { data } = await supabase
    .from("automation_runs")
    .select("regra_id, created_at")
    .eq("workspace_id", workspaceId)
    .neq("resultado", "ignorada")
    .gte("created_at", new Date(agora - 30 * DIA_EM_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(5000)

  const porRegra = new Map<string, { ultimos7dias: number; ultima: string }>()
  for (const r of data ?? []) {
    const atual = porRegra.get(r.regra_id) ?? { ultimos7dias: 0, ultima: r.created_at }
    if (new Date(r.created_at).getTime() >= agora - 7 * DIA_EM_MS) atual.ultimos7dias++
    porRegra.set(r.regra_id, atual)
  }
  return porRegra
}

/** A regra que o editor abre. `id` "nova" abre uma regra em branco. */
export async function buscarRegraParaEditor(id: string): Promise<{ regra: RegraDoEditor } | { redirecionar: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { redirecionar: "/perfil" }
  const { supabase, workspaceId } = admin

  if (id === "nova") {
    const gatilho: BlocoGatilho = { id: "gatilho", tipo: "gatilho", gatilho: "card_movido", parametros: {}, posicao: { x: 0, y: 0 } }
    return {
      regra: { id: null, nome: "", fluxo: { blocos: [gatilho], ligacoes: [] }, repeticao: repeticaoPadrao(gatilho.gatilho) },
    }
  }

  const { data } = await supabase
    .from("automation_flows")
    .select("id, nome, fluxo, repeticao")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  const fluxo = data ? lerFluxo(data.fluxo) : null
  if (!data || !fluxo) return { redirecionar: CAMINHO_LISTA }
  return { regra: { id: data.id, nome: data.nome, fluxo, repeticao: lerRepeticao(data.repeticao) } }
}

/** Etiquetas, atendentes, números, times, sequências e etapas citados no fluxo existem e são da empresa? */
async function conferirReferencias({ supabase, workspaceId }: Admin, fluxo: Fluxo): Promise<string | null> {
  const {
    etiquetas,
    atendentes,
    atendentesAtribuidos,
    conexoes,
    times,
    sequencias,
    etapas,
    dadosDoContato,
    tiposDeContato,
    classificacoes,
    gatilhosDeDado,
    mensagensRapidas,
    arquivos,
  } = referenciasDoFluxo(fluxo)
  if (!etapas.every(etapaValida)) return "Uma etapa escolhida não existe no funil. Escolha de novo."
  if (!dadosDoContato.every(({ campo, valor }) => dadoDoContatoValido(campo, valor))) {
    return "O dado do contato escolhido não pode receber esse valor. Confira o campo e o valor."
  }
  if (!tiposDeContato.every(tipoDeContatoValido) || !classificacoes.every(classificacaoValida)) {
    return "Um tipo ou classificação escolhido numa condição não existe. Escolha de novo."
  }
  if (!gatilhosDeDado.every(({ campo, valor }) => gatilhoDeDadoValido(campo, valor))) {
    return "O campo ou o valor do gatilho não é válido. Escolha de novo."
  }
  if (!arquivos.every((arquivo) => arquivoDaAutomacaoValido(arquivo, workspaceId))) {
    return "O arquivo de uma ação não é válido. Escolha o arquivo de novo."
  }

  const contar = async (
    tabela: "labels" | "profiles" | "whatsapp_connections" | "teams" | "sequences" | "quick_replies",
    ids: string[]
  ) => {
    if (ids.length === 0) return 0
    const { count } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("id", ids)
    return count ?? 0
  }
  // B22-02: quem uma ação vai receber a conversa precisa estar ativo. Numa condição
  // ("atendente é"), basta existir: a conversa pode continuar com quem foi desativado.
  const contarAtivos = async (ids: string[]) => {
    if (ids.length === 0) return 0
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .in("id", ids)
    return count ?? 0
  }
  const [nEtiquetas, nAtendentes, nAtribuidos, nConexoes, nTimes, nSequencias, nRapidas] = await Promise.all([
    contar("labels", etiquetas),
    contar("profiles", atendentes),
    contarAtivos(atendentesAtribuidos),
    contar("whatsapp_connections", conexoes),
    contar("teams", times),
    contar("sequences", sequencias),
    contar("quick_replies", mensagensRapidas),
  ])
  if (nEtiquetas !== etiquetas.length) return "Uma etiqueta escolhida não existe mais. Escolha de novo."
  if (nAtendentes !== atendentes.length) return "Um atendente escolhido não existe mais. Escolha de novo."
  if (nAtribuidos !== atendentesAtribuidos.length) return "Um atendente escolhido está desativado. Escolha outro."
  if (nConexoes !== conexoes.length) return "Um número escolhido não existe mais. Escolha de novo."
  if (nTimes !== times.length) return "Um time escolhido não existe mais. Escolha de novo."
  if (nSequencias !== sequencias.length) return "Uma sequência escolhida não existe mais. Escolha de novo."
  if (nRapidas !== mensagensRapidas.length) return "Uma mensagem rápida escolhida não existe mais. Escolha de novo."
  return null
}

/** O tipo da ação pelo tipo do arquivo. JPEG, PNG e WebP saem como imagem; PDF, Word e Excel, como documento. */
const TIPO_DO_ARQUIVO: Record<string, "imagem" | "documento"> = {
  "image/jpeg": "imagem",
  "image/png": "imagem",
  "image/webp": "imagem",
  "application/pdf": "documento",
  "application/msword": "documento",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documento",
  "application/vnd.ms-excel": "documento",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documento",
}


/**
 * Sobe o arquivo escolhido no editor para a pasta das automações da empresa
 * (B11-07). A ação guarda o endereço, o nome original e o tipo.
 */
export async function guardarArquivoDaAutomacao(
  formData: FormData
): Promise<{ erro?: string; arquivo?: { url: string; nome: string; tipo: "imagem" | "documento" } }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

  const arquivo = formData.get("arquivo")
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha um arquivo." }
  const tipo = TIPO_DO_ARQUIVO[arquivo.type]
  if (!tipo) return { erro: "Use uma imagem (JPG, PNG ou WebP) ou um documento (PDF, Word ou Excel)." }
  if (arquivo.size > LIMITE_DO_ARQUIVO) return { erro: ARQUIVO_GRANDE_DEMAIS }

  const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const caminho = `${pastaDosArquivos(admin.workspaceId)}/${Date.now()}-${nomeSeguro}`
  const service = createServiceClient()
  const { error } = await service.storage.from(BUCKET_DOS_ARQUIVOS).upload(caminho, arquivo, { contentType: arquivo.type })
  if (error) return { erro: "Não foi possível enviar o arquivo. Tente de novo." }

  const {
    data: { publicUrl },
  } = service.storage.from(BUCKET_DOS_ARQUIVOS).getPublicUrl(caminho)
  return { arquivo: { url: publicUrl, nome: arquivo.name, tipo } }
}

export async function salvarRegra(dados: {
  id: string | null
  nome: string
  fluxo: unknown
  repeticao: unknown
}): Promise<{ erro?: string; id?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }
  const { supabase, workspaceId } = admin

  if (grandeDemais(dados.fluxo)) return { erro: FLUXO_GRANDE_DEMAIS }
  const nome = dados.nome.trim()
  if (!nome) return { erro: "Dê um nome à automação" }
  if (nome.length > NOME_MAXIMO) return { erro: `O nome pode ter até ${NOME_MAXIMO} caracteres` }

  const fluxo = lerFluxo(dados.fluxo)
  if (!fluxo) return { erro: "O desenho da automação veio num formato inválido. Recarregue a página." }
  const problemas = problemasDoFluxo(fluxo)
  if (problemas.length > 0) return { erro: `O fluxo ainda tem pendências: ${problemas.join(". ")}` }

  const erroReferencia = await conferirReferencias(admin, fluxo)
  if (erroReferencia) return { erro: erroReferencia }

  // lerRepeticao troca o que está fora do formato por "sempre": aqui isso é erro, e não um padrão
  const repeticao = lerRepeticao(dados.repeticao)
  if (repeticao.modo !== (dados.repeticao as { modo?: unknown } | null)?.modo) {
    return { erro: "A proteção de repetição não é válida. Para 'a cada N horas', use de 1 a 8760 horas." }
  }
  const repeticaoJson = repeticao as unknown as Json

  if (dados.id) {
    const { data, error } = await supabase
      .from("automation_flows")
      .update({ nome, fluxo: paraJson(fluxo), repeticao: repeticaoJson })
      .eq("id", dados.id)
      .eq("workspace_id", workspaceId)
      .select("id")
      .maybeSingle()
    if (error) return { erro: "Não foi possível salvar a automação. Tente novamente." }
    if (!data) return { erro: "Esta automação não existe mais." }
    revalidatePath(CAMINHO_LISTA)
    return { id: data.id }
  }

  if (await chegouAoLimiteDeAutomacoes(admin)) return { erro: LIMITE_DE_AUTOMACOES }
  const { data, error } = await supabase
    .from("automation_flows")
    .insert({ workspace_id: workspaceId, nome, fluxo: paraJson(fluxo), repeticao: repeticaoJson, ativa: true })
    .select("id")
    .single()
  if (error || !data) return { erro: "Não foi possível salvar a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return { id: data.id }
}

export async function alternarRegra(id: string, ativa: boolean): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

  // B22-27: ativar confere as escolhas como o Salvar (etiqueta, time, mensagem
  // rápida… apagados depois). Pausar não confere: tem de funcionar sempre.
  if (ativa) {
    const { data: regra } = await admin.supabase
      .from("automation_flows")
      .select("fluxo")
      .eq("id", id)
      .eq("workspace_id", admin.workspaceId)
      .maybeSingle()
    const fluxo = regra ? lerFluxo(regra.fluxo) : null
    if (fluxo) {
      const erroReferencia = await conferirReferencias(admin, fluxo)
      if (erroReferencia) return { erro: `Não dá para ativar: ${erroReferencia}` }
    }
  }

  const { data, error } = await admin.supabase
    .from("automation_flows")
    .update({ ativa })
    .eq("id", id)
    .eq("workspace_id", admin.workspaceId)
    .select("id")
    .maybeSingle()
  if (error || !data) return { erro: "Não foi possível alterar a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return {}
}

/** A cópia nasce pausada, com "(cópia)" no nome. */
export async function duplicarRegra(id: string): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }
  const { supabase, workspaceId } = admin

  const { data } = await supabase
    .from("automation_flows")
    .select("nome, fluxo, repeticao")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (!data) return { erro: "Esta automação não existe mais." }
  const fluxo = lerFluxo(data.fluxo)
  if (!fluxo) return { erro: "O fluxo desta automação está fora do formato e não pode ser duplicado." }
  if (await chegouAoLimiteDeAutomacoes(admin)) return { erro: LIMITE_DE_AUTOMACOES }

  const { error } = await supabase.from("automation_flows").insert({
    workspace_id: workspaceId,
    nome: nomeDaCopia(data.nome),
    fluxo: paraJson(fluxo),
    repeticao: lerRepeticao(data.repeticao) as unknown as Json,
    ativa: false,
  })
  if (error) return { erro: "Não foi possível duplicar a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return {}
}

export async function excluirRegra(id: string): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

  const { data, error } = await admin.supabase
    .from("automation_flows")
    .delete()
    .eq("id", id)
    .eq("workspace_id", admin.workspaceId)
    .select("id")
    .maybeSingle()
  if (error || !data) return { erro: "Não foi possível excluir a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return {}
}

const HorarioRecebido = z.object({
  dias: z.array(z.number()).max(7),
  inicio: z.string(),
  fim: z.string(),
})

/** Horário comercial da empresa (B11-08), usado pela condição de horário. Uma linha por empresa. */
export async function salvarHorarioComercial(dados: unknown): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

  const recebido = HorarioRecebido.safeParse(dados)
  if (!recebido.success) return { erro: "O horário veio num formato inválido. Recarregue a página." }
  const problema = problemaDoHorario(recebido.data)
  if (problema) return { erro: problema }

  const { dias, inicio, fim } = recebido.data
  const { error } = await admin.supabase.from("business_hours").upsert(
    {
      workspace_id: admin.workspaceId,
      dias: [...dias].sort((a, b) => a - b),
      inicio,
      fim,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  )
  if (error) return { erro: "Não foi possível salvar o horário. Tente novamente." }
  revalidatePath(CAMINHO_LISTA, "layout")
  return {}
}

/**
 * Contatos para "Testar com um contato": busca por nome ou telefone; sem texto,
 * os que conversaram por último. Contato na lixeira não aparece.
 */
export async function buscarContatosTeste(texto: string): Promise<ContatoTeste[]> {
  const admin = await adminDaSessao()
  if (!admin) return []
  const { supabase, workspaceId } = admin

  let consulta = supabase
    .from("contacts")
    .select("id, name, phone_number")
    .eq("workspace_id", workspaceId)
    .is("excluido_em", null)
    .limit(50)

  // Só letras, números, espaço, "+" e "-": o texto entra no filtro `or` do PostgREST,
  // onde vírgula, ponto e parênteses mudam o sentido da consulta
  const busca = texto.replace(/[^\p{L}\p{N} +-]/gu, "").trim().slice(0, 60)
  if (busca) {
    consulta = consulta.or(`name.ilike.%${padraoSemAcento(busca)}%,phone_number.ilike.%${busca.replace(/\D/g, "") || busca}%`)
  } else {
    const { data: conversas } = await supabase
      .from("conversations")
      .select("contact_id")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false })
      .limit(30)
    const recentes = [...new Set((conversas ?? []).map((c) => c.contact_id))].slice(0, 10)
    if (recentes.length === 0) return []
    consulta = consulta.in("id", recentes)
  }

  const { data } = await consulta
  // B22-35: o padrão do banco pega também outras letras na posição das vogais; aqui
  // fica só quem casa sem acento e sem maiúscula ("jose" acha "José")
  const procurado = normalizarTexto(busca)
  const digitos = busca.replace(/\D/g, "")
  return (data ?? [])
    .filter((c) => !busca || normalizarTexto(c.name ?? "").includes(procurado) || (!!digitos && c.phone_number.includes(digitos)))
    .slice(0, 10)
    .map((c) => ({ id: c.id, nome: c.name || c.phone_number, descricao: c.phone_number }))
}

export async function simularRegra(
  contatoId: string,
  fluxoRecebido: unknown
): Promise<{ erro?: string; resultado?: ResultadoSimulacao }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }
  if (grandeDemais(fluxoRecebido)) return { erro: FLUXO_GRANDE_DEMAIS }

  // B22-29: cada teste consulta o banco a cada condição; até 10 por minuto por pessoa
  const chave = chaveDoUsuario(admin.usuarioId)
  if (await passouDoLimite("teste_automacao", [{ chave, limite: TESTES_POR_MINUTO }], 1)) {
    return { erro: "Muitos testes seguidos. Espere um minuto e teste de novo." }
  }
  await registrarTentativa("teste_automacao", [chave])

  const fluxo = lerFluxo(fluxoRecebido)
  if (!fluxo) return { erro: "O desenho da automação veio num formato inválido. Recarregue a página." }
  // O que não pode ser salvo também não é testado: uma condição vazia, por exemplo, daria "sim" (B22-11)
  const problemas = problemasDoFluxo(fluxo)
  if (problemas.length > 0) return { erro: `Complete o fluxo antes de testar: ${problemas.join(". ")}` }

  const { data: contato } = await admin.supabase
    .from("contacts")
    .select("id")
    .eq("id", contatoId)
    .eq("workspace_id", admin.workspaceId)
    .is("excluido_em", null)
    .maybeSingle()
  if (!contato) return { erro: "Contato não encontrado." }

  try {
    // Só leitura: as verificações consultam o banco e as ações ficam desligadas
    const resultado = await simularFluxo(createServiceClient(), admin.workspaceId, contato.id, fluxo)
    if (!resultado) return { erro: "Este gatilho ainda não pode ser testado." }
    return { resultado }
  } catch {
    return { erro: "Não foi possível testar agora. Tente novamente." }
  }
}

/**
 * As regras que o filtro do histórico oferece: as de agora, na ordem de criação,
 * e as excluídas que ainda têm execução nos últimos 30 dias, com o último nome
 * gravado. Não depende dos filtros, para o nome aparecer mesmo com a lista vazia (B22-19).
 */
export async function regrasDoFiltroDoHistorico(): Promise<Array<{ id: string; nome: string }>> {
  const admin = await adminDaSessao()
  if (!admin) return []
  const { supabase, workspaceId } = admin

  const [{ data: fluxos }, { data: execucoes }] = await Promise.all([
    supabase.from("automation_flows").select("id, nome").eq("workspace_id", workspaceId).order("created_at"),
    supabase
      .from("automation_runs")
      .select("regra_id, regra_nome")
      .eq("workspace_id", workspaceId)
      .gte("created_at", new Date(Date.now() - 30 * DIA_EM_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
  ])

  const regras = (fluxos ?? []).map((f) => ({ id: f.id, nome: f.nome }))
  const vistas = new Set(regras.map((r) => r.id))
  for (const e of execucoes ?? []) {
    if (vistas.has(e.regra_id)) continue
    vistas.add(e.regra_id)
    regras.push({ id: e.regra_id, nome: `${e.regra_nome} (excluída)` })
  }
  return regras
}

/**
 * Execuções do histórico, mais recentes primeiro, com os filtros da página. Até
 * 300 por consulta: para ver mais antigas, o admin estreita o filtro. Erro do
 * banco volta como erro, e não como lista vazia (B22-19).
 */
export async function listarExecucoes(
  filtros: FiltrosDoHistorico
): Promise<{ execucoes: ExecucaoListada[]; erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { execucoes: [], erro: SEM_PERMISSAO }
  const { supabase, workspaceId } = admin

  let consulta = supabase
    .from("automation_runs")
    .select("id, created_at, regra_id, regra_nome, contact_id, evento, resultado, motivo, caminho, contacts(name, phone_number)")
    .eq("workspace_id", workspaceId)
    .gte("created_at", new Date(Date.now() - filtros.dias * DIA_EM_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(300)
  if (filtros.regraId) consulta = consulta.eq("regra_id", filtros.regraId)
  if (filtros.resultado) consulta = consulta.eq("resultado", filtros.resultado)

  const [{ data, error }, { data: fluxos }] = await Promise.all([
    consulta,
    supabase.from("automation_flows").select("id").eq("workspace_id", workspaceId),
  ])
  if (error) return { execucoes: [], erro: "Não foi possível carregar o histórico. Tente novamente." }
  const existentes = new Set((fluxos ?? []).map((f) => f.id))

  const execucoes = (data ?? []).map((e) => {
    const contato = e.contacts as unknown as { name: string | null; phone_number: string } | null
    return {
      id: e.id,
      quando: e.created_at,
      regraId: e.regra_id,
      regraNome: e.regra_nome,
      regraExcluida: !existentes.has(e.regra_id),
      contato: e.contact_id && contato ? { id: e.contact_id, nome: contato.name || contato.phone_number } : null,
      evento: (e.evento ?? {}) as Record<string, string>,
      resultado: e.resultado as ResultadoExecucao,
      motivo: e.motivo,
      caminho: (Array.isArray(e.caminho) ? e.caminho : []) as unknown as PassoGravado[],
    }
  })
  return { execucoes }
}
