// Ações de envio das automações (B11-07): variáveis, mensagem rápida, arquivo e
// a conversa por onde a mensagem sai. O envio de verdade (`whatsapp-envio.ts`)
// roda sobre o banco falso (`automacoes-banco-falso.ts`); só o WhatsApp é simulado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/whatsapp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(),
  resolverProviderDoContato: vi.fn(),
}))

import { resolverProviderDaConversa, resolverProviderDoContato } from "@/lib/whatsapp"
import { executarAcao } from "@/lib/automacoes/acoes"
import type { GatilhoAutomacao } from "@/lib/automacoes/contexto"
import { textoComVariaveis } from "@/lib/automacoes/envio"
import { arquivoDaAutomacaoValido } from "@/lib/automacoes/referencias"
import type { AcaoTipo, BlocoAcao } from "@/lib/fluxo-automacao"
import { banco } from "./automacoes-banco-falso"

const SUPABASE = "https://projeto.supabase.co"
const PASTA = `${SUPABASE}/storage/v1/object/public/chat-attachments/ws-1/automacoes/`

const mensagemRecebida: GatilhoAutomacao = {
  tipo: "mensagem_recebida",
  workspaceId: "ws-1",
  contactId: "contato-1",
  conversationId: "conv-da-mensagem",
  messageId: "msg-1",
  tipoMensagem: "texto",
  texto: "oi",
}

const cardMovido: GatilhoAutomacao = {
  tipo: "card_movido",
  workspaceId: "ws-1",
  contactId: "contato-1",
  cardId: "card-1",
  funil: "entrada",
  etapa: "sondagem",
}

const acao = (tipo: AcaoTipo, parametros: Record<string, string>): BlocoAcao => ({
  id: "a",
  tipo: "acao",
  acao: tipo,
  parametros,
  posicao: { x: 0, y: 0 },
})

let provider: {
  enviarTexto: ReturnType<typeof vi.fn>
  enviarMidia: ReturnType<typeof vi.fn>
  suporta: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE)
  provider = {
    enviarTexto: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-1" }),
    enviarMidia: vi.fn().mockResolvedValue({ ok: true, mensagemId: "wamid-2" }),
    suporta: vi.fn(() => true),
  }
  const comoProvider = provider as unknown as Awaited<ReturnType<typeof resolverProviderDaConversa>>
  vi.mocked(resolverProviderDaConversa).mockResolvedValue(comoProvider)
  vi.mocked(resolverProviderDoContato).mockResolvedValue(comoProvider)
})

describe("textoComVariaveis", () => {
  it("troca as três variáveis, quantas vezes aparecerem", () => {
    expect(
      textoComVariaveis("Oi {{primeiro_nome}}! {{nome_contato}}, aqui é {{nome_vendedor}}. Até, {{primeiro_nome}}", {
        nomeContato: "Ana Paula",
        primeiroNome: "Ana",
        nomeVendedor: "Bruna",
      })
    ).toBe("Oi Ana! Ana Paula, aqui é Bruna. Até, Ana")
  })
})

describe("enviar mensagem com variáveis", () => {
  it("texto sem variável sai como está, sem consultar o banco, pela conversa do evento", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem", { texto: "Bom dia!" }))).toEqual({ ok: true })

    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Bom dia!")
    expect(resolverProviderDaConversa).toHaveBeenCalledWith(expect.anything(), "conv-da-mensagem", "ws-1")
    expect(b.chamadas.filter((c) => ["conversations", "profiles", "pipeline_cards"].includes(c.tabela) && c.metodo === "select")).toEqual([])
    // Gravada na conversa onde o cliente escreveu
    expect(b.gravacoes("messages")[0].args[0]).toMatchObject({
      conversation_id: "conv-da-mensagem",
      direction: "enviada",
      type: "texto",
      content: "Bom dia!",
    })
  })

  it("primeiro nome, nome do contato e o atendente da conversa", async () => {
    const b = banco({
      contacts: { um: { name: "Ana Paula Souza", phone_number: "5511999998888" } },
      conversations: { um: { assigned_to: "u-1" } },
      profiles: { um: { name: "Bruna" } },
    })

    await executarAcao(
      b.contexto(mensagemRecebida),
      acao("enviar_mensagem", { texto: "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}} ({{nome_contato}})" })
    )

    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Oi Ana, aqui é Bruna (Ana Paula Souza)")
  })

  it("contato sem nome: nome_contato vira o telefone, e primeiro_nome fica vazio", async () => {
    const b = banco({
      contacts: { um: { name: null, phone_number: "5511999998888" } },
      conversations: { um: { assigned_to: null } },
      pipeline_cards: { lista: [] },
    })

    await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem", { texto: "Oi {{primeiro_nome}} / {{nome_contato}} / {{nome_vendedor}}" }))

    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Oi  / 5511999998888 / ")
  })

  it("conversa sem atendente: o vendedor é o do card principal (Recompra antes da Entrada)", async () => {
    const b = banco({
      contacts: { um: { name: "Ana", phone_number: "5511999998888" } },
      conversations: { um: { assigned_to: null } },
      pipeline_cards: {
        lista: [
          { funil: "entrada", atendente_id: "u-entrada" },
          { funil: "recompra", atendente_id: "u-recompra" },
        ],
      },
      profiles: { um: { name: "Carla" } },
    })

    await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem", { texto: "Aqui é {{nome_vendedor}}" }))

    expect(b.filtros("profiles")).toContainEqual(["id", "u-recompra"])
    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Aqui é Carla")
  })

  it("sem conversa no evento nem aberta: sai pelo número do contato e a conversa nasce", async () => {
    const b = banco({
      contacts: { um: { phone_number: "5511999998888" } },
      conversations: { um: null },
      whatsapp_connections: { um: { id: "conexao-1" } },
    })

    expect(await executarAcao(b.contexto(cardMovido), acao("enviar_mensagem", { texto: "Oi" }))).toEqual({ ok: true })

    expect(resolverProviderDoContato).toHaveBeenCalledWith(expect.anything(), "ws-1", "contato-1")
    expect(resolverProviderDaConversa).not.toHaveBeenCalled()
    expect(b.gravacoes("conversations")[0]).toMatchObject({ metodo: "insert" })
  })

  it("o WhatsApp recusou: falha com o motivo, para o histórico", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })
    provider.enviarTexto.mockResolvedValue({ ok: false, motivo: "fora da janela de 24 horas" })

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem", { texto: "Oi" }))).toEqual({
      ok: false,
      motivo: "O WhatsApp recusou o envio: fora da janela de 24 horas",
    })
    expect(b.gravacoes("messages")).toEqual([])
  })
})

