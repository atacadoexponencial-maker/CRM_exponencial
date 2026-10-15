// Lista de mensagens de uma conversa na tela do chat (B26-01).
//
// A mensagem que o atendente envia aparece na hora com id provisório
// (`local-…`), e o aviso de entregue e de lida chega pelo id real da linha em
// `messages`. Sem trocar um pelo outro, o ✓ só virava ✓✓ depois de recarregar.

import type { Mensagem } from "./mock-mensagens"

type Status = NonNullable<Mensagem["status"]>

/** Aplica o status à mensagem de id `id`. `achou` falso: ela ainda não está na lista. */
export function aplicarStatus(
  lista: Mensagem[],
  id: string,
  status: Status
): { lista: Mensagem[]; achou: boolean } {
  if (!lista.some((m) => m.id === id)) return { lista, achou: false }
  return { lista: lista.map((m) => (m.id === id ? { ...m, status } : m)), achou: true }
}

/**
 * Troca o id provisório pelo da mensagem gravada. Se o aviso de status chegou
 * antes da troca (entregue muito rápido), ele vem em `statusGuardado`.
 */
export function confirmarEnvio(
  lista: Mensagem[],
  idProvisorio: string,
  idReal: string,
  statusGuardado?: Status
): Mensagem[] {
  return lista.map((m) =>
    m.id === idProvisorio ? { ...m, id: idReal, ...(statusGuardado ? { status: statusGuardado } : {}) } : m
  )
}
