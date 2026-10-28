// B48-02: abrir uma conversa não muda a ordem da lista do chat; só mensagem nova
// sobe a conversa para o topo.

import { describe, it, expect } from "vitest"
import { aplicarAtualizacaoDaConversa } from "@/app/(auth)/chat/conversa-atualizada"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import { FUSO_DA_OPERACAO } from "@/lib/datas"

function conversa(id: string, atividadeEm: string, naoLidas = 0): Conversa {
  return {
    id,
    contato: { nome: `Contato ${id}`, telefone: "5500000000100", contactId: null },
    ultimaMensagem: { texto: `Oi de ${id}`, horario: "10:00" },
    naoLidas,
    status: "em_atendimento",
    etiquetas: [],
    atribuidaA: null,
    dataPrimeiroContato: "2026-10-01",
    canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
    atividadeEm,
  }
}

const A = conversa("A", "2026-10-27T18:00:00.000Z")
const B = conversa("B", "2026-10-27T17:00:00.000Z")
const C = conversa("C", "2026-10-27T16:00:00.000Z", 3)

describe("B48-02: lista do chat ao receber atualização da conversa", () => {
  it("CA-B48-04: abrir a conversa (só zera as não lidas) não muda a ordem", () => {
    const lista = aplicarAtualizacaoDaConversa([A, B, C], {
      id: "C",
      last_message_text: "Oi de C",
      last_message_at: "2026-10-27T16:00:00.000Z",
      unread_count: 0,
      status: "em_atendimento",
    }, FUSO_DA_OPERACAO)
    expect(lista.map((c) => c.id)).toEqual(["A", "B", "C"])
    expect(lista[2].naoLidas).toBe(0)
  })

  it("CA-B48-04: aviso sem last_message_at também atualiza no lugar", () => {
    const lista = aplicarAtualizacaoDaConversa([A, B, C], {
      id: "C",
      last_message_text: "Oi de C",
      last_message_at: null,
      unread_count: 0,
      status: "resolvida",
    }, FUSO_DA_OPERACAO)
    expect(lista.map((c) => c.id)).toEqual(["A", "B", "C"])
    expect(lista[2].status).toBe("resolvida")
  })

  it("CA-B48-05: mensagem nova sobe a conversa para o topo", () => {
    const lista = aplicarAtualizacaoDaConversa([A, B, C], {
      id: "C",
      last_message_text: "Mensagem nova",
      last_message_at: "2026-10-27T19:00:00.000Z",
      unread_count: 4,
      status: "em_atendimento",
    }, FUSO_DA_OPERACAO)
    expect(lista.map((c) => c.id)).toEqual(["C", "A", "B"])
    expect(lista[0].ultimaMensagem.texto).toBe("Mensagem nova")
    expect(lista[0].atividadeEm).toBe("2026-10-27T19:00:00.000Z")
    expect(lista[0].naoLidas).toBe(4)
  })

  it("conversa fora da lista não muda nada", () => {
    const antes = [A, B]
    expect(aplicarAtualizacaoDaConversa(antes, { id: "Z", last_message_text: "x", last_message_at: "2026-10-27T20:00:00.000Z", unread_count: 1, status: "em_atendimento" }, FUSO_DA_OPERACAO)).toBe(antes)
  })
})
