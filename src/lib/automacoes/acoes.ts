// Ações que o motor já sabe executar: as 4 da primeira versão (enviar mensagem,
// aplicar etiqueta, atribuir atendente, mover card), com o mesmo comportamento,
// e as da B11-11 (tags, remover etiqueta, dado do contato, atribuir a um time).
// As outras do editor entram nas próximas issues; até lá, contam como falha.
//
// Cada ação devolve se deu certo e, se não, o motivo em português, que vai para
// o histórico (B11-03). Falha não interrompe o caminho: quem percorre o fluxo
// segue para o próximo bloco (ver `percorrerFluxo`). Ação que não muda nada
// porque o contato já está como ela deixaria (tag que ele já tem, etiqueta que
// não está lá) conta como feita.
//
// Guarda anti-loop: as ações gravam direto no banco e nunca chamam o motor de
// novo, então mover um card aqui não dispara as regras de "card movido".

import {
  SEQUENCIA_DA_ETAPA,
  normalizarTag,
  tagValida,
  type BlocoAcao,
  type ResultadoAcao,
} from "@/lib/fluxo-automacao"
import { processarGatilhoSequencia } from "@/lib/sequencias"
import { enviarTextoWhatsAppComMotivo } from "@/lib/whatsapp-envio"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { dadoDoContatoValido } from "./referencias"

const CONVERSA_ABERTA = ["em_espera", "em_atendimento"]

const FEITO: ResultadoAcao = { ok: true }
const falhou = (motivo: string): ResultadoAcao => ({ ok: false, motivo })

const SEM_CONVERSA = falhou("O contato não tem conversa aberta")
const CONFIGURACAO_INCOMPLETA = falhou("A ação está sem configuração")
const ERRO_NO_BANCO = falhou("Erro ao gravar no banco")

/** Erro de chave estrangeira: o registro apontado (etiqueta, atendente) foi apagado. */
const apontaParaApagado = (error: { code?: string } | null) => error?.code === "23503"

const NOME_DO_FUNIL: Record<string, string> = { entrada: "Funil de Entrada", recompra: "Funil de Recompra" }

