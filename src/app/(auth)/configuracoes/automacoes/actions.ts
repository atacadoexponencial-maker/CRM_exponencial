"use server"

// Automações em fluxo (B11-10): a lista e o editor gravam em `automation_flows`.
// As regras da primeira versão (`automations`) aparecem na lista como "versão
// antiga" e só são lidas aqui: pausar ou excluir gravaria na tabela que a
// produção usa até o merge do branch da B11. Salvar uma regra antiga no editor
// cria a versão em fluxo dela (`automation_id`), e o motor do branch passa a
// rodar só a nova.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 5 e 6.

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import { dadoDoContatoValido, etapaValida, referenciasDoFluxo } from "@/lib/automacoes/referencias"
import { fluxoDaRegraAntiga } from "@/lib/automacoes/regra-antiga"
import { simularFluxo } from "@/lib/automacoes/simulacao"
import { pendenciasDoFluxo, type Fluxo, type ResultadoSimulacao } from "@/lib/fluxo-automacao"
import { sessaoAtual } from "@/lib/sessao"
import type { ContatoTeste } from "./components/editor-fluxo"
import type { RegraListada } from "./components/lista-regras"

const CAMINHO_LISTA = "/configuracoes/automacoes"
const SEM_PERMISSAO = "Sem permissão"

/** A regra como o editor recebe: `id` nulo enquanto não foi salva. */
export interface RegraDoEditor {
  id: string | null
  /** Regra antiga que esta versão substitui. */
  automationId: string | null
  nome: string
  fluxo: Fluxo
}

async function adminDaSessao() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || perfil?.role !== "admin") return null
  return { supabase, workspaceId: perfil.workspace_id }
}

type Admin = NonNullable<Awaited<ReturnType<typeof adminDaSessao>>>

const paraJson = (fluxo: Fluxo) => fluxo as unknown as Json

export async function listarRegras(): Promise<RegraListada[]> {
  const admin = await adminDaSessao()
  if (!admin) return []
  const { supabase, workspaceId } = admin

  const [{ data: fluxos }, { data: antigas }] = await Promise.all([
    supabase
      .from("automation_flows")
      .select("id, nome, ativa, fluxo, automation_id, created_at")
      .eq("workspace_id", workspaceId),
    supabase
      .from("automations")
      .select("id, nome, ativa, gatilho_tipo, gatilho_config, acao_tipo, acao_config, created_at")
      .eq("workspace_id", workspaceId),
  ])

  const substituidas = new Set((fluxos ?? []).map((f) => f.automation_id).filter(Boolean))
  const regras: RegraListada[] = []
  const criadaEm = new Map<string, string>()
  for (const f of fluxos ?? []) {
    const fluxo = lerFluxo(f.fluxo)
    if (!fluxo) continue
    criadaEm.set(f.id, f.created_at)
    regras.push({
      id: f.id,
      nome: f.nome,
      ativa: f.ativa,
      fluxo,
      substituiAntiga: f.automation_id !== null,
      execucoes7dias: 0,
      ultimaExecucao: null,
    })
  }
  for (const a of antigas ?? []) {
    if (substituidas.has(a.id)) continue
    criadaEm.set(a.id, a.created_at)
    regras.push({
      id: a.id,
      nome: a.nome,
      ativa: a.ativa,
      fluxo: fluxoDaRegraAntiga(a),
      versaoAntiga: true,
      execucoes7dias: 0,
      ultimaExecucao: null,
    })
  }

  // Na ordem de criação, como o motor roda
  const quando = (r: RegraListada) => criadaEm.get(r.id) ?? ""
  return regras.sort((a, b) => (quando(a) < quando(b) ? -1 : quando(a) > quando(b) ? 1 : 0))
}

/**
 * A regra que o editor abre. `id` "nova" com `antigaId` abre a regra antiga
 * convertida em fluxo; se ela já tem versão nova, devolve o endereço dela.
 */
