"use server"

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { iniciarExecucaoSequencia } from "@/lib/sequencias"

export type SequenciaListada = {
  id: string
  nome: string
  gatilho: string
  predefinida: boolean
  ativa: boolean
  emAndamento: number
}

export type EtapaSequencia = {
  id?: string
  tipo: "mensagem" | "lembrete"
  prazoDias: number
  conteudo: string
  instrucao: string
}

export type SequenciaDetalhe = {
  id: string
  nome: string
  gatilho: string
  predefinida: boolean
  ativa: boolean
  etapas: EtapaSequencia[]
}

const GATILHOS_VALIDOS = ["manual", "card_lead", "catalogo_enviado", "onboarding", "inativo"]

async function perfilAtual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  return { supabase, user, perfil }
}

export async function listarSequencias(): Promise<SequenciaListada[]> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return []

  const { data } = await supabase
    .from("sequences")
    .select("id, nome, gatilho, predefinida, ativa, sequence_runs(id, status)")
    .eq("workspace_id", perfil.workspace_id)
    .order("predefinida", { ascending: false })
    .order("created_at")

  return (data ?? []).map((s) => ({
    id: s.id,
    nome: s.nome,
    gatilho: s.gatilho,
    predefinida: s.predefinida,
    ativa: s.ativa,
    emAndamento: ((s.sequence_runs ?? []) as Array<{ status: string }>).filter(
      (r) => r.status === "em_andamento"
    ).length,
  }))
}

export async function buscarSequencia(id: string): Promise<SequenciaDetalhe | null> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return null

  const { data } = await supabase
    .from("sequences")
    .select("id, nome, gatilho, predefinida, ativa, sequence_steps(id, ordem, tipo, prazo_dias, conteudo, instrucao)")
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!data) return null

  const etapas = ((data.sequence_steps ?? []) as Array<{
    id: string
    ordem: number
    tipo: "mensagem" | "lembrete"
    prazo_dias: number
    conteudo: string | null
    instrucao: string | null
  }>)
    .sort((a, b) => a.ordem - b.ordem)
    .map((e) => ({
      id: e.id,
      tipo: e.tipo,
      prazoDias: e.prazo_dias,
      conteudo: e.conteudo ?? "",
      instrucao: e.instrucao ?? "",
    }))

  return {
    id: data.id,
    nome: data.nome,
    gatilho: data.gatilho,
    predefinida: data.predefinida,
    ativa: data.ativa,
    etapas,
  }
}

function validarSequencia(nome: string, gatilho: string, etapas: EtapaSequencia[]): string | null {
  if (!nome.trim()) return "Informe um nome para a sequência"
  if (!GATILHOS_VALIDOS.includes(gatilho)) return "Gatilho inválido"
  if (etapas.length === 0) return "A sequência precisa de pelo menos uma etapa"
  for (const [i, e] of etapas.entries()) {
    if (e.prazoDias < 0) return `Etapa ${i + 1}: o prazo não pode ser negativo`
    if (e.tipo === "mensagem" && !e.conteudo.trim()) return `Etapa ${i + 1}: a mensagem automática precisa de conteúdo`
    if (e.tipo === "lembrete" && !e.instrucao.trim()) return `Etapa ${i + 1}: o lembrete precisa de instrução para o vendedor`
  }
  return null
}

export async function salvarSequencia(params: {
  id: string | null // null = nova
  nome: string
  gatilho: string
  etapas: EtapaSequencia[]
}): Promise<{ id?: string; erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const erro = validarSequencia(params.nome, params.gatilho, params.etapas)
  if (erro) return { erro }

  let sequenceId = params.id

  if (sequenceId) {
    const { error } = await supabase
      .from("sequences")
      .update({ nome: params.nome.trim(), gatilho: params.gatilho })
      .eq("id", sequenceId)
      .eq("workspace_id", perfil.workspace_id)
    if (error) return { erro: "Não foi possível salvar a sequência" }

    // Substitui as etapas (abordagem simples e consistente)
    const { error: delError } = await supabase
      .from("sequence_steps")
      .delete()
      .eq("sequence_id", sequenceId)
    if (delError) return { erro: "Não foi possível salvar as etapas" }
  } else {
    const { data, error } = await supabase
      .from("sequences")
      .insert({
        workspace_id: perfil.workspace_id,
        nome: params.nome.trim(),
        gatilho: params.gatilho,
        predefinida: false,
      })
      .select("id")
      .single()
    if (error || !data) return { erro: "Não foi possível criar a sequência" }
    sequenceId = data.id
  }

  const { error: stepsError } = await supabase.from("sequence_steps").insert(
    params.etapas.map((e, i) => ({
      sequence_id: sequenceId,
      ordem: i,
      tipo: e.tipo,
      prazo_dias: e.prazoDias,
      conteudo: e.tipo === "mensagem" ? e.conteudo.trim() : null,
      instrucao: e.tipo === "lembrete" ? e.instrucao.trim() : null,
    }))
  )
  if (stepsError) return { erro: "Não foi possível salvar as etapas" }

  return { id: sequenceId ?? undefined }
}