export async function executarAcao(contexto: ContextoDaExecucao, bloco: BlocoAcao): Promise<ResultadoAcao> {
  const { supabase, gatilho } = contexto
  const contactId = gatilho.contactId
  if (!contactId) return falhou("O evento não tem contato")
  const parametros = bloco.parametros

  switch (bloco.acao) {
    case "enviar_mensagem": {
      if (!parametros.texto) return CONFIGURACAO_INCOMPLETA
      return enviarTextoWhatsAppComMotivo(supabase, gatilho.workspaceId, contactId, parametros.texto)
    }
    case "aplicar_etiqueta": {
      if (!parametros.label_id) return CONFIGURACAO_INCOMPLETA
      const conversaId = await conversaDoEvento(contexto)
      if (!conversaId) return SEM_CONVERSA
      const { error } = await supabase
        .from("conversation_labels")
        .upsert({ conversation_id: conversaId, label_id: parametros.label_id }, { onConflict: "conversation_id,label_id" })
      if (apontaParaApagado(error)) return falhou("A etiqueta não existe mais")
      return error ? ERRO_NO_BANCO : FEITO
    }
    case "remover_etiqueta": {
      if (!parametros.label_id) return CONFIGURACAO_INCOMPLETA
      const conversaId = await conversaDoEvento(contexto)
      if (!conversaId) return SEM_CONVERSA
      const { error } = await supabase
        .from("conversation_labels")
        .delete()
        .eq("conversation_id", conversaId)
        .eq("label_id", parametros.label_id)
      return error ? ERRO_NO_BANCO : FEITO
    }
    case "atribuir_atendente": {
      if (!parametros.atendente_id) return CONFIGURACAO_INCOMPLETA
      return atribuir(contexto, parametros.atendente_id)
    }
    case "atribuir_time": {
      if (!parametros.time_id) return CONFIGURACAO_INCOMPLETA
      const atendenteId = await atendenteDoTime(contexto, parametros.time_id)
      if (!atendenteId) return falhou("O time não tem atendente ativo")
      return atribuir(contexto, atendenteId)
    }
    case "adicionar_tag": {
      if (!tagValida(parametros.tag ?? "")) return falhou("A tag não é válida")
      const { error } = await supabase
        .from("contact_tags")
        .insert({ contact_id: contactId, workspace_id: gatilho.workspaceId, tag: normalizarTag(parametros.tag) })
      // 23505: o contato já tem a tag
      return !error || error.code === "23505" ? FEITO : ERRO_NO_BANCO
    }
    case "remover_tag": {
      if (!parametros.tag) return CONFIGURACAO_INCOMPLETA
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contactId)
        .eq("workspace_id", gatilho.workspaceId)
        .eq("tag", normalizarTag(parametros.tag))
      return error ? ERRO_NO_BANCO : FEITO
    }
    case "alterar_dado_contato": {
      const { campo, valor } = parametros
      if (!campo || !valor || !dadoDoContatoValido(campo, valor)) return falhou("O campo ou o valor não é válido")
      return alterarDadoDoContato(contexto, contactId, campo, valor)
    }
    case "mover_card": {
      const { funil, etapa } = parametros
      if (!funil || !etapa) return CONFIGURACAO_INCOMPLETA

      const { data: card, error: erroBusca } = await supabase
        .from("pipeline_cards")
        .select("id, etapa, atendente_id")
        .eq("workspace_id", gatilho.workspaceId)
        .eq("contact_id", contactId)
        .eq("funil", funil)
        .maybeSingle()
      if (erroBusca) return ERRO_NO_BANCO

      // Contato sem card neste funil: a automação não cria. Na Recompra, o card
      // nasce quando o card da Entrada chega em Ganho (abaixo), como no CRM.
      if (!card) return falhou(`O contato não tem card no ${NOME_DO_FUNIL[funil] ?? funil}`)

      const moveu = card.etapa !== etapa
      if (moveu) {
        const { error } = await supabase
          .from("pipeline_cards")
          .update({ etapa, etapa_changed_at: new Date().toISOString() })
          .eq("id", card.id)
        if (error) return ERRO_NO_BANCO

        // alterado_por nulo = movimentação feita pelo sistema/automação
        await supabase.from("pipeline_card_history").insert({
          card_id: card.id,
          de_etapa: card.etapa,
          para_etapa: etapa,
          alterado_por: null,
        })
      }

      // A sequência da etapa começa só se o admin marcou na ação, e só quando o
      // card de fato entra nela (ou, em Ganho, quando o card da Recompra nasce)
      const sequencia = parametros.iniciar_sequencia === "sim" ? SEQUENCIA_DA_ETAPA[`${funil}:${etapa}`] : undefined
      let entrouNaEtapa = moveu

      if (funil === "entrada" && etapa === "ganho") {
        const recompra = await abrirCardDeRecompra(contexto, contactId)
        if (recompra === "falhou") return falhou("O card foi para Ganho, mas o card na Recompra não pôde ser criado")
        entrouNaEtapa = recompra === "criado"
      }

      if (sequencia && entrouNaEtapa) {
        await processarGatilhoSequencia({
          workspaceId: gatilho.workspaceId,
          contactId,
          atendenteId: card.atendente_id,
          gatilho: sequencia,
        })
      }
      return FEITO
    }
    default:
      return falhou("Esta ação ainda não está disponível")
  }
}

/**
 * Regra do CRM para o card que chega em Ganho: o contato ganha um card na
 * Recompra, em Onboarding, se ainda não tiver. É o que o arrastar manual faz
 * (`moverCard`, em src/app/(auth)/pipeline/actions.ts). Diferente dele, aqui
 * não roda automação para o card novo (guarda anti-loop). A sequência de
 * onboarding é opção da ação (decisões, seção 7.5).
 */
