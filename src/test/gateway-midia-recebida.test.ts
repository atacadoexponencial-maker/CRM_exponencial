// Mídia e os demais tipos recebidos (B6-03). Download e Storage simulados.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirMensagem: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/automacoes", () => ({
  processarAutomacoes: vi.fn().mockResolvedValue(undefined),
}))

import { guardarMidiaRecebida } from "@/lib/whatsapp/midia-recebida"
import {
  aplicarAvisoDeSistema,
  aplicarReacao,
  receberMensagem,
  traduzirConteudo,
  TIPO_NO_CRM,
  type EventoMensagemRecebida,
} from "@/lib/whatsapp/recebimento"
import type { createServiceClient } from "@/integrations/supabase/service"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const RECEBIDO_EM = "2026-09-17T14:32:07.412Z"

const MIDIA = {
  url: "https://gateway.exemplo/v1/media/med_01/conteudo",
  mime_type: "image/jpeg",
  size_bytes: 184320,
  filename: null as string | null,
  thumbnail_url: null,
  expires_at: "2026-09-18T14:32:07Z",
}

function eventoDe(extra: Partial<EventoMensagemRecebida>): EventoMensagemRecebida {
  return {
    message_id: "3EB0C767D26B8F3A1B",
    from: "5511999998888",
    from_is_lid: false,
    type: "text",
    ...extra,
  }
}

/** Storage falso, que registra o upload e devolve URL pública previsível. */
function storageFalso({ uploadFalha = false }: { uploadFalha?: boolean } = {}) {
  const uploads: Array<{ caminho: string; contentType?: string }> = []
  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn(async (caminho: string, _conteudo: unknown, opcoes?: { contentType?: string }) => {
        uploads.push({ caminho, contentType: opcoes?.contentType })
        return { error: uploadFalha ? { message: "bucket cheio" } : null }
      }),
      getPublicUrl: vi.fn((caminho: string) => ({
        data: { publicUrl: `https://supabase.exemplo/storage/${caminho}` },
      })),
    })),
  }
  return { storage, uploads }
}

function supabaseFalso({
  uploadFalha = false,
  alvo = { id: "mensagem-alvo" } as { id: string } | null,
}: { uploadFalha?: boolean; alvo?: { id: string } | null } = {}) {
  const { storage, uploads } = storageFalso({ uploadFalha })
  const escritas: Array<{ tabela: string; operacao: string; linha: unknown }> = []

  const client = {
    storage,
    from: vi.fn((tabela: string) => {
      if (tabela === "contacts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "contato-1" } }),
        }
      }
      if (tabela === "conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          // Lista, não linha única: a conversa é escolhida pelo número dono.
          limit: vi.fn().mockResolvedValue({
            data: [{ id: "conversa-1", unread_count: 0, whatsapp_connection_id: null }],
          }),
          update: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "update", linha })
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          }),
        }
      }
      if (tabela === "messages") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: alvo }),
          update: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "update", linha })
            return {
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: alvo }),
            }
          }),
          insert: vi.fn((linha: unknown) => {
            escritas.push({ tabela, operacao: "insert", linha })
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: "mensagem-nova" }, error: null }),
            }
          }),
        }
      }
      throw new Error(`tabela inesperada: ${tabela}`)
    }),
  }

  return {
    supabase: client as unknown as ReturnType<typeof createServiceClient>,
    escritas,
    uploads,
  }
}

function inserida(escritas: Array<{ tabela: string; operacao: string; linha: unknown }>) {
  return escritas.find((e) => e.tabela === "messages" && e.operacao === "insert")?.linha as
    | Record<string, unknown>
    | undefined
}

describe("tradução de tipo", () => {
  it("vocabulário do gateway vira o do CRM, em pt-BR", () => {
    expect(TIPO_NO_CRM.image).toBe("imagem")
    expect(TIPO_NO_CRM.document).toBe("documento")
    expect(TIPO_NO_CRM.sticker).toBe("figurinha")
    expect(TIPO_NO_CRM.location).toBe("localizacao")
    expect(TIPO_NO_CRM.contact).toBe("contato")
  })

  it("gravação de voz e arquivo de áudio caem no mesmo tipo", () => {
    expect(TIPO_NO_CRM.voice).toBe("audio")
    expect(TIPO_NO_CRM.audio).toBe("audio")
  })

  it("tipo fora do contrato vira desconhecido, sem quebrar", () => {
    const traduzido = traduzirConteudo(eventoDe({ type: "holograma" }))

    expect(traduzido.tipo).toBe("desconhecido")
    expect(traduzido.previa).toContain("não suportada")
  })
})

