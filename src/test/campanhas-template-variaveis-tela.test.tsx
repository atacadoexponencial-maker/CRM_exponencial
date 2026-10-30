// B54-05 — na campanha por template: de onde vem cada variável, o arquivo do cabeçalho,
// a prévia com as origens, o aviso das 24h que some, e salvar/reabrir. As actions são
// mockadas; o teste confere o que a tela mostra e o que manda ao servidor.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampanhaDetalhe, DadosCampanha, NumeroParaCampanha, TemplateParaCampanha } from "@/app/(auth)/campanhas/actions"

const contarDestinatarios = vi.fn()
const templatesParaCampanha = vi.fn()
const salvarRascunho = vi.fn(async () => ({ id: "camp-1" }))
const uploadArquivoCampanha = vi.fn(async () => ({ url: "https://x.supabase.co/storage/v1/object/public/chat-attachments/w-1/campanhas/capa.jpg", nome: "capa.jpg" }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
  templatesParaCampanha: (...a: unknown[]) => templatesParaCampanha(...a),
  salvarRascunho: (...a: unknown[]) => salvarRascunho(...(a as [])),
  uploadArquivoCampanha: (...a: unknown[]) => uploadArquivoCampanha(...(a as [])),
  avaliarDisparo: vi.fn(async () => null),
  confirmarCampanha: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  salvarFiltro: vi.fn(),
  atualizarFiltroSalvo: vi.fn(),
  apagarFiltroSalvo: vi.fn(),
  moverFiltroSalvo: vi.fn(),
  renomearFiltroSalvo: vi.fn(),
}))

import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"

const OPCOES = { atendentes: [], etiquetas: [], funis: [], campos: [{ id: "cp-1", nome: "Cidade", tipo: "texto", opcoes: [] }] }
const OFICIAL: NumeroParaCampanha = { id: "num-oficial", numero: "5511955046911", nomeExibicao: "Loja", canalNome: "API Oficial", ehCanalDireto: false }

const COM_VARIAVEIS: TemplateParaCampanha = {
  id: "t-vend", name: "vendedor_da_loja", language: "pt_BR", category: "MARKETING",
  partes: {
    cabecalho: { tipo: "texto", texto: "Oferta da semana" },
    corpo: "Olá {{1}}, seu vendedor é {{2}}",
    rodape: "Responda SAIR",
    botoes: [{ tipo: "resposta_rapida", texto: "Quero" }, { tipo: "link", texto: "Ver catálogo", url: "https://loja.com/c/{{1}}" }],
  },
}
const COM_IMAGEM: TemplateParaCampanha = {
  id: "t-img", name: "lancamento", language: "pt_BR", category: "MARKETING",
  partes: { cabecalho: { tipo: "imagem" }, corpo: "Chegou novidade", rodape: null, botoes: [] },
}
const AVISO_24H = /A Meta só entrega mensagens livres para contatos que interagiram nas últimas 24/

function campanha(extra: Partial<CampanhaDetalhe> = {}): CampanhaDetalhe {
  return {
    id: "camp-1", nome: "Promo", status: "rascunho", segmento: {}, tipoMensagem: "texto", conteudo: "Oi",
    arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId: OFICIAL.id, template: null, ...extra,
  }
}

async function abrirEtapa2(c: CampanhaDetalhe) {
  render(<EditorCampanhaClient campanha={c} opcoes={OPCOES} numeros={[OFICIAL]} />)
  await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
  await screen.findByText("Tipo de mensagem")
}

async function escolherTemplate(t: TemplateParaCampanha) {
  fireEvent.click(screen.getByRole("button", { name: "Template" }))
  fireEvent.change(await screen.findByLabelText("Template"), { target: { value: t.id } })
}

const origem = (nome: string) => screen.getByLabelText(`Origem da ${nome}`) as HTMLSelectElement
const reserva = (nome: string) => screen.getByLabelText(`Texto reserva da ${nome}`) as HTMLInputElement

beforeEach(() => {
  contarDestinatarios.mockReset()
  contarDestinatarios.mockImplementation(async () => ({
    total: 3,
    amostra: [1, 2, 3].map((i) => ({ id: `p-${i}`, nome: `Pessoa ${i}`, telefone: `551190000000${i}` })),
  }))
  templatesParaCampanha.mockReset()
  templatesParaCampanha.mockImplementation(async () => ({ templates: [COM_VARIAVEIS, COM_IMAGEM] }))
  salvarRascunho.mockClear()
  uploadArquivoCampanha.mockClear()
})

