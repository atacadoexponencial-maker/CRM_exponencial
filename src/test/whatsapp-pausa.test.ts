// Situação de um número desconectado (B9-03): pausa, queda, e o aviso de 10 dias.

import { describe, expect, it } from "vitest"
import {
  DIAS_PARA_AVISO,
  situacaoDaPausa,
  textoDePausaLonga,
} from "@/lib/whatsapp/gateway/pausa"

const AGORA = new Date("2026-09-29T15:00:00.000Z")
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

describe("pausa a pedido", () => {
  it("mostra desde quando, contando dias inteiros", () => {
    expect(situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: diasAtras(0) }, AGORA))
      .toMatchObject({ tipo: "pausa", desdeQuando: "Desconectado hoje", pausaLonga: false })
    expect(situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: diasAtras(1) }, AGORA).desdeQuando)
      .toBe("Desconectado há 1 dia")
    expect(situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: diasAtras(3) }, AGORA).desdeQuando)
      .toBe("Desconectado há 3 dias")
  })

  it("avisa a partir de 10 dias, e o texto diz há quantos dias e o prazo do WhatsApp", () => {
    const antes = situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: diasAtras(DIAS_PARA_AVISO - 1) }, AGORA)
    const noLimite = situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: diasAtras(DIAS_PARA_AVISO) }, AGORA)

    expect(antes.pausaLonga).toBe(false)
    expect(noLimite.pausaLonga).toBe(true)
    expect(textoDePausaLonga(11)).toMatch(/há 11 dias/)
    expect(textoDePausaLonga(11)).toMatch(/14 dias/)
    expect(textoDePausaLonga(11)).toMatch(/Reconecte/)
  })

  it("pausa anterior à coluna (sem data) mostra só o estado, sem inventar dias", () => {
    expect(situacaoDaPausa({ status: "disconnected", stateReason: null, disconnectedAt: null }, AGORA))
      .toEqual({ tipo: null, desdeQuando: null, dias: 0, pausaLonga: false })
  })
})

describe("não é pausa", () => {
  it("queda de conexão é 'tentando voltar', mesmo com data", () => {
    const s = situacaoDaPausa({ status: "disconnected", stateReason: "connection_lost", disconnectedAt: diasAtras(12) }, AGORA)
    expect(s).toMatchObject({ tipo: "queda", desdeQuando: null, pausaLonga: false })
  })

  it("sessão encerrada e conectado não entram aqui", () => {
    expect(situacaoDaPausa({ status: "disconnected", stateReason: "session_closed_on_device", disconnectedAt: diasAtras(12) }, AGORA).tipo).toBeNull()
    expect(situacaoDaPausa({ status: "connected", stateReason: null, disconnectedAt: diasAtras(12) }, AGORA).tipo).toBeNull()
  })
})
