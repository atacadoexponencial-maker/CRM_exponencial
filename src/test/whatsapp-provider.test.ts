// Testes do seletor de provider e do provider Meta.
//
// Nada aqui toca banco ou rede: o cliente Supabase é um stub passado por
// parâmetro (o seletor recebe o cliente, não o constrói) e o `fetch` global é
// substituído. Ver a regra de banco em
// `pre-desenvolvimento/testes/plano-testes-B1.md`.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { resolverProvider } from "@/lib/whatsapp"
import type { ClienteSupabase } from "@/lib/whatsapp"
import { criarProviderMeta } from "@/lib/whatsapp/provider-meta"

const PHONE_NUMBER_ID = "1167696503100575"
const ACCESS_TOKEN = "token-de-teste"

type Conexao = { phone_number_id: string; access_token: string } | null

/**
 * Stub mínimo do cliente Supabase: imita a cadeia
 * `.from().select().eq().eq().limit().maybeSingle()` e devolve o que for
 * configurado. Segue o espírito do builder de `automacoes.test.ts`.
 *
 * O cast existe porque `resolverProvider` declara o cliente pelo tipo real do
 * supabase-js — um stub nunca satisfaz aquela superfície inteira, e descrever
 * a cadeia à mão no tipo do parâmetro foi justamente o que quebrou o build.
 */
function clienteComConexao(conexao: Conexao) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: conexao }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as ClienteSupabase
}

function respostaOk(corpo: unknown) {
  return { ok: true, status: 200, json: async () => corpo, text: async () => "" }
}

function respostaErro(status: number, corpo: string) {
  return { ok: false, status, json: async () => ({}), text: async () => corpo }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("resolverProvider", () => {
  it("devolve o provider Meta quando existe conexão conectada", async () => {
    const supabase = clienteComConexao({
      phone_number_id: PHONE_NUMBER_ID,
      access_token: ACCESS_TOKEN,
    })

    const provider = await resolverProvider(supabase, "workspace-1")

    expect(provider).not.toBeNull()
    expect(provider?.canal).toBe("meta")
  })

  it("devolve null quando o workspace não tem número conectado", async () => {
    const provider = await resolverProvider(clienteComConexao(null), "workspace-1")

    expect(provider).toBeNull()
  })
})

describe("provider Meta — enviarTexto", () => {
  it("devolve ok: true com mensagemId quando a Meta responde 200", async () => {
    fetchMock.mockResolvedValue(respostaOk({ messages: [{ id: "wamid.ABC" }] }))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
    const resultado = await provider.enviarTexto("5511999999999", "olá")

    expect(resultado).toEqual({ ok: true, mensagemId: "wamid.ABC" })
  })

  it("devolve ok: false com motivo quando a Meta responde erro", async () => {
    fetchMock.mockResolvedValue(respostaErro(401, '{"error":{"code":190}}'))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
    const resultado = await provider.enviarTexto("5511999999999", "olá")

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.motivo).toBe('Meta API error: 401 - {"error":{"code":190}}')
    }
  })

  it("devolve mensagemId null quando a resposta 200 não traz messages[0].id", async () => {
    fetchMock.mockResolvedValue(respostaOk({}))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
    const resultado = await provider.enviarTexto("5511999999999", "olá")

    expect(resultado).toEqual({ ok: true, mensagemId: null })
  })

  it("não engole exceção de rede — ela sobe para o chamador", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)

    await expect(provider.enviarTexto("5511999999999", "olá")).rejects.toThrow("fetch failed")
  })
})

describe("provider Meta — marcarComoLida", () => {
  it("monta POST com status read e o message_id recebido", async () => {
    fetchMock.mockResolvedValue(respostaOk({ success: true }))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
    await provider.marcarComoLida({ mensagemId: "wamid.XYZ", destino: "5511999998888" })

    const [, opcoes] = fetchMock.mock.calls[0]
    expect(JSON.parse(opcoes.body)).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.XYZ",
    })
  })

  it("devolve ok: false com motivo quando a Meta responde erro", async () => {
    fetchMock.mockResolvedValue(respostaErro(400, "erro"))

    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
    const resultado = await provider.marcarComoLida({ mensagemId: "wamid.XYZ", destino: "5511999998888" })

    expect(resultado.ok).toBe(false)
  })
})

describe("provider Meta — suporta", () => {
  it("responde para os três recursos", () => {
    const provider = criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)

    expect(provider.suporta("templates")).toBe(true)
    expect(provider.suporta("midia")).toBe(true)
    expect(provider.suporta("marcar_lida")).toBe(true)
  })
})
