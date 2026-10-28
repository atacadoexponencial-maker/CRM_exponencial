// Conversa atualizada pelo tempo real na lista do chat (B47-02).
//
// Abrir uma conversa zera as não lidas, e o Realtime manda o UPDATE dela. A
// lista punha no topo toda conversa que recebia UPDATE, então ela pulava embaixo
// do mouse sem mensagem nova. Só a mudança do `last_message_at` sobe a conversa.

import { formatarHorarioDaLista } from "@/lib/datas"
import type { Conversa, StatusConversa } from "./mock-conversas"

export interface LinhaDaConversa {
  id: string
  last_message_text: string
  last_message_at: string | null
  unread_count: number
  status: string
}

export function aplicarAtualizacaoDaConversa(lista: Conversa[], linha: LinhaDaConversa): Conversa[] {
  const idx = lista.findIndex((c) => c.id === linha.id)
  if (idx === -1) return lista
  const atual = lista[idx]
  // Sem `last_message_at` no aviso, não há mensagem nova: fica a atividade de antes.
  const atividadeEm = linha.last_message_at ?? atual.atividadeEm
  const atualizada: Conversa = {
    ...atual,
    ultimaMensagem: {
      texto: linha.last_message_text,
      horario: atividadeEm ? formatarHorarioDaLista(atividadeEm) : atual.ultimaMensagem.horario,
    },
    naoLidas: linha.unread_count,
    status: linha.status as StatusConversa,
    atividadeEm,
  }
  if (atividadeEm === atual.atividadeEm) return lista.map((c, i) => (i === idx ? atualizada : c))
  return [atualizada, ...lista.filter((c) => c.id !== linha.id)]
}