export async function buscarRegraParaEditor(
  id: string,
  antigaId: string | null
): Promise<{ regra: RegraDoEditor } | { redirecionar: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { redirecionar: "/perfil" }
  const { supabase, workspaceId } = admin

  if (id !== "nova") {
    const { data } = await supabase
      .from("automation_flows")
      .select("id, nome, fluxo, automation_id")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    const fluxo = data ? lerFluxo(data.fluxo) : null
    if (!data || !fluxo) return { redirecionar: CAMINHO_LISTA }
    return { regra: { id: data.id, automationId: data.automation_id, nome: data.nome, fluxo } }
  }

  if (!antigaId) {
    return {
      regra: {
        id: null,
        automationId: null,
        nome: "",
        fluxo: {
          blocos: [{ id: "gatilho", tipo: "gatilho", gatilho: "card_movido", parametros: {}, posicao: { x: 0, y: 0 } }],
          ligacoes: [],
        },
      },
    }
  }

  const { data: versaoNova } = await supabase
    .from("automation_flows")
    .select("id")
    .eq("automation_id", antigaId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (versaoNova) return { redirecionar: `${CAMINHO_LISTA}/${versaoNova.id}` }

  const { data: antiga } = await supabase
    .from("automations")
    .select("id, nome, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
    .eq("id", antigaId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (!antiga) return { redirecionar: CAMINHO_LISTA }
  return { regra: { id: null, automationId: antiga.id, nome: antiga.nome, fluxo: fluxoDaRegraAntiga(antiga) } }
}

/** Etiquetas, atendentes, números, times e etapas citados no fluxo existem e são da empresa? */
async function conferirReferencias({ supabase, workspaceId }: Admin, fluxo: Fluxo): Promise<string | null> {
  const { etiquetas, atendentes, conexoes, times, etapas, dadosDoContato } = referenciasDoFluxo(fluxo)
  if (!etapas.every(etapaValida)) return "Uma etapa escolhida não existe no funil. Escolha de novo."
  if (!dadosDoContato.every(({ campo, valor }) => dadoDoContatoValido(campo, valor))) {
    return "O dado do contato escolhido não pode receber esse valor. Confira o campo e o valor."
  }

  const contar = async (tabela: "labels" | "profiles" | "whatsapp_connections" | "teams", ids: string[]) => {
    if (ids.length === 0) return 0
    const { count } = await supabase
      .from(tabela)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("id", ids)
    return count ?? 0
  }
  const [nEtiquetas, nAtendentes, nConexoes, nTimes] = await Promise.all([
    contar("labels", etiquetas),
    contar("profiles", atendentes),
    contar("whatsapp_connections", conexoes),
    contar("teams", times),
  ])
  if (nEtiquetas !== etiquetas.length) return "Uma etiqueta escolhida não existe mais. Escolha de novo."
  if (nAtendentes !== atendentes.length) return "Um atendente escolhido não existe mais. Escolha de novo."
  if (nConexoes !== conexoes.length) return "Um número escolhido não existe mais. Escolha de novo."
  if (nTimes !== times.length) return "Um time escolhido não existe mais. Escolha de novo."
  return null
}

export async function salvarRegra(dados: {
  id: string | null
  automationId: string | null
  nome: string
  fluxo: unknown
}): Promise<{ erro?: string; id?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }
  const { supabase, workspaceId } = admin

  const nome = dados.nome.trim()
  if (!nome) return { erro: "Dê um nome à automação" }
  if (nome.length > 120) return { erro: "O nome pode ter até 120 caracteres" }

  const fluxo = lerFluxo(dados.fluxo)
  if (!fluxo) return { erro: "O desenho da automação veio num formato inválido. Recarregue a página." }
  const pendencias = pendenciasDoFluxo(fluxo)
  const problemas = [...pendencias.gerais, ...Object.values(pendencias.porBloco).flat()]
  if (problemas.length > 0) return { erro: `O fluxo ainda tem pendências: ${[...new Set(problemas)].join(". ")}` }

  const erroReferencia = await conferirReferencias(admin, fluxo)
  if (erroReferencia) return { erro: erroReferencia }

  if (dados.id) {
    const { data, error } = await supabase
      .from("automation_flows")
      .update({ nome, fluxo: paraJson(fluxo) })
      .eq("id", dados.id)
      .eq("workspace_id", workspaceId)
      .select("id")
      .maybeSingle()
    if (error) return { erro: "Não foi possível salvar a automação. Tente novamente." }
    if (!data) return { erro: "Esta automação não existe mais." }
    revalidatePath(CAMINHO_LISTA)
    return { id: data.id }
  }

  // A versão nova de uma regra antiga nasce ativa ou pausada como a antiga estava
  let ativa = true
  if (dados.automationId) {
    const { data: antiga } = await supabase
      .from("automations")
      .select("ativa")
      .eq("id", dados.automationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    if (!antiga) return { erro: "A regra antiga não existe mais." }
    ativa = antiga.ativa
  }

  const { data, error } = await supabase
    .from("automation_flows")
    .insert({ workspace_id: workspaceId, nome, fluxo: paraJson(fluxo), ativa, automation_id: dados.automationId })
    .select("id")
    .single()
  if (error?.code === "23505") {
    return { erro: "Esta regra antiga já tem versão nova. Abra a versão nova pela lista." }
  }
  if (error || !data) return { erro: "Não foi possível salvar a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return { id: data.id }
}

export async function alternarRegra(id: string, ativa: boolean): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

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

/** A cópia nasce pausada, com "(cópia)" no nome, e sem ligação com a regra antiga. */
export async function duplicarRegra(id: string, versaoAntiga: boolean): Promise<{ erro?: string }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }
  const { supabase, workspaceId } = admin

  let original: { nome: string; fluxo: Fluxo } | null = null
  if (versaoAntiga) {
    const { data } = await supabase
      .from("automations")
      .select("nome, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    if (data) original = { nome: data.nome, fluxo: fluxoDaRegraAntiga(data) }
  } else {
    const { data } = await supabase
      .from("automation_flows")
      .select("nome, fluxo")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
    const fluxo = data ? lerFluxo(data.fluxo) : null
    if (data && fluxo) original = { nome: data.nome, fluxo }
  }
  if (!original) return { erro: "Esta automação não existe mais." }

  const { error } = await supabase.from("automation_flows").insert({
    workspace_id: workspaceId,
    nome: `${original.nome} (cópia)`.slice(0, 120),
    fluxo: paraJson(original.fluxo),
    ativa: false,
  })
  if (error) return { erro: "Não foi possível duplicar a automação. Tente novamente." }
  revalidatePath(CAMINHO_LISTA)
  return {}
}

/** Só regras em fluxo. Excluir a versão nova de uma regra antiga faz a antiga voltar a valer no branch. */
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
    .limit(10)

  // Só letras, números, espaço, "+" e "-": o texto entra no filtro `or` do PostgREST,
  // onde vírgula, ponto e parênteses mudam o sentido da consulta
  const busca = texto.replace(/[^\p{L}\p{N} +-]/gu, "").trim().slice(0, 60)
  if (busca) {
    consulta = consulta.or(`name.ilike.%${busca}%,phone_number.ilike.%${busca.replace(/\D/g, "") || busca}%`)
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
  return (data ?? []).map((c) => ({ id: c.id, nome: c.name || c.phone_number, descricao: c.phone_number }))
}

export async function simularRegra(
  contatoId: string,
  fluxoRecebido: unknown
): Promise<{ erro?: string; resultado?: ResultadoSimulacao }> {
  const admin = await adminDaSessao()
  if (!admin) return { erro: SEM_PERMISSAO }

  const fluxo = lerFluxo(fluxoRecebido)
  if (!fluxo) return { erro: "O desenho da automação veio num formato inválido. Recarregue a página." }

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
