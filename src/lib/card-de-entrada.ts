// B45-01: todo contato nasce com card na primeira etapa do Funil de Entrada.
// Quem cria o contato (Novo contato, mensagem pela API Oficial ou canal direto,
// pedido da loja) chama aqui logo depois. O "Novo lead" do funil não passa por
// aqui: ele já cria o card que escolheu.

import type { createServiceClient } from "@/integrations/supabase/service"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { prepararGatilhoDeClassificacao } from "@/lib/automacoes/gatilhos-do-crm"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Cria o card do contato na Entrada, etapa Lead, sem atendente (contato novo não
 * tem dono). Conta como entrada na etapa, como o "Novo lead" (PER-B45-08).
 * Devolve `false` se o card não foi gravado. Nunca lança: o card nunca derruba
 * a mensagem ou o pedido que criou o contato.
 */
export async function criarCardDeEntrada(svc: ServiceClient, workspaceId: string, contactId: string): Promise<boolean> {
  try {
    const dispararClassificacao = await prepararGatilhoDeClassificacao(workspaceId, contactId, (cards) => [
      ...cards,
      { funil: "entrada", etapa: "lead" },
    ])

    const { data: novo, error } = await svc
      .from("pipeline_cards")
      .insert({ workspace_id: workspaceId, contact_id: contactId, funil: "entrada", etapa: "lead" })
      .select("id")
      .single()
    // B22-26: o índice único segura quem chegou junto; o card já existe
    if (error?.code === "23505") return true
    if (error || !novo) return false

    await dispararAutomacoes({ tipo: "card_movido", workspaceId, contactId, cardId: novo.id, funil: "entrada", etapa: "lead" })
    await dispararClassificacao()
    return true
  } catch {
    return false
  }
}