describe("enviar mensagem rápida", () => {
  it("manda o texto cadastrado, com as variáveis, e confere a empresa da mensagem", async () => {
    const b = banco({
      quick_replies: { um: { content: "Oi {{primeiro_nome}}, segue nossa tabela" } },
      contacts: { um: { name: "Ana Paula", phone_number: "5511999998888" } },
      conversations: { um: { assigned_to: null } },
      pipeline_cards: { lista: [] },
    })

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem_rapida", { mensagem_rapida_id: "r-1" }))).toEqual({
      ok: true,
    })

    expect(b.filtros("quick_replies")).toEqual([
      ["id", "r-1"],
      ["workspace_id", "ws-1"],
    ])
    expect(provider.enviarTexto).toHaveBeenCalledWith("5511999998888", "Oi Ana, segue nossa tabela")
  })

  it("mensagem rápida apagada: falha, e nada sai", async () => {
    const b = banco({ quick_replies: { um: null } })

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_mensagem_rapida", { mensagem_rapida_id: "r-1" }))).toEqual({
      ok: false,
      motivo: "A mensagem rápida não existe mais",
    })
    expect(provider.enviarTexto).not.toHaveBeenCalled()
  })
})

describe("enviar imagem ou documento", () => {
  const pdf = { arquivo: `${PASTA}1760000000-tabela.pdf`, arquivo_nome: "Tabela de preços.pdf", arquivo_tipo: "documento" }

  it("documento sai com o nome original e fica gravado com o endereço do arquivo", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_midia", pdf))).toEqual({ ok: true })

    expect(provider.enviarMidia).toHaveBeenCalledWith("5511999998888", {
      url: pdf.arquivo,
      tipo: "documento",
      nomeArquivo: "Tabela de preços.pdf",
    })
    expect(b.gravacoes("messages")[0].args[0]).toMatchObject({
      type: "documento",
      content: pdf.arquivo,
      media_filename: "Tabela de preços.pdf",
    })
    expect(b.gravacoes("conversations")[0].args[0]).toMatchObject({ last_message_text: "📄 Documento" })
  })

  it("arquivo de outra empresa: falha, e nada sai", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })
    const deOutra = { ...pdf, arquivo: pdf.arquivo.replace("/ws-1/", "/ws-2/") }

    const resultado = await executarAcao(b.contexto(mensagemRecebida), acao("enviar_midia", deOutra))

    expect(resultado.ok).toBe(false)
    expect(provider.enviarMidia).not.toHaveBeenCalled()
  })

  it("número que não envia mídia: falha com o motivo", async () => {
    const b = banco({ contacts: { um: { phone_number: "5511999998888" } } })
    provider.suporta.mockReturnValue(false)

    expect(await executarAcao(b.contexto(mensagemRecebida), acao("enviar_midia", pdf))).toEqual({
      ok: false,
      motivo: "O número desta conversa não envia imagem nem documento",
    })
    expect(provider.enviarMidia).not.toHaveBeenCalled()
  })
})

describe("arquivoDaAutomacaoValido", () => {
  const valido = (url: string, tipo = "imagem") => arquivoDaAutomacaoValido({ url, tipo }, "ws-1", SUPABASE)

  it("só a pasta das automações da própria empresa, no bucket do CRM", () => {
    expect(valido(`${PASTA}1760000000-foto.jpg`)).toBe(true)
    expect(valido(`${SUPABASE}/storage/v1/object/public/chat-attachments/ws-2/automacoes/foto.jpg`)).toBe(false)
    expect(valido(`${SUPABASE}/storage/v1/object/public/chat-attachments/ws-1/campanhas/foto.jpg`)).toBe(false)
    expect(valido("https://outro-site.com/storage/v1/object/public/chat-attachments/ws-1/automacoes/foto.jpg")).toBe(false)
    expect(valido(`${PASTA}../../ws-2/automacoes/foto.jpg`)).toBe(false)
    expect(valido(PASTA)).toBe(false)
  })

  it("o tipo é imagem ou documento", () => {
    expect(valido(`${PASTA}video.mp4`, "video")).toBe(false)
    expect(valido(`${PASTA}tabela.pdf`, "documento")).toBe(true)
  })
})
