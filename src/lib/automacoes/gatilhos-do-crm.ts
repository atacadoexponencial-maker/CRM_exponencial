// Gatilhos que nascem em telas do CRM (B11-06): tag adicionada, etiqueta aplicada
// e dado do contato alterado. As actions que mudam esses dados chamam estas
// funções depois de gravar. As ações das automações gravam direto no banco e não
// passam por elas: é assim que automação não dispara automação.
//
// Nada aqui lança erro: a tag que a pessoa adicionou fica salva mesmo se as
// automações falharem.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 9.

import { calcularClassificacao } from "@/app/(auth)/contatos/classificacao"
import { createServiceClient } from "@/integrations/supabase/service"
import { normalizarTag } from "@/lib/fluxo-automacao"
import { processarAutomacoes } from "./index"

/** Campos que a tela do contato edita e que têm gatilho. A classificação vem dos cards (abaixo). */
const CAMPOS_EDITAVEIS = ["tipo", "nicho", "cidade"] as const
type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number]
type DadosDoContato = Partial<Record<CampoEditavel, string | null>>

type CardDoContato = { id?: string; funil: string; etapa: string }

const limpo = (valor: string | null | undefined) => (valor ?? "").trim()

/** Os campos que mudaram de fato, com o valor novo. Campo que não veio em `depois` não mudou. */
export function camposQueMudaram(antes: DadosDoContato, depois: DadosDoContato): Array<{ campo: CampoEditavel; valor: string }> {
  return CAMPOS_EDITAVEIS.filter((campo) => campo in depois && limpo(antes[campo]) !== limpo(depois[campo])).map(
    (campo) => ({ campo, valor: limpo(depois[campo]) })
  )
}

/**
 * Os cards do contato depois do movimento manual: o card movido na etapa nova e,
 * se ele chegou em Ganho no Funil de Entrada sem card na Recompra, o card de
 * Onboarding que o CRM cria (`moverCard`).
 */
export function cardsDepoisDoMovimento(cards: CardDoContato[], cardId: string, novaEtapa: string): CardDoContato[] {
  const movido = cards.find((c) => c.id === cardId)
  const depois = cards.map((c) => (c.id === cardId ? { ...c, etapa: novaEtapa } : c))
  const nasceRecompra =
    movido?.funil === "entrada" && novaEtapa === "ganho" && !cards.some((c) => c.funil === "recompra")
  return nasceRecompra ? [...depois, { funil: "recompra", etapa: "onboarding" }] : depois
}

export async function dispararTagAdicionada(workspaceId: string, contactId: string, tag: string): Promise<void> {
  await processarAutomacoes({ tipo: "tag_adicionada", workspaceId, contactId, tag: normalizarTag(tag) })
}

/** A action do chat só tem a conversa em mão: a empresa e o contato vêm dela. */
export async function dispararEtiquetaAplicada(conversationId: string, labelId: string): Promise<void> {
  try {
    const { data } = await createServiceClient()
      .from("conversations")
      .select("workspace_id, contact_id")
      .eq("id", conversationId)
      .maybeSingle()
    if (!data) return
    await processarAutomacoes({
      tipo: "etiqueta_aplicada",
      workspaceId: data.workspace_id,
      contactId: data.contact_id,
      conversationId,
      labelId,
    })
  } catch {
    // Automação nunca derruba a ação de quem aplicou a etiqueta
  }
}

/** Um evento por campo que mudou, na ordem tipo, nicho, cidade. */
export async function dispararDadosAlterados(
  workspaceId: string,
  contactId: string,
  antes: DadosDoContato,
  depois: DadosDoContato
): Promise<void> {
  for (const { campo, valor } of camposQueMudaram(antes, depois)) {
    await processarAutomacoes({ tipo: "dado_contato_alterado", workspaceId, contactId, campo, valor })
  }
}

/**
 * Para as actions do funil: lê os cards do contato ANTES de mexer neles e devolve
 * a função que, chamada no fim, dispara "classificação alterada" se a mudança
 * manual (`mudanca`) mudou a classificação. A classificação de depois é calculada
 * a partir dos cards de antes com a mudança aplicada, e não relida do banco: o que
 * as automações moverem no meio-tempo não conta.
 */
export async function prepararGatilhoDeClassificacao(
  workspaceId: string,
  contactId: string | null,
  mudanca: (cards: CardDoContato[]) => CardDoContato[]
): Promise<() => Promise<void>> {
  const nada = async () => {}
  if (!contactId) return nada
  try {
    const { data: cards, error } = await createServiceClient()
      .from("pipeline_cards")
      .select("id, funil, etapa")
      .eq("workspace_id", workspaceId)
      .eq("contact_id", contactId)
    if (error || !cards) return nada

    const antes = calcularClassificacao(cards)
    const depois = calcularClassificacao(mudanca(cards))
    if (antes === depois) return nada
    return () =>
      processarAutomacoes({ tipo: "dado_contato_alterado", workspaceId, contactId, campo: "classificacao", valor: depois })
  } catch {
    return nada
  }
}
