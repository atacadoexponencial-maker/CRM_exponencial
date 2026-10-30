// B53-16 — mensagem enviada por automação aparece na conversa aberta sem recarregar.
// O envio de verdade (`whatsapp-envio.ts`) roda sobre o banco falso; o WhatsApp e o
// tempo real são simulados.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(),
  resolverProviderDoContato: vi.fn(),
}))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))

import { resolverProviderDaConversa } from "@/lib/whatsapp"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { enviarWhatsAppComMotivo } from "@/lib/whatsapp-envio"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { banco } from "./automacoes-banco-falso"

const gatilho: GatilhoAutomacao = {
  tipo: "mensagem_recebida",
  workspaceId: "ws-1",
  contactId: "contato-1",
  conversationId: "conv-1",
  messageId: "msg-1",
  tipoMensagem: "texto",
  texto: "teste espera",
}

beforeEach(() => {
  vi.clearAllMocks()
  const provider = {
    canal: "meta",
    enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-1" }),
    enviarMidia: vi.fn(),
    suporta: vi.fn(() => true),
  }
  vi.mocked(resolverProviderDaConversa).mockResolvedValue(provider as unknown as Awaited<ReturnType<typeof resolverProviderDaConversa>>)
})

describe("B53-16 — mensagem da automação em tempo real", () => {
  it("CA-B53-32: a mensagem gravada vai à conversa aberta, com o mesmo id", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })
    const { supabase } = b.contexto(gatilho)

    expect(await enviarWhatsAppComMotivo(supabase, "ws-1", "contato-1", { tipo: "texto", texto: "Segunda" }, "conv-1")).toEqual({ ok: true })

    const gravada = b.gravacoes("messages")[0].args[0] as { id: string }
    expect(gravada.id).toEqual(expect.any(String))
    expect(transmitirMensagem).toHaveBeenCalledTimes(1)
    expect(transmitirMensagem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: gravada.id,
        conversation_id: "conv-1",
        workspace_id: "ws-1",
        direction: "enviada",
        type: "texto",
        content: "Segunda",
      })
    )
  })

  it("CA-B53-32: falha no tempo real não desfaz o envio", async () => {
    vi.mocked(transmitirMensagem).mockRejectedValueOnce(new Error("sem rede"))
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })

    expect(await enviarWhatsAppComMotivo(b.contexto(gatilho).supabase, "ws-1", "contato-1", { tipo: "texto", texto: "Oi" }, "conv-1")).toEqual({ ok: true })
    expect(b.gravacoes("messages")).toHaveLength(1)
  })

  it("CA-B53-32: mensagem que não foi gravada não é transmitida", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } }, messages: { erro: { message: "falhou" } } })

    await enviarWhatsAppComMotivo(b.contexto(gatilho).supabase, "ws-1", "contato-1", { tipo: "texto", texto: "Oi" }, "conv-1")
    expect(transmitirMensagem).not.toHaveBeenCalled()
  })
})
