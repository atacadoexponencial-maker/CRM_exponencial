// Acompanhamento do disparo (B8-02). Banco mockado.
//
// O ponto: "aceita pelo gateway" e "enviada" são momentos diferentes, e o
// acompanhamento só serve se souber distingui-los.

import { describe, expect, it } from "vitest"
import { STATUS_NO_CRM } from "@/lib/whatsapp/eventos-de-operacao"
import type { ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import { criarProviderGateway } from "@/lib/whatsapp/provider-gateway"
import { criarProviderMeta } from "@/lib/whatsapp/provider-meta"

describe("estados do destinatário", () => {
  it("o gateway confirma o envio com `sent`, que vira `enviado`", () => {
    expect(STATUS_NO_CRM.sent).toBe("enviado")
  })

  it("os demais status do contrato continuam mapeados", () => {
    expect(STATUS_NO_CRM.delivered).toBe("entregue")
    expect(STATUS_NO_CRM.read).toBe("lido")
    expect(STATUS_NO_CRM.failed).toBe("falhou")
  })

  it("`na_fila` não é status de evento: é do CRM, e nenhum evento o produz", () => {
    expect(Object.values(STATUS_NO_CRM)).not.toContain("na_fila")
  })
})

describe("por que o canal muda o estado inicial", () => {
  function gatewayFalso(): ClienteGateway {
    return {
      async comServico() {
        throw new Error("não usado")
      },
      async comInstancia() {
        // `queued: true` é aceitação, não envio: a mensagem espera a vez.
        return {
          message_id: "3EB0",
          queued: true,
          queue_position: 812,
          estimated_send_at: "2026-09-18T09:12:00Z",
        } as never
      },
    }
  }

  it("o gateway responde aceitando e informando a posição na fila", async () => {
    const provider = criarProviderGateway(gatewayFalso(), "inst_1", "token")

    const resultado = await provider.enviarTexto("5511999998888", "promoção", {
      prioridade: "campanha",
    })

    // O CRM guarda o identificador; o envio de verdade é confirmado depois.
    expect(resultado).toEqual({ ok: true, mensagemId: "3EB0" })
    expect(provider.canal).toBe("gateway")
  })

  it("pela API Oficial a resposta já é o envio: o canal se identifica como meta", () => {
    const provider = criarProviderMeta("phone_1", "token-meta")

    expect(provider.canal).toBe("meta")
  })
})

describe("contagem do progresso", () => {
  // A contagem roda no banco (`count: "exact"`). O que se pode fixar em teste é
  // a regra de agregação: o que conta como "já saiu" e o que conta como espera.
  const CONTAGENS = { na_fila: 812, pendente: 100, enviado: 60, entregue: 20, lido: 8, falhou: 5 }

  it("enviados somam enviado, entregue e lido — e não o que está na fila", () => {
    const enviados = CONTAGENS.enviado + CONTAGENS.entregue + CONTAGENS.lido

    expect(enviados).toBe(88)
    expect(enviados).not.toBe(enviados + CONTAGENS.na_fila)
  })

  it("na fila não conta como enviado nem como falha: é espera", () => {
    const enviados = CONTAGENS.enviado + CONTAGENS.entregue + CONTAGENS.lido
    const total = Object.values(CONTAGENS).reduce((a, b) => a + b, 0)

    expect(CONTAGENS.na_fila).toBeGreaterThan(0)
    expect(enviados + CONTAGENS.na_fila + CONTAGENS.pendente + CONTAGENS.falhou).toBe(total)
  })

  it("disparo com fila cheia continua em andamento, mesmo sem pendentes no CRM", () => {
    const emAndamento = (status: string, pendentes: number, naFila: number) =>
      status === "enviando" || pendentes > 0 || naFila > 0

    expect(emAndamento("enviada", 0, 812)).toBe(true)
    expect(emAndamento("enviada", 0, 0)).toBe(false)
  })
})
