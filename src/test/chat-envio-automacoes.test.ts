// O envio pelo chat disparando "mensagem enviada pelo time" (B11-05): depois de
// a mensagem sair e ser gravada, e só nessa hora. E o envio das automações e das
// sequências, que nunca chama o motor. Banco, WhatsApp e motor simulados: nada
// toca o Supabase nem o gateway.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(),
  resolverProviderDoContato: vi.fn(),
}))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  dispararEtiquetaAplicada: vi.fn().mockResolvedValue(undefined),
  dispararMensagemEnviadaPeloTime: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { resolverProviderDaConversa, resolverProviderDoContato } from "@/lib/whatsapp"
import { dispararMensagemEnviadaPeloTime } from "@/lib/automacoes/gatilhos-do-crm"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { enviarDocumento, enviarImagem, enviarMensagem } from "@/app/(auth)/chat/actions"
import { enviarTextoWhatsAppComMotivo } from "@/lib/whatsapp-envio"

const disparo = vi.mocked(dispararMensagemEnviadaPeloTime)

type Resposta = { data: unknown; error: unknown }

/**
 * Cliente falso: `single`/`maybeSingle` devolvem a resposta da tabela, e o
 * `await` direto devolve sucesso vazio. Cada gravação fica registrada na ordem,
 * para conferir que o disparo vem depois do `insert` da mensagem.
 */
function clienteFalso(respostas: Record<string, Resposta>, gravacoes: string[]) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "order", "limit"]) obj[m] = vi.fn(() => obj)
      for (const m of ["insert", "update"]) {
        obj[m] = vi.fn(() => {
          gravacoes.push(`${m} ${tabela}`)
          return obj
        })
      }
      const resposta = respostas[tabela] ?? { data: null, error: null }
      obj.single = vi.fn(() => Promise.resolve(resposta))
      obj.maybeSingle = vi.fn(() => Promise.resolve(resposta))
      obj.then = (r: (v: Resposta) => void) => Promise.resolve({ data: null, error: null }).then(r)
      return obj
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://storage.exemplo/arquivo" } })),
      })),
    },
  }
}

const CONVERSA = {
  workspace_id: "ws-1",
  contact_id: "contato-1",
  contact: { phone_number: "5511999998888" },
  conexao: { status: "connected" },
}

let gravacoes: string[]
let provider: { enviarTexto: ReturnType<typeof vi.fn>; enviarMidia: ReturnType<typeof vi.fn> }

function prepararChat({ mensagemGravada = true } = {}) {
  gravacoes = []
  const cliente = clienteFalso(
    {
      conversations: { data: CONVERSA, error: null },
      messages: mensagemGravada ? { data: { id: "msg-1" }, error: null } : { data: null, error: { message: "falhou" } },
    },
    gravacoes
  )
  vi.mocked(createClient).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(createServiceClient).mockReturnValue(cliente as unknown as ReturnType<typeof createServiceClient>)
  provider = {
    enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-1" }),
    enviarMidia: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-2" }),
  }
  vi.mocked(resolverProviderDaConversa).mockResolvedValue(
    provider as unknown as Awaited<ReturnType<typeof resolverProviderDaConversa>>
  )
}

function arquivo(nome: string, tipo: string) {
  const dados = new FormData()
  dados.set("arquivo", new File([new Uint8Array(8)], nome, { type: tipo }))
  return dados
}

describe("B11-05 — envio pelo chat dispara 'mensagem enviada pelo time'", () => {
  beforeEach(() => vi.clearAllMocks())

  it("texto: dispara depois de gravar, com o texto, a conversa e o contato", async () => {
    prepararChat()
    let gravouAntes = false
    disparo.mockImplementationOnce(async () => {
      gravouAntes = gravacoes.includes("insert messages")
    })

    expect(await enviarMensagem("conversa-1", "Segue o catálogo 👇")).toEqual({})

    expect(disparo).toHaveBeenCalledTimes(1)
    expect(disparo).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      contactId: "contato-1",
      conversationId: "conversa-1",
      messageId: "msg-1",
      tipoMensagem: "texto",
      texto: "Segue o catálogo 👇",
    })
    expect(gravouAntes).toBe(true)
  })

  it("imagem e documento: o tipo da mídia, e texto vazio (o chat não manda legenda)", async () => {
    prepararChat()
    await enviarImagem("conversa-1", arquivo("foto.jpg", "image/jpeg"))
    await enviarDocumento("conversa-1", arquivo("tabela.pdf", "application/pdf"))

    expect(disparo.mock.calls.map(([m]) => [m.tipoMensagem, m.texto])).toEqual([
      ["imagem", ""],
      ["documento", ""],
    ])
  })

  it("o WhatsApp recusou: a falha fica na conversa, como hoje, e nada dispara", async () => {
    prepararChat()
    provider.enviarTexto.mockResolvedValue({ ok: false, motivo: "número desconectado" })

    const resultado = await enviarMensagem("conversa-1", "Segue o catálogo")

    expect(resultado.erro).toContain("Não enviada")
    expect(gravacoes).toContain("insert messages")
    expect(disparo).not.toHaveBeenCalled()
  })

  it("a mensagem saiu mas não foi gravada: não dispara", async () => {
    prepararChat({ mensagemGravada: false })

    await enviarMensagem("conversa-1", "Segue o catálogo")

    expect(disparo).not.toHaveBeenCalled()
  })
})

describe("B11-05 — o envio das automações e das sequências nunca chama o motor", () => {
  beforeEach(() => vi.clearAllMocks())

  it("enviarTextoWhatsAppComMotivo manda e grava, sem disparo nenhum", async () => {
    const gravadas: string[] = []
    const servico = clienteFalso(
      {
        contacts: { data: { phone_number: "5511999998888" }, error: null },
        conversations: { data: { id: "conversa-1" }, error: null },
      },
      gravadas
    )
    vi.mocked(resolverProviderDoContato).mockResolvedValue({
      enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-3" }),
    } as unknown as Awaited<ReturnType<typeof resolverProviderDoContato>>)

    const resultado = await enviarTextoWhatsAppComMotivo(
      servico as unknown as ReturnType<typeof createServiceClient>,
      "ws-1",
      "contato-1",
      "Segue o catálogo"
    )

    expect(resultado).toEqual({ ok: true })
    expect(gravadas).toContain("insert messages")
    expect(disparo).not.toHaveBeenCalled()
    expect(dispararAutomacoes).not.toHaveBeenCalled()
  })
})
