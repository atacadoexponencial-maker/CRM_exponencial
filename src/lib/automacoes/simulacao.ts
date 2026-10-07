// "Testar com um contato" (B11-10): o caminho que o contato faria, com os dados
// reais dele, sem executar nada. As verificações são as mesmas do motor; as
// ações são desligadas e contam como feitas, para o caminho seguir.

import { gatilhoDoFluxo, normalizarTag, percorrerFluxo, type Fluxo, type ResultadoSimulacao } from "@/lib/fluxo-automacao"
import type { GatilhoAutomacao, ServiceClient } from "./contexto"
import { verificacaoVale } from "./verificacoes"

/**
 * O evento que o gatilho do fluxo geraria para o contato. No "card movido", o
 * card do contato entra na etapa do gatilho (ou fica onde está, com "qualquer
 * etapa"). Na "conversa criada" e na "etiqueta aplicada", vale a conversa mais
 * recente dele. Na tag e no dado alterado, o que o gatilho espera. `null` para
 * gatilho que o motor ainda não executa.
 */
export async function eventoDaSimulacao(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  fluxo: Fluxo
): Promise<GatilhoAutomacao | null> {
  const gatilho = gatilhoDoFluxo(fluxo)
  if (!gatilho) return null

  switch (gatilho.gatilho) {
    case "card_movido": {
      const funil = gatilho.parametros.funil === "recompra" ? "recompra" : "entrada"
      const { data: card, error } = await supabase
        .from("pipeline_cards")
        .select("id, etapa")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .eq("funil", funil)
        .maybeSingle()
      if (error) throw error
      return {
        tipo: "card_movido",
        workspaceId,
        contactId,
        cardId: card?.id ?? "",
        funil,
        etapa: gatilho.parametros.etapa || card?.etapa || "",
      }
    }
    case "conversa_criada": {
      // Sem conversa, as verificações sobre a conversa não valem, como no motor
      const conversa = await conversaMaisRecente(supabase, workspaceId, contactId)
      return { tipo: "conversa_criada", workspaceId, contactId, conversationId: conversa ?? "" }
    }
    // B11-06: o evento é o que o gatilho espera; sem parâmetro, um evento "qualquer"
    case "tag_adicionada":
      return { tipo: "tag_adicionada", workspaceId, contactId, tag: normalizarTag(gatilho.parametros.tag ?? "") }
    case "etiqueta_aplicada": {
      const conversa = await conversaMaisRecente(supabase, workspaceId, contactId)
      return {
        tipo: "etiqueta_aplicada",
        workspaceId,
        contactId,
        conversationId: conversa ?? "",
        labelId: gatilho.parametros.label_id ?? "",
      }
    }
    case "dado_contato_alterado":
      return {
        tipo: "dado_contato_alterado",
        workspaceId,
        contactId,
        campo: gatilho.parametros.campo ?? "",
        valor: gatilho.parametros.valor ?? "",
      }
    default:
      return null
  }
}

async function conversaMaisRecente(supabase: ServiceClient, workspaceId: string, contactId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

/** `null` quando o gatilho ainda não pode ser testado. Erro de banco (inclusive numa condição) sobe para quem chamou. */
export async function simularFluxo(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  fluxo: Fluxo
): Promise<ResultadoSimulacao | null> {
  const evento = await eventoDaSimulacao(supabase, workspaceId, contactId, fluxo)
  if (!evento) return null

  const contexto = { supabase, gatilho: evento }
  const caminho = await percorrerFluxo(fluxo, {
    avaliarVerificacao: (verificacao) => verificacaoVale(contexto, verificacao),
    executarAcao: async () => ({ ok: true }),
  })
  // Uma condição que não conseguiu consultar o banco: o teste não tem resultado para mostrar
  if (caminho.erro) throw new Error(caminho.erro.motivo)
  return { blocos: caminho.blocos, saidas: caminho.saidas }
}