export async function alternarSequencia(id: string, ativa: boolean): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("sequences")
    .update({ ativa })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível alterar a sequência" }
  return {}
}

export async function excluirSequencia(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || perfil.role !== "admin") return { erro: "Sem permissão" }

  const { data: seq } = await supabase
    .from("sequences")
    .select("predefinida, sequence_runs(id, status)")
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!seq) return { erro: "Sequência não encontrada" }
  if (seq.predefinida) return { erro: "Sequências pré-definidas não podem ser excluídas" }

  const emAndamento = ((seq.sequence_runs ?? []) as Array<{ status: string }>).some(
    (r) => r.status === "em_andamento"
  )
  if (emAndamento) return { erro: "Não é possível excluir: há contatos com esta sequência em andamento" }

  const { error } = await supabase
    .from("sequences")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível excluir a sequência" }
  return {}
}

// ── Ativação manual (Perfil do Contato e Painel do Card) ─────────────

export type SequenciaDisponivel = { id: string; nome: string }

export type StatusSequenciasContato = {
  disponiveis: SequenciaDisponivel[]
  emAndamento: Array<{ runId: string; nome: string; etapaAtual: number; totalEtapas: number }>
  historico: Array<{ nome: string; status: string; data: string }>
}

export async function buscarSequenciasContato(contactId: string): Promise<StatusSequenciasContato | null> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return null

  const [{ data: sequencias }, { data: runs }] = await Promise.all([
    supabase
      .from("sequences")
      .select("id, nome, sequence_steps(id)")
      .eq("workspace_id", perfil.workspace_id)
      .eq("ativa", true)
      .order("nome"),
    supabase
      .from("sequence_runs")
      .select("id, status, etapa_atual, created_at, sequences(nome, sequence_steps(id))")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
  ])

  type RunRow = {
    id: string
    status: string
    etapa_atual: number
    created_at: string
    sequences: { nome: string; sequence_steps: Array<{ id: string }> } | null
  }
  const runsTyped = (runs ?? []) as unknown as RunRow[]

  return {
    disponiveis: (sequencias ?? [])
      .filter((s) => ((s.sequence_steps ?? []) as Array<{ id: string }>).length > 0)
      .map((s) => ({ id: s.id, nome: s.nome })),
    emAndamento: runsTyped
      .filter((r) => r.status === "em_andamento")
      .map((r) => ({
        runId: r.id,
        nome: r.sequences?.nome ?? "—",
        etapaAtual: r.etapa_atual + 1,
        totalEtapas: r.sequences?.sequence_steps?.length ?? 0,
      })),
    historico: runsTyped
      .filter((r) => r.status !== "em_andamento")
      .slice(0, 5)
      .map((r) => ({
        nome: r.sequences?.nome ?? "—",
        status: r.status === "concluida" ? "Concluída" : "Cancelada",
        data: new Date(r.created_at).toLocaleDateString("pt-BR"),
      })),
  }
}

export async function iniciarSequenciaManual(
  contactId: string,
  sequenceId: string
): Promise<{ erro?: string }> {
  const { supabase, user, perfil } = await perfilAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }

  // Confere que o contato e a sequência pertencem ao workspace do usuário
  const [{ data: contato }, { data: sequencia }] = await Promise.all([
    supabase.from("contacts").select("workspace_id").eq("id", contactId).single(),
    supabase.from("sequences").select("workspace_id, ativa").eq("id", sequenceId).single(),
  ])

  if (!contato || contato.workspace_id !== perfil.workspace_id) return { erro: "Contato não encontrado" }
  if (!sequencia || sequencia.workspace_id !== perfil.workspace_id) return { erro: "Sequência não encontrada" }
  if (!sequencia.ativa) return { erro: "Esta sequência está desativada" }

  // Atendente que inicia vira o responsável; admin/gerente também
  const service = createServiceClient()
  return iniciarExecucaoSequencia(service, {
    workspaceId: perfil.workspace_id,
    sequenceId,
    contactId,
    atendenteId: user.id,
  })
}

export async function cancelarSequenciaRun(runId: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { error } = await supabase
    .from("sequence_runs")
    .update({ status: "cancelada", proxima_execucao: null, finished_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "em_andamento")

  if (error) return { erro: "Não foi possível cancelar a sequência" }
  return {}
}
