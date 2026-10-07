// Ações que o motor já sabe executar: as 4 da primeira versão (enviar mensagem,
// aplicar etiqueta, atribuir atendente, mover card), com o mesmo comportamento.
// As outras do editor entram nas próximas issues; até lá, contam como falha.
//
// Cada ação devolve se deu certo. Falha não interrompe o caminho: quem percorre
// o fluxo segue para o próximo bloco (ver `percorrerFluxo`).
//
// Guarda anti-loop: as ações gravam direto no banco e nunca chamam o motor de
// novo, então mover um card aqui não dispara as regras de "card movido".

import type { BlocoAcao } from "@/lib/fluxo-automacao"
import { enviarTextoWhatsApp } from "@/lib/whatsapp-envio"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"

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
    case "atribuir_atendente": {
      const atendenteId = parametros.atendente_id
      if (!atendenteId) return false
      // As duas gravações são tentadas, como na primeira versão: a falha de uma não impede a outra.
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
