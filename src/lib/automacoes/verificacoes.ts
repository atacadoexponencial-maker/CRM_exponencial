// Verificações do bloco de condição que o motor já sabe avaliar (B11-02): canal,
// etiqueta e atendente da conversa, e etapa do card do contato. As outras do
// editor (texto e tipo da mensagem, tag, classificação, tipo do contato,
// horário) entram nas próximas issues; até lá, não valem.
//
// Cada verificação consulta o banco na hora, para enxergar o que uma ação
// anterior do mesmo caminho acabou de mudar. Sem conversa, as verificações
// sobre a conversa não valem, inclusive "não tem a etiqueta": sem conversa, não
// há o que afirmar. Erro de banco sobe e encerra a regra.

import type { Verificacao } from "@/lib/fluxo-automacao"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"

/** Opção do editor ("Canal da conversa é …") → `whatsapp_connections.canal`. */
const CANAL_DA_OPCAO: Record<string, string> = {
  oficial: "meta",
  direto: "gateway",
}

const PREFIXO_NUMERO = "numero:"

export async function verificacaoVale(contexto: ContextoDaExecucao, verificacao: Verificacao): Promise<boolean> {
  switch (verificacao.tipo) {
    case "canal":
      return canalVale(contexto, verificacao)
    case "etiqueta_conversa":
      return etiquetaVale(contexto, verificacao)
    case "atendente":
      return atendenteVale(contexto, verificacao)
    case "card_etapa":
      return cardEtapaVale(contexto, verificacao)
    default:
      return false
  }
}

/**
 * O canal é o do número gravado na conversa, sem cair no número do workspace
 * como o envio faz: a condição pergunta pela conversa, e conversa sem número
 * não tem canal a afirmar.
 */
async function canalVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "e") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversations")
    .select("whatsapp_connection_id, conexao:whatsapp_connections(canal)")
    .eq("id", conversaId)
    .maybeSingle()
  if (error) throw error

  const conexaoId = data?.whatsapp_connection_id
  if (!conexaoId) return false
  if (valor.startsWith(PREFIXO_NUMERO)) return conexaoId === valor.slice(PREFIXO_NUMERO.length)

  // Muitos-para-um: o PostgREST devolve um objeto, mas a inferência do select vê uma lista.
  const canal = (data.conexao as unknown as { canal: string | null } | null)?.canal
  return canal != null && CANAL_DA_OPCAO[valor] === canal
}

async function etiquetaVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "tem" && operador !== "nao_tem") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversation_labels")
    .select("label_id")
    .eq("conversation_id", conversaId)
    .eq("label_id", valor)
    .maybeSingle()
  if (error) throw error

  const tem = data != null
  return operador === "tem" ? tem : !tem
}

async function atendenteVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "sem_atendente" && operador !== "e") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversations")
    .select("assigned_to")
    .eq("id", conversaId)
    .maybeSingle()
  if (error) throw error
  if (!data) return false

  return operador === "sem_atendente" ? data.assigned_to == null : data.assigned_to === valor
}

/** Valor no formato `funil:etapa`, o mesmo que o editor grava. */
async function cardEtapaVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "esta_em") return false
  const { gatilho, supabase } = contexto
  if (!gatilho.contactId) return false
  const [funil, etapa] = valor.split(":")
  if (!funil || !etapa) return false

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select("etapa")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("contact_id", gatilho.contactId)
    .eq("funil", funil)
    .maybeSingle()
  if (error) throw error

  return data?.etapa === etapa
}
