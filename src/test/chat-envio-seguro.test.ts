// B44-10 — o chat não aceita SVG, grava com a extensão do tipo e não mostra erro
// interno cru ao atendente (auditoria de 27/10/2026). Banco, armazenamento e canal
// simulados, no padrão de chat-envio-automacoes.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(),
}))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  dispararEtiquetaAplicada: vi.fn().mockResolvedValue(undefined),
  dispararMensagemEnviadaPeloTime: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { resolverProviderDaConversa } from "@/lib/whatsapp"
import { enviarImagem, enviarMensagem } from "@/app/(auth)/chat/actions"

type Resposta = { data: unknown; error: unknown }
let uploads: Array<{ caminho: string; contentType?: string }> = []

function prepararChat({ erroAoGravar = null as string | null, statusDaConexao = "connected" } = {}) {
  uploads = []
  const respostas: Record<string, Resposta> = {
    conversations: { data: { workspace_id: "ws-1", contact_id: "contato-1", contact: { phone_number: "5511999998888" }, conexao: { status: statusDaConexao } }, error: null },
    messages: erroAoGravar ? { data: null, error: { message: erroAoGravar } } : { data: { id: "msg-1" }, error: null },
  }
  const cliente = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "order", "limit", "insert", "update"]) obj[m] = vi.fn(() => obj)
      const resposta = respostas[tabela] ?? { data: null, error: null }
      obj.single = vi.fn(() => Promise.resolve(resposta))
      obj.maybeSingle = vi.fn(() => Promise.resolve(resposta))
      obj.then = (r: (v: Resposta) => void) => Promise.resolve({ data: null, error: null }).then(r)
      return obj
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async (caminho: string, _a: unknown, opcoes?: { contentType?: string }) => {
          uploads.push({ caminho, contentType: opcoes?.contentType })
          return { error: null }
        }),
        getPublicUrl: vi.fn((caminho: string) => ({ data: { publicUrl: `https://storage.exemplo/storage/v1/object/public/chat-attachments/${caminho}` } })),
        // B49-02: a Meta e o gateway recebem link assinado
        createSignedUrl: vi.fn(async (caminho: string) => ({ data: { signedUrl: `https://storage.exemplo/assinado/${caminho}` } })),
      })),
    },
  }
  vi.mocked(createClient).mockResolvedValue(cliente as unknown as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(createServiceClient).mockReturnValue(cliente as unknown as ReturnType<typeof createServiceClient>)
  vi.mocked(resolverProviderDaConversa).mockResolvedValue({
    canal: "meta",
    enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-1" }),
    enviarMidia: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-2" }),
  } as unknown as Awaited<ReturnType<typeof resolverProviderDaConversa>>)
}

function arquivo(nome: string, tipo: string) {
  const dados = new FormData()
  dados.set("arquivo", new File([new Uint8Array(8)], nome, { type: tipo }))
  return dados
}

beforeEach(() => vi.clearAllMocks())

describe("B44-10 — Envio pelo chat seguro", () => {
  it("CA-B44-37: should recusar imagem SVG sem guardar nada", async () => {
    prepararChat()
    expect(await enviarImagem("conversa-1", arquivo("foto.svg", "image/svg+xml"))).toEqual({ erro: "Não enviada: Tipo de arquivo não aceito." })
    expect(uploads).toEqual([])
  })

  it("CA-B44-37: should guardar a imagem aceita com a extensão do tipo, não a do nome", async () => {
    prepararChat()
    expect(await enviarImagem("conversa-1", arquivo("foto.html", "image/png"))).toEqual({ mensagemId: "msg-1", status: "enviado" })
    expect(uploads).toHaveLength(1)
    expect(uploads[0].caminho).toMatch(/\.png$/)
    expect(uploads[0].contentType).toBe("image/png")
  })

  it("CA-B44-38: should mostrar 'tente de novo' no lugar do erro interno do banco", async () => {
    prepararChat({ erroAoGravar: 'duplicate key value violates unique constraint "messages_wamid_key"' })
    const resultado = await enviarMensagem("conversa-1", "oi")
    expect(resultado).toEqual({ erro: "Não enviada: tente de novo em instantes." })
    expect(resultado.erro).not.toContain("duplicate key")
  })

  it("CA-B44-38: should continuar mostrando o aviso de número desconectado", async () => {
    prepararChat({ erroAoGravar: "falhou", statusDaConexao: "disconnected" })
    expect(await enviarMensagem("conversa-1", "oi")).toEqual({
      erro: "Não enviada: o número desta conversa está desconectado. Reconecte em Configurações → WhatsApp.",
    })
  })
})