describe("B54-05 — variáveis, arquivo e prévia do template na campanha", () => {
  it("CA-B54-16: should mostrar um seletor de origem por variável, com as origens do contato, o campo personalizado e Texto fixo", async () => {
    await abrirEtapa2(campanha())
    await escolherTemplate(COM_VARIAVEIS)

    const seletores = [origem("variável {{1}}"), origem("variável {{2}}"), origem("variável {{1}} do botão 2")]
    expect(screen.getAllByLabelText(/^Origem da variável/)).toHaveLength(3)
    for (const s of seletores) {
      expect(Array.from(s.options).map((o) => o.textContent)).toEqual(["Nome do contato", "Primeiro nome", "Nome do vendedor", "Cidade", "Texto fixo"])
    }
    expect(screen.queryByLabelText("Texto fixo da variável {{2}}")).toBeNull()
    fireEvent.change(seletores[1], { target: { value: "fixo" } })
    expect(screen.getByLabelText("Texto fixo da variável {{2}}")).toBeTruthy()
    expect(screen.queryByLabelText("Texto reserva da variável {{2}}")).toBeNull()
  })

  it("CA-B54-17: should travar o Próximo com reserva em branco e avançar com ela; Texto fixo não pede reserva", async () => {
    await abrirEtapa2(campanha())
    await escolherTemplate(COM_VARIAVEIS)

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(await screen.findByText("Preencha o texto reserva da variável 1")).toBeTruthy()
    expect(screen.getByText("Tipo de mensagem")).toBeTruthy()

    fireEvent.change(reserva("variável {{1}}"), { target: { value: "cliente" } })
    fireEvent.change(origem("variável {{2}}"), { target: { value: "fixo" } })
    fireEvent.change(screen.getByLabelText("Texto fixo da variável {{2}}"), { target: { value: "Ana" } })
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(await screen.findByText("Preencha o texto reserva da variável 1 do botão 2")).toBeTruthy()

    fireEvent.change(reserva("variável {{1}} do botão 2"), { target: { value: "geral" } })
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    await waitFor(() => expect(screen.getByText("Quando enviar")).toBeTruthy())
  })

  it("CA-B54-18: should pedir o arquivo do cabeçalho de imagem antes de avançar, pelo anexo da campanha", async () => {
    await abrirEtapa2(campanha())
    await escolherTemplate(COM_IMAGEM)
    expect(screen.getByText("Arquivo do cabeçalho (imagem)")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(await screen.findByText("Anexe a imagem do cabeçalho")).toBeTruthy()
    expect(screen.getByText("Tipo de mensagem")).toBeTruthy()

    const entrada = screen.getByTestId("arquivo-da-campanha") as HTMLInputElement
    expect(entrada.accept).toBe("image/*")
    fireEvent.change(entrada, { target: { files: [new File(["x"], "capa.jpg", { type: "image/jpeg" })] } })
    await screen.findByText("capa.jpg")
    expect(uploadArquivoCampanha).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    await waitFor(() => expect(screen.getByText("Quando enviar")).toBeTruthy())
  })

  it("CA-B54-19: should mostrar a prévia com [Nome do contato] e o texto fixo Ana, com cabeçalho, rodapé e botões", async () => {
    await abrirEtapa2(campanha())
    await escolherTemplate(COM_VARIAVEIS)
    fireEvent.change(origem("variável {{2}}"), { target: { value: "fixo" } })
    fireEvent.change(screen.getByLabelText("Texto fixo da variável {{2}}"), { target: { value: "Ana" } })

    const previa = screen.getByTestId("previa-do-template")
    expect(within(previa).getByTestId("previa-corpo").textContent).toBe("Olá [Nome do contato], seu vendedor é Ana")
    expect(within(previa).getByTestId("previa-cabecalho").textContent).toBe("Oferta da semana")
    expect(within(previa).getByTestId("previa-rodape").textContent).toBe("Responda SAIR")
    expect(within(previa).getAllByTestId("previa-botao").map((b) => b.textContent)).toEqual(["Quero", "Ver catálogo"])

    fireEvent.change(origem("variável {{1}}"), { target: { value: "campo:cidade" } })
    expect(within(previa).getByTestId("previa-corpo").textContent).toBe("Olá [Cidade], seu vendedor é Ana")
  })

  it("CA-B54-20: should esconder o aviso das 24h no tipo Template e trazê-lo de volta no Texto", async () => {
    await abrirEtapa2(campanha())
    expect(screen.getByText(AVISO_24H)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Template" }))
    await screen.findByLabelText("Template")
    expect(screen.queryByText(AVISO_24H)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Texto" }))
    expect(await screen.findByText(AVISO_24H)).toBeTruthy()
  })

  it("CA-B54-21: should salvar o template com as origens e o arquivo, e reabrir com tudo preenchido", async () => {
    await abrirEtapa2(campanha())
    await escolherTemplate(COM_VARIAVEIS)
    fireEvent.change(reserva("variável {{1}}"), { target: { value: "cliente" } })
    fireEvent.change(origem("variável {{2}}"), { target: { value: "nome_vendedor" } })
    fireEvent.change(reserva("variável {{2}}"), { target: { value: "nossa equipe" } })
    fireEvent.change(origem("variável {{1}} do botão 2"), { target: { value: "fixo" } })
    fireEvent.change(screen.getByLabelText("Texto fixo da variável {{1}} do botão 2"), { target: { value: "promo" } })

    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }))
    await waitFor(() => expect(salvarRascunho).toHaveBeenCalled())
    const dados = (salvarRascunho.mock.calls[0] as unknown[])[1] as DadosCampanha
    expect(dados.tipoMensagem).toBe("template")
    expect(dados.template).toEqual({
      id: "t-vend", name: "vendedor_da_loja", language: "pt_BR", cabecalho: "texto",
      variaveis: {
        corpo: [{ origem: "nome_contato", reserva: "cliente" }, { origem: "nome_vendedor", reserva: "nossa equipe" }],
        cabecalho: [],
        botoes: { 1: [{ origem: "fixo", fixo: "promo" }] },
      },
    })

    // reabrir: a campanha gravada volta com as mesmas origens e o arquivo
    const { unmount } = render(<div />)
    unmount()
    document.body.innerHTML = ""
    await abrirEtapa2(campanha({
      tipoMensagem: "template",
      arquivoUrl: "https://x.supabase.co/storage/v1/object/public/chat-attachments/w-1/campanhas/capa.jpg",
      arquivoNome: "capa.jpg",
      template: dados.template!,
    }))
    await screen.findByLabelText("Template")
    await waitFor(() => expect(origem("variável {{2}}").value).toBe("nome_vendedor"))
    expect(reserva("variável {{1}}").value).toBe("cliente")
    expect(reserva("variável {{2}}").value).toBe("nossa equipe")
    expect((screen.getByLabelText("Texto fixo da variável {{1}} do botão 2") as HTMLInputElement).value).toBe("promo")
  })
})
