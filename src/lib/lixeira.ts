// B13-05: tirar um contato da lixeira. Única forma de restaurar — usada pelo
// "Restaurar" da lixeira, pela mensagem recebida (API Oficial e canal direto) e
// por "Novo lead"/"Novo contato" com o telefone de quem está na lixeira.
//
// Cards, conversas, mensagens e lembretes voltam sozinhos: as políticas de
// leitura só os escondiam porque o contato estava na lixeira. Sequências
// canceladas na exclusão continuam canceladas.
//
// Quem chama decide se pode (a checagem de permissão fica na action); aqui só se
// grava, com o cliente de serviço.

import type { createServiceClient } from "@/integrations/supabase/service"
import { transmitirContatoRestaurado } from "@/lib/whatsapp/realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Devolve `true` se o contato estava na lixeira e saiu dela agora; `false` se
 * já estava ativo (outra mensagem ou outra aba chegou antes). Lança se o banco
 * falhar.
 */
export async function tirarDaLixeira(
  svc: ServiceClient,
  workspaceId: string,
  contactId: string
): Promise<boolean> {
  const { data, error } = await svc
    .from("contacts")
    .update({ excluido_em: null, excluido_por: null })
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .not("excluido_em", "is", null)
    .select("id")
  if (error) throw new Error(`Não foi possível restaurar o contato: ${error.message}`)
  if (!data || data.length === 0) return false

  try {
    await transmitirContatoRestaurado(workspaceId, contactId)
  } catch {
    // Restaurado; a caixa de entrada dos outros mostra no próximo carregamento.
  }
  return true
}