describe("download e armazenamento", () => {
  beforeEach(() => vi.clearAllMocks())

  it("baixa do gateway com o token da instância e sobe para o Storage do CRM", async () => {
    const { supabase, uploads } = supabaseFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))

    const guardada = await guardarMidiaRecebida({
      supabase,
      workspaceId: WORKSPACE,
      midia: MIDIA,
      instanceToken: "token-da-instancia",
      buscar: buscar as unknown as typeof fetch,
    })

    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(MIDIA.url)
    expect(init.headers).toEqual({ "X-Instance-Token": "token-da-instancia" })
    expect(uploads[0].caminho).toContain(`${WORKSPACE}/recebidas/`)
    expect(uploads[0].caminho).toMatch(/\.jpeg$/)
    expect(guardada?.url).toContain("supabase.exemplo/storage/")
  })

  it("nome do arquivo no Storage é nosso, e o original é preservado à parte", async () => {
    const { supabase, uploads } = supabaseFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))

    const guardada = await guardarMidiaRecebida({
      supabase,
      workspaceId: WORKSPACE,
      midia: { ...MIDIA, mime_type: "application/pdf", filename: "tabela precos.pdf" },
      buscar: buscar as unknown as typeof fetch,
    })

    expect(guardada?.filename).toBe("tabela precos.pdf")
    expect(uploads[0].caminho).not.toContain("tabela precos")
    expect(uploads[0].caminho).toMatch(/\.pdf$/)
  })

  it("download que falha devolve null em vez de lançar", async () => {
    const { supabase } = supabaseFalso()
    const buscar = vi.fn(async () => new Response("expirado", { status: 404 }))

    expect(
      await guardarMidiaRecebida({
        supabase,
        workspaceId: WORKSPACE,
        midia: MIDIA,
        buscar: buscar as unknown as typeof fetch,
      })
    ).toBeNull()
  })

  it("rede caída devolve null em vez de lançar", async () => {
    const { supabase } = supabaseFalso()
    const buscar = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })

    expect(
      await guardarMidiaRecebida({
        supabase,
        workspaceId: WORKSPACE,
        midia: MIDIA,
        buscar: buscar as unknown as typeof fetch,
      })
    ).toBeNull()
  })

  it("upload que falha devolve null", async () => {
    const { supabase } = supabaseFalso({ uploadFalha: true })
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))

    expect(
      await guardarMidiaRecebida({
        supabase,
        workspaceId: WORKSPACE,
        midia: MIDIA,
        buscar: buscar as unknown as typeof fetch,
      })
    ).toBeNull()
  })
})

describe("mensagem com arquivo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))
    )
  })

  it("foto com legenda: conteúdo é a URL do CRM, e a legenda fica guardada", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "image", media: MIDIA, text: "segue a foto" }),
      recebidoEm: RECEBIDO_EM,
      instanceToken: "tok",
    })

    const linha = inserida(escritas)
    expect(linha?.type).toBe("imagem")
    expect(String(linha?.content)).toContain("supabase.exemplo/storage/")
    expect(linha?.media_caption).toBe("segue a foto")
    expect(linha?.media_mime_type).toBe("image/jpeg")
  })

  it("legenda vazia é preservada como vazia, não como ausente", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "image", media: MIDIA, text: "" }),
      recebidoEm: RECEBIDO_EM,
    })

    expect(inserida(escritas)?.media_caption).toBe("")
  })

  it("documento preserva o nome original", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({
        type: "document",
        media: { ...MIDIA, mime_type: "application/pdf", filename: "tabela-precos.pdf" },
      }),
      recebidoEm: RECEBIDO_EM,
    })

    const linha = inserida(escritas)
    expect(linha?.type).toBe("documento")
    expect(linha?.media_filename).toBe("tabela-precos.pdf")
  })

  it("falha no download não perde a mensagem: legenda continua registrada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("expirado", { status: 404 }))
    )
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "image", media: MIDIA, text: "olha o preço" }),
      recebidoEm: RECEBIDO_EM,
    })

    const linha = inserida(escritas)
    expect(linha).toBeDefined()
    expect(linha?.content).toBe("olha o preço")
    expect(linha?.media_filename).toBeNull()
  })
})

