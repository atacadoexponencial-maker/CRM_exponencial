// Motor de automações (estilo Kommo): avalia os gatilhos disparados pelo app
// e executa as ações configuradas pelo workspace. Roda sempre no backend com
// o service client (o webhook não tem sessão de usuário) e nunca propaga erro
// para o fluxo que disparou o gatilho.
//
// Guarda anti-loop: ações executadas aqui (ex.: mover_card) NÃO disparam
// novos gatilhos — a avaliação é de nível único.

import { createServiceClient } from "@/integrations/supabase/service"
import { buscarConversaAberta, enviarTextoWhatsApp } from "@/lib/whatsapp-envio"

export type GatilhoAutomacao =
  | {
      tipo: "card_movido"
      workspaceId: string
      contactId: string | null
      cardId: string
      funil: "expansao" | "retencao"
      etapa: string
    }
  | {
      tipo: "conversa_criada"
      workspaceId: string
      contactId: string
      conversationId: string
    }

type Automacao = {
  id: string
  gatilho_tipo: string
  gatilho_config: Record<string, string | null>
  acao_tipo: string
  acao_config: Record<string, string | null>
}

type ServiceClient = ReturnType<typeof createServiceClient>

export async function processarAutomacoes(gatilho: GatilhoAutomacao): Promise<void> {
  try {
    const supabase = createServiceClient()

    const { data } = await supabase
      .from("automations")
      .select("id, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("gatilho_tipo", gatilho.tipo)
      .eq("ativa", true)

    for (const automacao of (data ?? []) as Automacao[]) {
      if (!gatilhoCorresponde(automacao, gatilho)) continue
      // Cada ação é isolada: falha em uma não impede as demais
      await executarAcao(supabase, automacao, gatilho).catch(() => {})
    }
  } catch {
    // Automação nunca pode derrubar o fluxo principal (envio, webhook, pipeline)
  }
}

function gatilhoCorresponde(automacao: Automacao, gatilho: GatilhoAutomacao): boolean {
  if (gatilho.tipo === "card_movido") {
    const config = automacao.gatilho_config
    if (config.funil && config.funil !== gatilho.funil) return false
    if (config.etapa && config.etapa !== gatilho.etapa) return false
  }
  return true
}

async function executarAcao(
  supabase: ServiceClient,
  automacao: Automacao,
  gatilho: GatilhoAutomacao
): Promise<void> {
  const contactId = gatilho.contactId
  if (!contactId) return

  switch (automacao.acao_tipo) {
    case "enviar_mensagem": {
      const texto = automacao.acao_config.texto
      if (!texto) return
      await enviarTextoWhatsApp(supabase, gatilho.workspaceId, contactId, texto)
      return
    }
    case "aplicar_etiqueta": {
      const labelId = automacao.acao_config.label_id
      if (!labelId) return
      const conversaId =
        gatilho.tipo === "conversa_criada"
          ? gatilho.conversationId
          : await buscarConversaAberta(supabase, gatilho.workspaceId, contactId)
      if (!conversaId) return
      await supabase
        .from("conversation_labels")
        .upsert({ conversation_id: conversaId, label_id: labelId }, { onConflict: "conversation_id,label_id" })
      return
    }
    case "atribuir_atendente": {
      const atendenteId = automacao.acao_config.atendente_id
      if (!atendenteId) return
      const conversaId =
        gatilho.tipo === "conversa_criada"
          ? gatilho.conversationId
          : await buscarConversaAberta(supabase, gatilho.workspaceId, contactId)
      if (conversaId) {
        await supabase.from("conversations").update({ assigned_to: atendenteId }).eq("id", conversaId)
      }
      if (gatilho.tipo === "card_movido") {
        await supabase.from("pipeline_cards").update({ atendente_id: atendenteId }).eq("id", gatilho.cardId)
      }
      return
    }
    case "mover_card": {
      const funil = automacao.acao_config.funil
      const etapa = automacao.acao_config.etapa
      if (!funil || !etapa) return

      const { data: card } = await supabase
        .from("pipeline_cards")
        .select("id, etapa")
        .eq("workspace_id", gatilho.workspaceId)
        .eq("contact_id", contactId)
        .eq("funil", funil)
        .maybeSingle()

      if (!card || card.etapa === etapa) return

      const { error } = await supabase
        .from("pipeline_cards")
        .update({ etapa, etapa_changed_at: new Date().toISOString() })
        .eq("id", card.id)

      if (!error) {
        // alterado_por nulo = movimentação feita pelo sistema/automação
        await supabase.from("pipeline_card_history").insert({
          card_id: card.id,
          de_etapa: card.etapa,
          para_etapa: etapa,
          alterado_por: null,
        })
      }
      return
    }
  }
}

