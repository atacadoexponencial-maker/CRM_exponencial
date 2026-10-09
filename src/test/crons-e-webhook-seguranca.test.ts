// B21-06 — crons e webhook da Meta fechados sem segredo (auditoria de 06/10/2026,
// rodada 3). Sem rede: os motores e o banco são espiões.

import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createHmac } from "node:crypto"

vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn().mockResolvedValue(0) }))
vi.mock("@/lib/sequencias", () => ({ processarSequenciasPendentes: vi.fn().mockResolvedValue(0) }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { processarCampanhasPendentes } from "@/lib/campanhas"
import { processarSequenciasPendentes } from "@/lib/sequencias"
import { createServiceClient } from "@/integrations/supabase/service"
import { GET as cronCampanhas } from "@/app/api/cron/campanhas/route"
import { GET as cronSequencias } from "@/app/api/cron/sequencias/route"
import { POST as webhookMeta } from "@/app/api/webhooks/whatsapp/route"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

const chamarCron = (rota: string, autorizacao?: string) =>
  new NextRequest(`http://localhost/api/cron/${rota}`, { headers: autorizacao ? { authorization: autorizacao } : {} })

const crons = [
  { nome: "campanhas", rota: cronCampanhas, motor: processarCampanhasPendentes },
  { nome: "sequências", rota: cronSequencias, motor: processarSequenciasPendentes },
]

describe("B21-06 — Crons e webhook da Meta fechados sem segredo", () => {
  for (const { nome, rota, motor } of crons) {
    it(`should rodar o cron de ${nome} com o segredo certo`, async () => {
      vi.stubEnv("CRON_SECRET", "segredo-do-cron")
      const resposta = await rota(chamarCron("x", "Bearer segredo-do-cron"))
      expect(resposta.status).toBe(200)
      expect(motor).toHaveBeenCalledTimes(1)
    })

    it(`should recusar o cron de ${nome} sem segredo ou com segredo errado`, async () => {
      vi.stubEnv("CRON_SECRET", "segredo-do-cron")
      expect((await rota(chamarCron("x"))).status).toBe(401)
      expect((await rota(chamarCron("x", "Bearer outro"))).status).toBe(401)
      expect(motor).not.toHaveBeenCalled()
    })

    it(`should recusar o cron de ${nome} quando o segredo está vazio no servidor`, async () => {
      vi.stubEnv("CRON_SECRET", "")
      expect((await rota(chamarCron("x"))).status).toBe(401)
      expect((await rota(chamarCron("x", "Bearer "))).status).toBe(401)
      expect(motor).not.toHaveBeenCalled()
    })
  }

  const eventoFalso = JSON.stringify({ object: "whatsapp_business_account", entry: [] })
  const chamarWebhook = (assinatura?: string) =>
    new NextRequest("http://localhost/api/webhooks/whatsapp", {
      method: "POST",
      body: eventoFalso,
      headers: assinatura ? { "x-hub-signature-256": assinatura } : {},
    })

  it("should recusar evento no webhook da Meta quando o segredo do app está vazio no servidor", async () => {
    vi.stubEnv("META_APP_SECRET", "")
    expect((await webhookMeta(chamarWebhook())).status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it("should recusar evento sem assinatura ou com assinatura falsa", async () => {
    vi.stubEnv("META_APP_SECRET", "segredo-da-meta")
    expect((await webhookMeta(chamarWebhook())).status).toBe(401)
    expect((await webhookMeta(chamarWebhook("sha256=" + "0".repeat(64)))).status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it("should aceitar evento assinado com o segredo do app", async () => {
    vi.stubEnv("META_APP_SECRET", "segredo-da-meta")
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    const assinatura = "sha256=" + createHmac("sha256", "segredo-da-meta").update(eventoFalso).digest("hex")
    expect((await webhookMeta(chamarWebhook(assinatura))).status).toBe(200)
  })
})