describe("tipos sem arquivo", () => {
  beforeEach(() => vi.clearAllMocks())

  it("localização vira texto legível, com link de mapa", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({
        type: "location",
        location: { latitude: -23.55, longitude: -46.63, name: "Mercadão", address: "Rua 25 de Março" },
      }),
      recebidoEm: RECEBIDO_EM,
    })

    const linha = inserida(escritas)
    expect(linha?.type).toBe("localizacao")
    expect(String(linha?.content)).toContain("Mercadão")
    expect(String(linha?.content)).toContain("maps?q=-23.55,-46.63")
  })

  it("cartão de contato vira nome e telefones legíveis", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({
        type: "contact",
        contact: { display_name: "João Atacado", phones: ["5511988887777"] },
      }),
      recebidoEm: RECEBIDO_EM,
    })

    const linha = inserida(escritas)
    expect(linha?.type).toBe("contato")
    expect(String(linha?.content)).toContain("João Atacado")
    expect(String(linha?.content)).toContain("5511988887777")
  })

  it("tipo desconhecido é registrado sem quebrar a conversa", async () => {
    const { supabase, escritas } = supabaseFalso()

    await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "unknown" }),
      recebidoEm: RECEBIDO_EM,
    })

    expect(inserida(escritas)?.type).toBe("desconhecido")
  })
})

describe("reação", () => {
  beforeEach(() => vi.clearAllMocks())

  it("reação altera a mensagem alvo e não cria mensagem nova", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "reaction", reaction: { emoji: "👍", target_message_id: "3EB0ALVO" } }),
      recebidoEm: RECEBIDO_EM,
    })

    expect(resultado).toEqual({ tratamento: "reacao", alvoEncontrado: true })
    expect(inserida(escritas)).toBeUndefined()
    expect(escritas.find((e) => e.tabela === "messages")?.linha).toEqual({ reaction_emoji: "👍" })
  })

  it("emoji vazio remove a reação em vez de gravar vazio", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarReacao({ supabase, reacao: { emoji: "", target_message_id: "3EB0ALVO" } })

    expect(escritas[0].linha).toEqual({ reaction_emoji: null })
  })

  it("alvo que o CRM não tem não é erro", async () => {
    const { supabase } = supabaseFalso({ alvo: null })

    const resultado = await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "reaction", reaction: { emoji: "👍", target_message_id: "sumida" } }),
      recebidoEm: RECEBIDO_EM,
    })

    expect(resultado).toEqual({ tratamento: "reacao", alvoEncontrado: false })
  })
})

describe("mensagem editada e apagada", () => {
  beforeEach(() => vi.clearAllMocks())

  it("editada atualiza o texto e marca quando", async () => {
    const { supabase, escritas } = supabaseFalso()

    await aplicarAvisoDeSistema({
      supabase,
      aviso: { action: "edited", target_message_id: "3EB0ALVO", new_text: "corrigido" },
      quando: RECEBIDO_EM,
    })

    expect(escritas[0].linha).toEqual({ content: "corrigido", edited_at: RECEBIDO_EM })
  })

  it("apagada é marcada, e a linha do banco continua existindo", async () => {
    const { supabase, escritas } = supabaseFalso()

    const resultado = await receberMensagem({
      supabase,
      workspaceId: WORKSPACE,
      evento: eventoDe({ type: "text", system: { action: "deleted", target_message_id: "3EB0ALVO" } }),
      recebidoEm: RECEBIDO_EM,
    })

    expect(resultado).toEqual({ tratamento: "exclusao", alvoEncontrado: true })
    expect(escritas[0].linha).toEqual({ deleted_at: RECEBIDO_EM })
    expect(inserida(escritas)).toBeUndefined()
  })
})
