// B53-06 — o aviso da janela de 24h da Meta, na etapa Mensagem do editor de campanha,
// só aparece quando o número da campanha é da API Oficial. As actions são mockadas.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampanhaDetalhe, NumeroParaCampanha } from "@/app/(auth)/campanhas/actions"

const contarDestinatarios = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
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
const AVISO = /A Meta só entrega mensagens livres para contatos que interagiram nas últimas 24/

function campanha(whatsappConnectionId: string | null): CampanhaDetalhe {
  return {
    id: "camp-1", nome: "Promo", status: "rascunho", segmento: {}, tipoMensagem: "texto", conteudo: "Oi",
    arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId,
  }
}

async function abrirEtapaMensagem(c: CampanhaDetalhe, numeros: NumeroParaCampanha[]) {
  render(<EditorCampanhaClient campanha={c} opcoes={OPCOES} numeros={numeros} />)
  await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
  fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
  await waitFor(() => expect(screen.getByLabelText("Mensagem")).toBeTruthy())
}

beforeEach(() => {
  contarDestinatarios.mockReset()
  contarDestinatarios.mockImplementation(async () => ({
    total: 3,
    amostra: [1, 2, 3].map((i) => ({ id: `p-${i}`, nome: `Pessoa ${i}`, telefone: `551190000000${i}` })),
  }))
})

describe("B53-06 — aviso das 24h só na API Oficial", () => {
  it("CA-B53-11: should esconder o aviso das 24h com número do canal direto e mostrar com número da API Oficial", async () => {
    await abrirEtapaMensagem(campanha(DIRETO.id), [DIRETO, OFICIAL])
    expect(screen.queryByText(AVISO)).toBeNull()

    // Na etapa 3 a pessoa troca para o número da API Oficial e volta à Mensagem
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    fireEvent.change(await screen.findByLabelText("Enviar pelo número"), { target: { value: OFICIAL.id } })
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }))
    expect(await screen.findByText(AVISO)).toBeTruthy()
  })

  it("CA-B53-11: should mostrar o aviso com o único número conectado da API Oficial e esconder com o único do canal direto", async () => {
    const { unmount } = render(<EditorCampanhaClient campanha={campanha(null)} opcoes={OPCOES} numeros={[OFICIAL]} />)
    await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(await screen.findByText(AVISO)).toBeTruthy()
    unmount()

    await abrirEtapaMensagem(campanha(null), [DIRETO])
    expect(screen.queryByText(AVISO)).toBeNull()
  })

  it("CA-B53-11: should decidir pelos números da empresa quando nenhum número foi escolhido", async () => {
    // Todos do canal direto: a campanha sai por um deles, sem aviso.
    const { unmount } = render(
      <EditorCampanhaClient campanha={campanha(null)} opcoes={OPCOES} numeros={[DIRETO, { ...DIRETO, id: "num-direto-2" }]} />
    )
    await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    await waitFor(() => expect(screen.getByLabelText("Mensagem")).toBeTruthy())
    expect(screen.queryByText(AVISO)).toBeNull()
    unmount()

    // Números dos dois canais: não dá para saber por qual sai, e o aviso fica.
    await abrirEtapaMensagem(campanha(null), [DIRETO, OFICIAL])
    expect(screen.getByText(AVISO)).toBeTruthy()
  })
})