async function abrirCardDeRecompra(
  { supabase, gatilho }: ContextoDaExecucao,
  contactId: string
): Promise<"criado" | "existente" | "falhou"> {
  const { data: existente, error: erroBusca } = await supabase
    .from("pipeline_cards")
    .select("id")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("contact_id", contactId)
    .eq("funil", "recompra")
    .maybeSingle()
  if (erroBusca) return "falhou"
  if (existente) return "existente"

  const { error } = await supabase.from("pipeline_cards").insert({
    funil: "recompra",
    etapa: "onboarding",
    contact_id: contactId,
    workspace_id: gatilho.workspaceId,
  })
  return error ? "falhou" : "criado"
}

/**
 * Passa a conversa do evento e, no "card movido", o card para o atendente. As
 * duas gravações são tentadas, como na primeira versão: a falha de uma não
 * impede a outra.
 */
async function atribuir(contexto: ContextoDaExecucao, atendenteId: string): Promise<ResultadoAcao> {
  const { supabase, gatilho } = contexto
  const erros: Array<{ code?: string } | null> = []
  const conversaId = await conversaDoEvento(contexto)
  if (conversaId) {
    const { error } = await supabase.from("conversations").update({ assigned_to: atendenteId }).eq("id", conversaId)
    erros.push(error)
  }
  if (gatilho.tipo === "card_movido") {
    const { error } = await supabase.from("pipeline_cards").update({ atendente_id: atendenteId }).eq("id", gatilho.cardId)
    erros.push(error)
  }
  if (erros.some(apontaParaApagado)) return falhou("O atendente não existe mais")
  return erros.some(Boolean) ? ERRO_NO_BANCO : FEITO
}

/**
 * O membro ativo do time com menos conversas abertas. No empate, o primeiro
 * pelo nome, para o resultado ser previsível. `null` quando o time não tem
 * ninguém ativo.
 */
async function atendenteDoTime({ supabase, gatilho }: ContextoDaExecucao, timeId: string): Promise<string | null> {
  const { data: membros } = await supabase.from("user_teams").select("user_id").eq("team_id", timeId)
  const ids = (membros ?? []).map((m) => m.user_id)
  if (ids.length === 0) return null

  const [{ data: ativos }, { data: abertas }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("status", "active")
      .in("id", ids),
    supabase
      .from("conversations")
      .select("assigned_to")
      .eq("workspace_id", gatilho.workspaceId)
      .in("assigned_to", ids)
      .in("status", CONVERSA_ABERTA),
  ])
  if (!ativos || ativos.length === 0) return null

  const carga = new Map<string, number>()
  for (const c of abertas ?? []) carga.set(c.assigned_to, (carga.get(c.assigned_to) ?? 0) + 1)

  const [escolhido] = [...ativos].sort(
    (a, b) => (carga.get(a.id) ?? 0) - (carga.get(b.id) ?? 0) || (a.name ?? "").localeCompare(b.name ?? "", "pt-BR")
  )
  return escolhido.id
}

/** Tipo, nicho e cidade trocam o valor; observações ganham uma linha no fim. */
async function alterarDadoDoContato(
  { supabase, gatilho }: ContextoDaExecucao,
  contactId: string,
  campo: string,
  valor: string
): Promise<ResultadoAcao> {
  let mudanca: Record<string, string> = { [campo]: valor.trim() }

  if (campo === "observacoes") {
    const { data: contato, error } = await supabase
      .from("contacts")
      .select("observacoes")
      .eq("id", contactId)
      .eq("workspace_id", gatilho.workspaceId)
      .maybeSingle()
    if (error) return ERRO_NO_BANCO
    if (!contato) return falhou("Contato não encontrado")
    const atuais = (contato.observacoes ?? "").trimEnd()
    mudanca = { observacoes: atuais ? `${atuais}\n${valor.trim()}` : valor.trim() }
  }

  const { error } = await supabase
    .from("contacts")
    .update(mudanca)
    .eq("id", contactId)
    .eq("workspace_id", gatilho.workspaceId)
  return error ? ERRO_NO_BANCO : FEITO
}
