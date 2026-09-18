// Motivo da falha no relatório de entrega (B8-04).
//
// O critério que sustenta todos os outros: nenhum `error.code` do contrato pode
// chegar à tela. Código não diz ao operador o que fazer a seguir.

import { describe, expect, it } from "vitest"
import {
  MOTIVO_CAMPANHA_INTERROMPIDA,
  MOTIVO_SEM_NUMERO,
  MOTIVO_SEM_RESPOSTA,
  motivoDaFalha,
} from "@/lib/whatsapp/motivo-da-falha"

/** Os códigos que o contrato prevê para um destinatário de campanha. */
const CODIGOS = [
  "recipient_not_on_whatsapp",
  "instance_not_connected",
  "instance_banned",
  "instance_braked",
  "media_too_large",
  "media_type_unsupported",
  "invalid_payload",
]

describe("tradução dos códigos do contrato", () => {
  it("cada código vira uma frase em português, e nenhuma se repete", () => {
    const frases = CODIGOS.map((codigo) => motivoDaFalha({ codigo }))

    for (const frase of frases) {
      expect(frase).toMatch(/[áàâãéêíóôõúç ]/i)
      expect(frase).not.toMatch(/^[a-z_]+$/)
    }
    // Motivos distintos: se dois códigos dessem a mesma frase, o operador não
    // saberia distinguir problema do destinatário de problema do número dele.
    expect(new Set(frases).size).toBe(frases.length)
  })

  it("número sem WhatsApp, número freado e arquivo grande são motivos distintos", () => {
    const semWhats = motivoDaFalha({ codigo: "recipient_not_on_whatsapp" })
    const freado = motivoDaFalha({ codigo: "instance_braked" })
    const arquivo = motivoDaFalha({ codigo: "media_too_large" })

    expect(semWhats).toMatch(/não tem WhatsApp/i)
    expect(freado).toMatch(/interrompidos/i)
    expect(arquivo).toMatch(/tamanho/i)
  })

  it("erro nosso é dito como erro nosso, sem culpar o número do cliente", () => {
    const tecnico = motivoDaFalha({ codigo: "invalid_payload" })

    expect(tecnico).toMatch(/técnica/i)
    expect(tecnico).not.toMatch(/número não tem/i)
  })
})

describe("quando o código não é conhecido", () => {
  it("usa a mensagem legível que o gateway manda", () => {
    const motivo = motivoDaFalha({
      codigo: "codigo_que_nao_existe_ainda",
      mensagem: "O arquivo tem 120 MB e o limite é 100 MB.",
    })

    expect(motivo).toBe("O arquivo tem 120 MB e o limite é 100 MB.")
  })

  it("nunca deixa um código cru virar texto de tela", () => {
    const motivo = motivoDaFalha({
      codigo: "codigo_novo",
      mensagem: "instance_not_connected",
    })

    expect(motivo).not.toBe("instance_not_connected")
    expect(motivo).toMatch(/Não foi possível enviar/)
  })

  it("sem código e sem mensagem, uma frase honesta", () => {
    expect(motivoDaFalha({})).toMatch(/sem explicar o motivo/)
  })
})

describe("motivos que o CRM produz sozinho", () => {
  it("canal que não respondeu é diferente de recusa", () => {
    expect(MOTIVO_SEM_RESPOSTA).toMatch(/não chegou a ser aceita/)
    expect(MOTIVO_SEM_RESPOSTA).not.toBe(motivoDaFalha({}))
  })

  it("não enviada por interrupção não é falha do número", () => {
    expect(MOTIVO_CAMPANHA_INTERROMPIDA).toMatch(/interrompido/)
    expect(MOTIVO_CAMPANHA_INTERROMPIDA).not.toMatch(/número/)
  })

  it("campanha sem número disponível diz isso, em vez de um falhou mudo", () => {
    expect(MOTIVO_SEM_NUMERO).toMatch(/Nenhum número de envio/)
  })
})

describe("o que NÃO é falha", () => {
  it("mensagem adiada por horário não tem motivo de falha: ela fica na fila", () => {
    // `deferred` é estado de fila, não evento de status: nunca chega aqui.
    // Este teste existe para fixar a regra contra uma tradução futura.
    expect(motivoDaFalha({ codigo: "deferred" })).not.toMatch(/adiada|horário/i)
  })
})
