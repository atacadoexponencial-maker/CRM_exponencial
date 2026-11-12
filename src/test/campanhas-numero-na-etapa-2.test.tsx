// B54-03 — o número da campanha é escolhido na etapa da mensagem, não mais na do
// agendamento. As actions são mockadas; o teste confere o que a tela manda ao servidor.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampanhaDetalhe, NumeroParaCampanha } from "@/app/(auth)/campanhas/actions"

const contarDestinatarios = vi.fn()
const avaliarDisparo = vi.fn(async () => null)
const salvarRascunho = vi.fn(async () => ({ id: "camp-1" }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
  avaliarDisparo: (...a: unknown[]) => avaliarDisparo(...(a as [])),
  confirmarCampanha: vi.fn(),
  salvarRascunho: (...a: unknown[]) => salvarRascunho(...(a as [])),
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

const CAMPANHA: CampanhaDetalhe = {
  id: "camp-1", nome: "Promo", status: "rascunho", segmento: {}, tipoMensagem: "texto", conteudo: "Oi",
  arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId: null,
}

beforeEach(() => {
  contarDestinatarios.mockReset()
  contarDestinatarios.mockImplementation(async () => ({
    total: 3,
    amostra: [1, 2, 3].map((i) => ({ id: `p-${i}`, nome: `Pessoa ${i}`, telefone: `551190000000${i}` })),
  }))
  avaliarDisparo.mockClear()
  salvarRascunho.mockClear()
})

describe("B54-03 — número na etapa da mensagem", () => {
  it("CA-B54-11: should mostrar 'Enviar pelo número' como primeiro campo da etapa 2, tirá-lo da etapa 3, e gravar e avaliar pelo número escolhido", async () => {
    render(<EditorCampanhaClient campanha={CAMPANHA} opcoes={OPCOES} numeros={[DIRETO, OFICIAL]} />)
    await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
    expect(screen.queryByLabelText("Enviar pelo número")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    const seletor = (await screen.findByLabelText("Enviar pelo número")) as HTMLSelectElement
    const tipo = screen.getByText("Tipo de mensagem")
    // o seletor vem antes do tipo de mensagem
    expect(seletor.compareDocumentPosition(tipo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(Array.from(seletor.options).map((o) => o.value)).toEqual(["", DIRETO.id, OFICIAL.id])

    fireEvent.change(seletor, { target: { value: OFICIAL.id } })
    expect(seletor.value).toBe(OFICIAL.id)

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    await waitFor(() => expect(screen.getByText("Quando enviar")).toBeTruthy())
    expect(screen.queryByLabelText("Enviar pelo número")).toBeNull()
    await waitFor(() => expect(avaliarDisparo).toHaveBeenCalledWith(OFICIAL.id, 3))

    fireEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }))
    await waitFor(() => expect(salvarRascunho).toHaveBeenCalled())
    const dados = (salvarRascunho.mock.calls[0] as unknown[])[1] as { whatsappConnectionId: string | null }
    expect(dados.whatsappConnectionId).toBe(OFICIAL.id)
  })
})
