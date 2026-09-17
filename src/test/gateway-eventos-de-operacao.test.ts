// Status de envio, estado da instância e freio (B6-04). Banco mockado.

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  aplicarEstadoDaInstancia,
  aplicarStatusDeMensagem,
  registrarFreio,
  STATUS_NO_CRM,
  TIPO_ALERTA_FREIO,
} from "@/lib/whatsapp/eventos-de-operacao"
import type { createServiceClient } from "@/integrations/supabase/service"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const CONEXAO = "22222222-2222-2222-2222-222222222222"

type Escrita = { tabela: string; operacao: string; linha: unknown; filtros: unknown[] }

/** Supabase falso que guarda o que foi escrito e com quais filtros. */
function supabaseFalso() {
  const escritas: Escrita[] = []

  function encadeavel(tabela: string, operacao: string, linha: unknown) {
    const filtros: unknown[] = []
    escritas.push({ tabela, operacao, linha, filtros })
    const obj: Record<string, unknown> = {}
    for (const metodo of ["eq", "is", "select", "maybeSingle"]) {
      obj[metodo] = vi.fn((...args: unknown[]) => {
        if (args.length > 0) filtros.push(args)
        return obj
      })
    }
    obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(resolve)
    return obj
  }

  const client = {
    from: vi.fn((tabela: string) => ({
      update: (linha: unknown) => encadeavel(tabela, "update", linha),
      upsert: (linha: unknown, opcoes?: unknown) => encadeavel(tabela, "upsert", { linha, opcoes }),
    })),
  }

  return { supabase: client as unknown as ReturnType<typeof createServiceClient>, escritas }
}

function escritaDe(escritas: Escrita[], tabela: string) {
  return escritas.find((e) => e.tabela === tabela)
}

describe("status de mensagem", () => {
  beforeEach(() => vi.clearAllMocks())

  it("usa os mesmos termos em português que a Meta produz hoje", () => {
    expect(STATUS_NO_CRM.delivered).toBe("entregue")
    expect(STATUS_NO_CRM.read).toBe("lido")
    expect(STATUS_NO_CRM.failed).toBe("falhou")
  })

  it("sent vira enviado, valor que campaign_recipients aceita", () => {
    expect(STATUS_NO_CRM.sent).toBe("enviado")
  })

  it("atualiza a mensagem e o destinatário da campanha pelo mesmo wamid", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarStatusDeMensagem({
      supabase,
      evento: { message_id: "3EB0", status: "delivered", error: null },
    })

    const mensagem = escritaDe(escritas, "messages")
    const campanha = escritaDe(escritas, "campaign_recipients")
    expect(mensagem?.linha).toEqual({ status: "entregue", status_error: null })
    expect(mensagem?.filtros).toEqual([["wamid", "3EB0"]])
    expect(campanha?.linha).toMatchObject({ status: "entregue" })
    expect((campanha?.linha as Record<string, unknown>).atualizado_em).toBeTruthy()
    expect(campanha?.filtros).toEqual([["wamid", "3EB0"]])
  })

  it("falha preserva o motivo legível para o atendente", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarStatusDeMensagem({
      supabase,
      evento: {
        message_id: "3EB0",
        status: "failed",
        error: { code: "recipient_not_on_whatsapp", message: "O destinatário não tem WhatsApp." },
      },
    })

    expect(escritaDe(escritas, "messages")?.linha).toEqual({
      status: "falhou",
      status_error: "O destinatário não tem WhatsApp.",
    })
  })

  it("falha sem mensagem legível cai no código do erro", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarStatusDeMensagem({
      supabase,
      evento: { message_id: "3EB0", status: "failed", error: { code: "media_too_large" } },
    })

    expect((escritaDe(escritas, "messages")?.linha as Record<string, unknown>).status_error).toBe(
      "media_too_large"
    )
  })

  it("status fora do mapa não escreve nada: viraria valor inválido no banco", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await aplicarStatusDeMensagem({
      supabase,
      evento: { message_id: "3EB0", status: "pendurado" },
    })

    expect(resultado).toEqual({ status: null })
    expect(escritas).toEqual([])
  })
})

