// Auditoria run-2, pista 7 (06/11/2026): o contato que nasce de um pedido da loja
// pública (`contacts.origem = 'loja'`) tem o telefone que quem pediu digitou, sem
// conferência. O número da empresa só escreve para ele, por automação ou campanha,
// depois que ele escrever para a empresa.
//
// **Só backend.**

import type { createServiceClient } from "@/integrations/supabase/service"
import { formasDoNumero } from "@/lib/formas-do-numero"

type ServiceClient = ReturnType<typeof createServiceClient>

/** O motivo que a automação (histórico) e a campanha (relatório) mostram. */
export const MOTIVO_CONTATO_DA_LOJA =
  "O contato veio de um pedido da loja e ainda não escreveu para a empresa: a mensagem não sai"

/**
 * Se esse telefone já mandou alguma mensagem para a empresa, em qualquer conversa.
 * Olha as duas formas do número (com e sem o nono dígito): a loja grava como a cliente
 * digitou, e a Meta costuma entregar sem o nove, num contato à parte.
 */
export async function telefoneJaEscreveu(supabase: ServiceClient, workspaceId: string, telefone: string): Promise<boolean> {
  const { data: contatos, error: erroContatos } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("phone_number", formasDoNumero(telefone))
  if (erroContatos) throw erroContatos
  if (!contatos?.length) return false
  const { data: conversas, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("contact_id", contatos.map((c) => c.id))
  if (error) throw error
  if (!conversas?.length) return false
  const { data: recebida, error: erroMensagem } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("conversation_id", conversas.map((c) => c.id))
    .eq("direction", "recebida")
    .limit(1)
    .maybeSingle()
  if (erroMensagem) throw erroMensagem
  return Boolean(recebida)
}

/** O contato veio da loja e ainda não escreveu: nada sai para ele. */
export async function contatoDaLojaQueNaoEscreveu(supabase: ServiceClient, workspaceId: string, contactId: string): Promise<boolean> {
  const { data: contato, error } = await supabase
    .from("contacts")
    .select("origem, phone_number")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (error) throw error
  if (contato?.origem !== "loja") return false
  return !(await telefoneJaEscreveu(supabase, workspaceId, contato.phone_number))
}
