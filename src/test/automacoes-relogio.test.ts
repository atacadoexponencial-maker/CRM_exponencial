// @vitest-environment node
// B28-02 — rota do relógio das automações: só segue as esperas com a assinatura do
// gateway (PER-B28-09). Quem segue as esperas é falso.

import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/automacoes/esperas", () => ({ seguirEsperasVencidas: vi.fn().mockResolvedValue(2) }))

import { POST } from "@/app/api/automacoes/relogio/route"
import { seguirEsperasVencidas } from "@/lib/automacoes/esperas"

const SEGREDO = "segredo-do-gateway"
const corpo = JSON.stringify({ em: "2026-10-25T12:00:00Z" })
const assinar = (texto: string, segredo: string) => "sha256=" + createHmac("sha256", segredo).update(texto).digest("hex")

function chamar(assinatura?: string) {
  const headers = new Headers({ "content-type": "application/json" })
  if (assinatura) headers.set("x-gateway-signature-256", assinatura)
  return POST(new NextRequest("https://crm.test/api/automacoes/relogio", { method: "POST", body: corpo, headers }))
}

describe("B28-02 — relógio das automações", () => {
  const original = process.env.GATEWAY_WEBHOOK_SECRET
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GATEWAY_WEBHOOK_SECRET = SEGREDO
  })
  afterEach(() => {
    process.env.GATEWAY_WEBHOOK_SECRET = original
  })

  it("CA-B28-24: sem assinatura, com a de outro segredo ou sem o segredo configurado, responde não autorizado e nada segue", async () => {
    const semAssinatura = await chamar()
    expect(semAssinatura.status).toBe(401)
    expect(await semAssinatura.json()).toEqual({ error: "não autorizado" })

    expect((await chamar(assinar(corpo, "outro-segredo"))).status).toBe(401)

    delete process.env.GATEWAY_WEBHOOK_SECRET
    expect((await chamar(assinar(corpo, SEGREDO))).status).toBe(401)

    expect(seguirEsperasVencidas).not.toHaveBeenCalled()
  })

  it("com a assinatura certa, segue as esperas vencidas", async () => {
    const resposta = await chamar(assinar(corpo, SEGREDO))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ status: "ok", seguidas: 2 })
    expect(seguirEsperasVencidas).toHaveBeenCalledTimes(1)
  })
})
