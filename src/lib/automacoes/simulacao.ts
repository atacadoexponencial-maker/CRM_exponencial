// "Testar com um contato" (B11-10): o caminho que o contato faria, com os dados
// reais dele, sem executar nada. As verificações são as mesmas do motor; as
// ações são desligadas e contam como feitas, para o caminho seguir.

import { gatilhoDoFluxo, percorrerFluxo, type Fluxo, type ResultadoSimulacao } from "@/lib/fluxo-automacao"
import type { GatilhoAutomacao, ServiceClient } from "./contexto"
import { verificacaoVale } from "./verificacoes"

/**
 * O evento que o gatilho do fluxo geraria para o contato. No "card movido", o
 * card do contato entra na etapa do gatilho (ou fica onde está, com "qualquer
 * etapa"). Na "conversa criada", vale a conversa mais recente dele. `null` para
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
      const { data: conversa, error } = await supabase
        .from("conversations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      // Sem conversa, as verificações sobre a conversa não valem, como no motor
      return { tipo: "conversa_criada", workspaceId, contactId, conversationId: conversa?.id ?? "" }
    }
    default:
      return null
  }
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
