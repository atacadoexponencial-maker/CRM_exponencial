// B54-04 — o tipo Template na etapa 2 do editor de campanha: só com número da API
// Oficial, com a lista do número, e a troca de número limpa um template que não existe
// nele. As actions são mockadas.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampanhaDetalhe, NumeroParaCampanha, TemplateParaCampanha } from "@/app/(auth)/campanhas/actions"

const contarDestinatarios = vi.fn()
const templatesParaCampanha = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
  templatesParaCampanha: (...a: unknown[]) => templatesParaCampanha(...a),
  avaliarDisparo: vi.fn(async () => null),
  confirmarCampanha: vi.fn(),
  salvarRascunho: vi.fn(),
  uploadArquivoCampanha: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  salvarFiltro: vi.fn(),
  atualizarFiltroSalvo: vi.fn(),
  apagarFiltroSalvo: vi.fn(),
  moverFiltroSalvo: vi.fn(),
  renomearFiltroSalvo: vi.fn(),
}))

import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"

const OPCOES = { atendentes: [], etiquetas: [], funis: [] }
const DIRETO: NumeroParaCampanha = { id: "num-direto", numero: "5511900000001", nomeExibicao: "Chip", canalNome: "Canal direto", ehCanalDireto: true }
const OFICIAL: NumeroParaCampanha = { id: "num-oficial", numero: "5511955046911", nomeExibicao: "Loja", canalNome: "API Oficial", ehCanalDireto: false }
const OFICIAL_2: NumeroParaCampanha = { id: "num-oficial-2", numero: "5511955046922", nomeExibicao: "Loja 2", canalNome: "API Oficial", ehCanalDireto: false }

const PROMO: TemplateParaCampanha = { id: "t-promo", name: "promo_semana", language: "pt_BR", category: "MARKETING", partes: { cabecalho: null, corpo: "Olá {{1}}", rodape: null, botoes: [] } }
const OUTRO: TemplateParaCampanha = { id: "t-outro", name: "aviso_entrega", language: "pt_BR", category: "UTILITY", partes: { cabecalho: null, corpo: "Seu pedido saiu", rodape: null, botoes: [] } }

function campanha(extra: Partial<CampanhaDetalhe> = {}): CampanhaDetalhe {
  return {
    id: "camp-1", nome: "Promo", status: "rascunho", segmento: {}, tipoMensagem: "texto", conteudo: "Oi",
    arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId: null, template: null, ...extra,
  }
}

async function abrirEtapa2(c: CampanhaDetalhe, numeros: NumeroParaCampanha[]) {
  const r = render(<EditorCampanhaClient campanha={c} opcoes={OPCOES} numeros={numeros} />)
  await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
  await screen.findByText("Tipo de mensagem")
  return r
}

const tipos = () => ["Texto", "Imagem + legenda", "Documento + legenda", "Template"].filter((t) => screen.queryByRole("button", { name: t }))

beforeEach(() => {
  contarDestinatarios.mockReset()
  contarDestinatarios.mockImplementation(async () => ({
    total: 3,
    amostra: [1, 2, 3].map((i) => ({ id: `p-${i}`, nome: `Pessoa ${i}`, telefone: `551190000000${i}` })),
  }))
  templatesParaCampanha.mockReset()
  templatesParaCampanha.mockImplementation(async (id: string) => ({
    templates: id === OFICIAL.id ? [PROMO, OUTRO] : id === OFICIAL_2.id ? [OUTRO] : [],
  }))
})

describe("B54-04 — tipo Template na campanha", () => {
  it("CA-B54-12: should oferecer só Texto, Imagem e Documento, com a nota, no canal direto e sem número escolhido", async () => {
    const { unmount } = await abrirEtapa2(campanha({ whatsappConnectionId: DIRETO.id }), [DIRETO, OFICIAL])
    expect(tipos()).toEqual(["Texto", "Imagem + legenda", "Documento + legenda"])
    expect(screen.getByText("Template só existe na API Oficial")).toBeTruthy()
    unmount()

    await abrirEtapa2(campanha({ whatsappConnectionId: null }), [DIRETO, OFICIAL])
    expect((screen.getByLabelText("Enviar pelo número") as HTMLSelectElement).value).toBe("")
    expect(tipos()).toEqual(["Texto", "Imagem + legenda", "Documento + legenda"])
    expect(screen.getByText("Template só existe na API Oficial")).toBeTruthy()
  })

  it("CA-B54-13: should mostrar o quarto tipo Template com número da API Oficial, e listar os aprovados dele ao escolher", async () => {
    await abrirEtapa2(campanha({ whatsappConnectionId: OFICIAL.id }), [DIRETO, OFICIAL])
    expect(tipos()).toEqual(["Texto", "Imagem + legenda", "Documento + legenda", "Template"])
    expect(screen.queryByText("Template só existe na API Oficial")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Template" }))
    const seletor = (await screen.findByLabelText("Template")) as HTMLSelectElement
    expect(templatesParaCampanha).toHaveBeenCalledWith(OFICIAL.id)
    expect(Array.from(seletor.options).map((o) => o.textContent)).toEqual(["Escolha um template aprovado", "promo_semana · pt_BR", "aviso_entrega · pt_BR"])
    // o campo de texto livre e o aviso das 24h não fazem sentido no template
    expect(screen.queryByLabelText("Mensagem")).toBeNull()
  })

  it("CA-B54-15: should apagar o template, voltar a Texto e avisar ao trocar para número sem ele ou do canal direto", async () => {
    await abrirEtapa2(campanha({ whatsappConnectionId: OFICIAL.id, tipoMensagem: "template", template: { id: PROMO.id, name: PROMO.name, language: "pt_BR", cabecalho: null } }), [DIRETO, OFICIAL, OFICIAL_2])
    const seletor = (await screen.findByLabelText("Template")) as HTMLSelectElement
    await waitFor(() => expect(seletor.value).toBe(PROMO.id))

    // número da API Oficial sem o promo_semana
    fireEvent.change(screen.getByLabelText("Enviar pelo número"), { target: { value: OFICIAL_2.id } })
    expect(await screen.findByText("O template escolhido não existe neste número")).toBeTruthy()
    expect(screen.queryByLabelText("Template")).toBeNull()
    expect(screen.getByLabelText("Mensagem")).toBeTruthy()

    // de volta ao número certo, escolhe de novo e troca para o chip
    fireEvent.change(screen.getByLabelText("Enviar pelo número"), { target: { value: OFICIAL.id } })
    fireEvent.click(await screen.findByRole("button", { name: "Template" }))
    fireEvent.change(await screen.findByLabelText("Template"), { target: { value: PROMO.id } })
    fireEvent.change(screen.getByLabelText("Enviar pelo número"), { target: { value: DIRETO.id } })
    expect(await screen.findByText("O template escolhido não existe neste número")).toBeTruthy()
    expect(tipos()).toEqual(["Texto", "Imagem + legenda", "Documento + legenda"])
  })
})