describe("estado da instância", () => {
  beforeEach(() => vi.clearAllMocks())

  it("connected grava número e nome de exibição", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarEstadoDaInstancia({
      supabase,
      connectionId: CONEXAO,
      evento: {
        state: "connected",
        phone_number: "5511777776666",
        display_name: "Atacado Exemplo",
        reason: null,
      },
    })

    expect(escritaDe(escritas, "whatsapp_connections")?.linha).toEqual({
      status: "connected",
      state_reason: null,
      phone_number: "5511777776666",
      display_name: "Atacado Exemplo",
    })
  })

  it.each(["disconnected", "banned", "removed"])("%s muda o estado e registra o motivo", async (estado) => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarEstadoDaInstancia({
      supabase,
      connectionId: CONEXAO,
      evento: { state: estado, reason: "banned_by_whatsapp" },
    })

    expect(escritaDe(escritas, "whatsapp_connections")?.linha).toEqual({
      status: estado,
      state_reason: "banned_by_whatsapp",
    })
  })

  it("transição sem número não apaga o número já conhecido", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarEstadoDaInstancia({
      supabase,
      connectionId: CONEXAO,
      evento: { state: "disconnected", reason: "connection_lost" },
    })

    const linha = escritaDe(escritas, "whatsapp_connections")?.linha as Record<string, unknown>
    expect(linha).not.toHaveProperty("phone_number")
    expect(linha).not.toHaveProperty("display_name")
  })

  it("transição solicitada por nós limpa o motivo anterior", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarEstadoDaInstancia({
      supabase,
      connectionId: CONEXAO,
      evento: { state: "connecting" },
    })

    expect((escritaDe(escritas, "whatsapp_connections")?.linha as Record<string, unknown>).state_reason).toBeNull()
  })

  it("atualiza a conexão certa", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarEstadoDaInstancia({ supabase, connectionId: CONEXAO, evento: { state: "connected" } })

    expect(escritaDe(escritas, "whatsapp_connections")?.filtros).toEqual([["id", CONEXAO]])
  })
})

describe("freio", () => {
  beforeEach(() => vi.clearAllMocks())

  it("freio acionado abre alerta com motivo e quantidade parada", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await registrarFreio({
      supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      evento: { reason: "failure_rate", queued_count: 1840, released: false },
    })

    expect(resultado).toEqual({ acao: "aberto" })
    const escrita = escritaDe(escritas, "operational_alerts")
    expect(escrita?.operacao).toBe("upsert")
    expect((escrita?.linha as { linha: Record<string, unknown> }).linha).toEqual({
      workspace_id: WORKSPACE,
      connection_id: CONEXAO,
      tipo: TIPO_ALERTA_FREIO,
      motivo: "failure_rate",
      queued_count: 1840,
    })
  })

  it("liberação resolve o alerta aberto em vez de abrir outro", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await registrarFreio({
      supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      evento: { reason: "failure_rate", queued_count: 0, released: true },
    })

    expect(resultado).toEqual({ acao: "resolvido" })
    const escrita = escritaDe(escritas, "operational_alerts")
    expect(escrita?.operacao).toBe("update")
    expect((escrita?.linha as Record<string, unknown>).resolved_at).toBeTruthy()
    // Só o alerta ainda aberto daquela conexão é resolvido.
    expect(escrita?.filtros).toEqual([
      ["connection_id", CONEXAO],
      ["tipo", TIPO_ALERTA_FREIO],
      ["resolved_at", null],
    ])
  })

  it("o mesmo freio chegando duas vezes não duplica alerta", async () => {
    const { supabase, escritas } = supabaseFalso()

    await registrarFreio({
      supabase,
      workspaceId: WORKSPACE,
      connectionId: CONEXAO,
      evento: { reason: "manual" },
    })

    const escrita = escritaDe(escritas, "operational_alerts")
    expect((escrita?.linha as { opcoes: Record<string, unknown> }).opcoes).toEqual({
      onConflict: "connection_id,tipo",
      ignoreDuplicates: true,
    })
  })
})
