"use server"

import { createClient } from "@/integrations/supabase/server"

export type GatilhoTipo = "card_movido" | "conversa_criada"
export type AcaoTipo = "enviar_mensagem" | "aplicar_etiqueta" | "atribuir_atendente" | "mover_card"

export type AutomacaoListada = {
  id: string
  nome: string
  ativa: boolean
  gatilhoTipo: GatilhoTipo
  gatilhoConfig: { funil?: string; etapa?: string }
  acaoTipo: AcaoTipo
  acaoConfig: { texto?: string; label_id?: string; atendente_id?: string; funil?: string; etapa?: string }
}

export type DadosAutomacao = {
  nome: string
  gatilhoTipo: GatilhoTipo
  gatilhoConfig: { funil?: string; etapa?: string }
  acaoTipo: AcaoTipo
  acaoConfig: { texto?: string; label_id?: string; atendente_id?: string; funil?: string; etapa?: string }
}

async function perfilAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { supabase, perfil: null }
  return { supabase, perfil }
}

function validar(dados: DadosAutomacao): string | null {
  if (!dados.nome.trim()) return "Informe um nome para a automação"
  if (dados.gatilhoTipo === "card_movido" && (!dados.gatilhoConfig.funil || !dados.gatilhoConfig.etapa)) {
    return "Escolha o funil e a etapa do gatilho"
  }
  if (dados.acaoTipo === "enviar_mensagem" && !dados.acaoConfig.texto?.trim()) {
    return "Escreva a mensagem que será enviada"
  }
  if (dados.acaoTipo === "aplicar_etiqueta" && !dados.acaoConfig.label_id) {
    return "Escolha a etiqueta que será aplicada"
  }
  if (dados.acaoTipo === "atribuir_atendente" && !dados.acaoConfig.atendente_id) {
    return "Escolha o atendente"
  }
  if (dados.acaoTipo === "mover_card" && (!dados.acaoConfig.funil || !dados.acaoConfig.etapa)) {
    return "Escolha o funil e a etapa de destino"
  }
  return null
}

export async function listarAutomacoes(): Promise<AutomacaoListada[]> {
  const { supabase, perfil } = await perfilAdmin()
  if (!perfil) return []

  const { data } = await supabase
    .from("automations")
    .select("id, nome, ativa, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at")

  return (data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    ativa: a.ativa,
    gatilhoTipo: a.gatilho_tipo as GatilhoTipo,
    gatilhoConfig: (a.gatilho_config ?? {}) as AutomacaoListada["gatilhoConfig"],
    acaoTipo: a.acao_tipo as AcaoTipo,
    acaoConfig: (a.acao_config ?? {}) as AutomacaoListada["acaoConfig"],
  }))
}

export async function criarAutomacao(dados: DadosAutomacao): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAdmin()
  if (!perfil) return { erro: "Sem permissão" }

  const erroValidacao = validar(dados)
  if (erroValidacao) return { erro: erroValidacao }

  const { error } = await supabase.from("automations").insert({
    workspace_id: perfil.workspace_id,
    nome: dados.nome.trim(),
    gatilho_tipo: dados.gatilhoTipo,
    gatilho_config: dados.gatilhoConfig,
    acao_tipo: dados.acaoTipo,
    acao_config: dados.acaoConfig,
  })

  if (error) return { erro: "Não foi possível criar a automação. Tente novamente." }
  return {}
}

export async function editarAutomacao(id: string, dados: DadosAutomacao): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAdmin()
  if (!perfil) return { erro: "Sem permissão" }

  const erroValidacao = validar(dados)
  if (erroValidacao) return { erro: erroValidacao }

  const { error } = await supabase
    .from("automations")
    .update({
      nome: dados.nome.trim(),
      gatilho_tipo: dados.gatilhoTipo,
      gatilho_config: dados.gatilhoConfig,
      acao_tipo: dados.acaoTipo,
      acao_config: dados.acaoConfig,
    })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível salvar a automação. Tente novamente." }
  return {}
}

export async function alternarAutomacao(id: string, ativa: boolean): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAdmin()
  if (!perfil) return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("automations")
    .update({ ativa })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível alterar a automação. Tente novamente." }
  return {}
}

export async function excluirAutomacao(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAdmin()
  if (!perfil) return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível excluir a automação. Tente novamente." }
  return {}
}
