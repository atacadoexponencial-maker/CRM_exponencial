// Ações que o motor já sabe executar: as 4 da primeira versão (enviar mensagem,
// aplicar etiqueta, atribuir atendente, mover card), com o mesmo comportamento,
// e as da B11-11 (tags, remover etiqueta, dado do contato, atribuir a um time).
// As outras do editor entram nas próximas issues; até lá, contam como falha.
//
// Cada ação devolve se deu certo. Falha não interrompe o caminho: quem percorre
// o fluxo segue para o próximo bloco (ver `percorrerFluxo`). Ação que não muda
// nada porque o contato já está como ela deixaria (tag que ele já tem, etiqueta
// que não está lá) conta como feita.
//
// Guarda anti-loop: as ações gravam direto no banco e nunca chamam o motor de
// novo, então mover um card aqui não dispara as regras de "card movido".

import { normalizarTag, tagValida, type BlocoAcao } from "@/lib/fluxo-automacao"
import { enviarTextoWhatsApp } from "@/lib/whatsapp-envio"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { dadoDoContatoValido } from "./referencias"

const CONVERSA_ABERTA = ["em_espera", "em_atendimento"]

export async function executarAcao(contexto: ContextoDaExecucao, bloco: BlocoAcao): Promise<boolean> {
  const { supabase, gatilho } = contexto
  const contactId = gatilho.contactId
  if (!contactId) return false
  const parametros = bloco.parametros

  switch (bloco.acao) {
    case "enviar_mensagem": {
      if (!parametros.texto) return false
      return enviarTextoWhatsApp(supabase, gatilho.workspaceId, contactId, parametros.texto)
    }
    case "aplicar_etiqueta": {
      if (!parametros.label_id) return false
      const conversaId = await conversaDoEvento(contexto)
      if (!conversaId) return false
      const { error } = await supabase
        .from("conversation_labels")
        .upsert({ conversation_id: conversaId, label_id: parametros.label_id }, { onConflict: "conversation_id,label_id" })
      return !error
    }
    case "remover_etiqueta": {
      if (!parametros.label_id) return false
      const conversaId = await conversaDoEvento(contexto)
      if (!conversaId) return false
      const { error } = await supabase
        .from("conversation_labels")
        .delete()
        .eq("conversation_id", conversaId)
        .eq("label_id", parametros.label_id)
      return !error
    }
    case "atribuir_atendente": {
      if (!parametros.atendente_id) return false
      return atribuir(contexto, parametros.atendente_id)
    }
    case "atribuir_time": {
      if (!parametros.time_id) return false
      const atendenteId = await atendenteDoTime(contexto, parametros.time_id)
      if (!atendenteId) return false
      return atribuir(contexto, atendenteId)
    }
    case "adicionar_tag": {
      if (!tagValida(parametros.tag ?? "")) return false
      const { error } = await supabase
        .from("contact_tags")
        .insert({ contact_id: contactId, workspace_id: gatilho.workspaceId, tag: normalizarTag(parametros.tag) })
      // 23505: o contato já tem a tag
      return !error || error.code === "23505"
    }
    case "remover_tag": {
      if (!parametros.tag) return false
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contactId)
        .eq("workspace_id", gatilho.workspaceId)
        .eq("tag", normalizarTag(parametros.tag))
      return !error
    }
    case "alterar_dado_contato": {
      const { campo, valor } = parametros
      if (!campo || !valor || !dadoDoContatoValido(campo, valor)) return false
      return alterarDadoDoContato(contexto, contactId, campo, valor)
    }
    case "mover_card": {
      const { funil, etapa } = parametros
      if (!funil || !etapa) return false

      const { data: card } = await supabase
        .from("pipeline_cards")
        .select("id, etapa")
        .eq("workspace_id", gatilho.workspaceId)
        .eq("contact_id", contactId)
        .eq("funil", funil)
        .maybeSingle()

      if (!card) return false
      if (card.etapa === etapa) return true

      const { error } = await supabase
        .from("pipeline_cards")
        .update({ etapa, etapa_changed_at: new Date().toISOString() })
        .eq("id", card.id)
      if (error) return false

      // alterado_por nulo = movimentação feita pelo sistema/automação
      await supabase.from("pipeline_card_history").insert({
        card_id: card.id,
        de_etapa: card.etapa,
        para_etapa: etapa,
        alterado_por: null,
      })
      return true
    }
    default:
      return false
  }
}

/**
 * Passa a conversa do evento e, no "card movido", o card para o atendente. As
 * duas gravações são tentadas, como na primeira versão: a falha de uma não
 * impede a outra.
 */
async function atribuir(contexto: ContextoDaExecucao, atendenteId: string): Promise<boolean> {
  const { supabase, gatilho } = contexto
  let deuCerto = true
  const conversaId = await conversaDoEvento(contexto)
  if (conversaId) {
    const { error } = await supabase.from("conversations").update({ assigned_to: atendenteId }).eq("id", conversaId)
    if (error) deuCerto = false
  }
  if (gatilho.tipo === "card_movido") {
    const { error } = await supabase.from("pipeline_cards").update({ atendente_id: atendenteId }).eq("id", gatilho.cardId)
    if (error) deuCerto = false
  }
  return deuCerto
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
): Promise<boolean> {
  let mudanca: Record<string, string> = { [campo]: valor.trim() }

  if (campo === "observacoes") {
    const { data: contato, error } = await supabase
      .from("contacts")
      .select("observacoes")
      .eq("id", contactId)
      .eq("workspace_id", gatilho.workspaceId)
      .maybeSingle()
    if (error || !contato) return false
    const atuais = (contato.observacoes ?? "").trimEnd()
    mudanca = { observacoes: atuais ? `${atuais}\n${valor.trim()}` : valor.trim() }
  }

  const { error } = await supabase
    .from("contacts")
    .update(mudanca)
    .eq("id", contactId)
    .eq("workspace_id", gatilho.workspaceId)
  return !error
}
