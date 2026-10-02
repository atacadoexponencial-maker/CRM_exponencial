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

import { createServiceClient } from "@/integrations/supabase/service"
import { transmitirContatoRestaurado } from "@/lib/whatsapp/realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

/** B13-04: prazo da lixeira; depois disso a limpeza diária apaga de vez (B13-06). */
export const PRAZO_LIXEIRA_DIAS = 30

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

const PREFIXO_PUBLICO = "/storage/v1/object/public/chat-attachments/"

/** Caminhos no bucket dos arquivos de mídia das conversas do contato. */
export async function arquivosDoContato(
  svc: ServiceClient,
  workspaceId: string,
  contactId: string
): Promise<string[]> {
  const { data: conversas } = await svc.from("conversations").select("id").eq("contact_id", contactId)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length === 0) return []
  const { data: mensagens } = await svc
    .from("messages")
    .select("content")
    .in("conversation_id", ids)
    .neq("type", "texto")
  const caminhos: string[] = []
  for (const m of mensagens ?? []) {
    const conteudo = m.content ?? ""
    const i = conteudo.indexOf(PREFIXO_PUBLICO)
    if (i < 0) continue
    const caminho = decodeURIComponent(conteudo.slice(i + PREFIXO_PUBLICO.length).split("?")[0])
    // Só arquivos da própria empresa, e nunca os de campanha (não são do contato).
    if (caminho.startsWith(`${workspaceId}/`) && !caminho.startsWith(`${workspaceId}/campanhas/`)) {
      caminhos.push(caminho)
    }
  }
  return caminhos
}

/**
 * Apaga de vez um contato que está na lixeira: arquivos primeiro (depois de apagar
 * as mensagens não há mais como achá-los), depois os dados, numa transação.
 * Devolve `false` se ele já não estava na lixeira (foi restaurado no meio-tempo).
 */
export async function apagarDaLixeira(svc: ServiceClient, workspaceId: string, contactId: string): Promise<boolean> {
  const caminhos = await arquivosDoContato(svc, workspaceId, contactId)
  if (caminhos.length > 0) {
    // Falha aqui deixa arquivo órfão, nunca dado — segue para apagar os dados.
    await svc.storage.from("chat-attachments").remove(caminhos).catch(() => {})
  }
  const { data, error } = await svc.rpc("apagar_contato_de_vez", { p_contact_id: contactId })
  if (error) throw new Error(`Não foi possível apagar o contato: ${error.message}`)
  return data === true
}

const LOTE_LIMPEZA = 200

/**
 * B13-06: a limpeza diária. Apaga de vez o que está na lixeira há mais de
 * PRAZO_LIXEIRA_DIAS. Idempotente — rodar duas vezes ou pular um dia não muda o
 * resultado; o que não couber no lote fica para a rodada seguinte.
 */
export async function esvaziarLixeiraVencida(): Promise<{ apagados: number; falhas: number }> {
  const svc = createServiceClient()
  const limite = new Date(Date.now() - PRAZO_LIXEIRA_DIAS * 86_400_000).toISOString()
  const { data: vencidos } = await svc
    .from("contacts")
    .select("id, workspace_id")
    .not("excluido_em", "is", null)
    .lt("excluido_em", limite)
    .order("excluido_em")
    .limit(LOTE_LIMPEZA)

  let apagados = 0
  let falhas = 0
  for (const c of vencidos ?? []) {
    try {
      if (await apagarDaLixeira(svc, c.workspace_id, c.id)) apagados++
    } catch {
      falhas++
    }
  }
  return { apagados, falhas }
}
