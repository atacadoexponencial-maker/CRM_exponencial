// B42-02 — etapa Destinatários da campanha com o filtro de Contatos. As actions são
// mockadas: aqui se confere o que a tela mostra e o que ela pede ao servidor.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampanhaDetalhe, Segmento } from "@/app/(auth)/campanhas/actions"
import { TODOS_OS_CAMPOS, type Filtro } from "@/lib/filtro-contatos"

const contarDestinatarios = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  contarDestinatarios: (...a: unknown[]) => contarDestinatarios(...a),
  avaliarDisparo: vi.fn(async () => null),
  confirmarCampanha: vi.fn(),
  salvarRascunho: vi.fn(),
  uploadArquivoCampanha: vi.fn(),
}))

// B42-03: a campanha salva filtro pelo mesmo servidor da lista de Contatos.
const salvarFiltro = vi.fn()
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  salvarFiltro: (...a: unknown[]) => salvarFiltro(...a),
  apagarFiltroSalvo: vi.fn(),
  moverFiltroSalvo: vi.fn(),
  renomearFiltroSalvo: vi.fn(),
}))

import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"

const FUNIL = { id: "0b9f3c2e-1111-4222-8333-944455556666", nome: "Feira de Março", etapas: [{ valor: "e-proposta", rotulo: "Proposta" }] }
const OPCOES = { atendentes: [{ id: "u-ana", nome: "Ana" }], etiquetas: ["VIP"], funis: [FUNIL] }

const pessoas = (prefixo: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefixo}-${i}`, nome: `${prefixo} ${i}`, telefone: `55119000000${String(i).padStart(2, "0")}` }))

function campanha(segmento: Segmento): CampanhaDetalhe {
  return {
    id: "camp-1", nome: "Promo", status: "rascunho", segmento, tipoMensagem: "texto", conteudo: "Oi",
    arquivoUrl: null, arquivoNome: null, agendadaPara: null, whatsappConnectionId: null,
  }
}

function abrirPainel() {
  fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))
  return screen.getByRole("dialog")
}

beforeEach(() => {
  contarDestinatarios.mockReset()
  contarDestinatarios.mockImplementation(async () => ({ total: 0, amostra: [] }))
})

describe("B42-02 — campanha escolhe quem recebe pelo filtro de Contatos", () => {
  it("CA-B42-01: should abrir o painel do filtro de Contatos, sem os chips e campos antigos", () => {
    render(<EditorCampanhaClient campanha={null} opcoes={OPCOES} numeros={[]} />)

    // Os chips e campos de antes não estão mais na etapa.
    expect(screen.queryByRole("button", { name: "Lead" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Lojista" })).toBeNull()
    expect(screen.queryByRole("button", { name: "VIP" })).toBeNull()
    expect(screen.queryByLabelText("Cidade")).toBeNull()
    expect(screen.queryByLabelText("Atendente responsável")).toBeNull()

    const painel = abrirPainel()
    const grupos = Array.from(within(painel).getByLabelText("Campo").querySelectorAll("optgroup")).map((g) => ({
      assunto: g.label,
      campos: Array.from(g.querySelectorAll("option")).map((o) => o.textContent),
    }))
    // Os mesmos campos da lista de Contatos, por assunto, com o funil da empresa.
    const esperado = ["Cadastro", "Etiquetas", "Compras", "Funil"].map((assunto) => ({
      assunto,
      campos: [
        ...TODOS_OS_CAMPOS.filter((c) => c.assunto === assunto).map((c) => c.rotulo),
        ...(assunto === "Funil" ? ["Etapa no funil Feira de Março"] : []),
      ],
    }))
    expect(grupos).toEqual(esperado)
  })

  it("CA-B42-06: should refazer a contagem e a amostra ao acrescentar e remover uma condição", async () => {
    contarDestinatarios.mockImplementation(async (segmento: Segmento) => {
      const comCondicao = (segmento.filtro?.grupos ?? []).some((g) => g.condicoes.length > 0)
      return comCondicao ? { total: 12, amostra: pessoas("Doze", 12) } : { total: 40, amostra: pessoas("Quarenta", 40) }
    })
    render(<EditorCampanhaClient campanha={null} opcoes={OPCOES} numeros={[]} />)
    await waitFor(() => expect(screen.getByText("40 destinatários")).toBeTruthy())
    expect(screen.getByText("Quarenta 0")).toBeTruthy()

    let painel = abrirPainel()
    fireEvent.change(within(painel).getByLabelText("Campo"), { target: { value: "cidade" } })
    fireEvent.change(within(painel).getByLabelText("Valor"), { target: { value: "Fortaleza" } })
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))
    await waitFor(() => expect(screen.getByText("12 destinatários")).toBeTruthy())
    expect(screen.getByText("Doze 0")).toBeTruthy()
    expect(screen.queryByText("Quarenta 0")).toBeNull()

    painel = abrirPainel()
    fireEvent.click(within(painel).getByRole("button", { name: "Remover condição" }))
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))
    await waitFor(() => expect(screen.getByText("40 destinatários")).toBeTruthy())
    expect(screen.getByText("Quarenta 0")).toBeTruthy()
  })

  it("CA-B42-08: should mostrar o resumo do filtro com os nomes escolhidos e os E/OU no lugar certo", () => {
    const filtro: Filtro = {
      juncao: "e",
      grupos: [
        {
          juncao: "ou",
          condicoes: [
            { campo: `funil:${FUNIL.id}`, comparacao: "na_etapa", valores: ["e-proposta"] },
            { campo: "etiqueta", comparacao: "tem", valores: ["VIP"] },
          ],
        },
        { juncao: "e", condicoes: [{ campo: "atendente", comparacao: "e", valores: ["u-ana"] }] },
      ],
    }
    render(<EditorCampanhaClient campanha={campanha({ filtro })} opcoes={OPCOES} numeros={[]} />)

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByTestId("resumo-do-filtro").textContent).toBe(
      "(Etapa no funil Feira de Março está na etapa Proposta OU Etiqueta tem VIP) E Atendente (carteira) é Ana"
    )
  })

  it("CA-B42-09: should avisar e ficar na etapa 1 quando o filtro não traz ninguém", async () => {
    render(<EditorCampanhaClient campanha={null} opcoes={OPCOES} numeros={[]} />)
    fireEvent.change(screen.getByLabelText("Nome da campanha"), { target: { value: "Promo" } })
    await waitFor(() => expect(screen.getByText("0 destinatários")).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))

    expect(screen.getByText("A campanha precisa de pelo menos um destinatário")).toBeTruthy()
    expect(screen.getByText(/Etapa 1 de 3/)).toBeTruthy()
  })

  it("CA-B42-13: should mostrar no reenvio o aviso dos que falharam, sem Filtrar, com a contagem do servidor", async () => {
    contarDestinatarios.mockImplementation(async () => ({ total: 3, amostra: pessoas("Falhou", 3) }))
    render(<EditorCampanhaClient campanha={campanha({ reenvioDe: "camp-origem" })} opcoes={OPCOES} numeros={[]} />)

    expect(screen.getByText(/os destinatários são os contatos que falharam na campanha original/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: /^Filtrar/ })).toBeNull()
    await waitFor(() => expect(screen.getByText("3 destinatários")).toBeTruthy())
    expect(contarDestinatarios).toHaveBeenLastCalledWith({ reenvioDe: "camp-origem" })
  })
})

describe("B42-03 — filtros salvos e funil ou etapa apagada na campanha", () => {
  const LOJISTAS: Filtro = {
    juncao: "e",
    grupos: [{ juncao: "e", condicoes: [{ campo: "cidade", comparacao: "igual", valores: ["Fortaleza"] }, { campo: "tipo", comparacao: "e", valores: ["lojista"] }] }],
  }
  const SALVOS = [{ id: "s-1", nome: "Lojistas de Fortaleza", filtro: LOJISTAS }]

  it("CA-B42-16: should pôr as condições do filtro salvo no painel e marcar o botão dele", async () => {
    render(<EditorCampanhaClient campanha={null} opcoes={OPCOES} numeros={[]} filtrosSalvos={SALVOS} />)
    const botao = screen.getByRole("button", { name: "Lojistas de Fortaleza" })
    expect(botao.getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(botao)

    await waitFor(() => expect(contarDestinatarios).toHaveBeenLastCalledWith({ filtro: LOJISTAS }))
    expect(screen.getByRole("button", { name: "Lojistas de Fortaleza" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByTestId("resumo-do-filtro").textContent).toBe("Cidade é igual a Fortaleza E Tipo é Lojista")
    const painel = abrirPainel()
    expect(within(painel).getAllByLabelText("Campo").map((c) => (c as HTMLSelectElement).value)).toEqual(["cidade", "tipo"])
  })

  it("CA-B42-19: should salvar pela campanha o filtro montado e mostrá-lo na faixa", async () => {
    salvarFiltro.mockResolvedValue({ filtros: [...SALVOS, { id: "s-2", nome: "Proposta da feira", filtro: LOJISTAS }] })
    render(<EditorCampanhaClient campanha={campanha({ filtro: LOJISTAS })} opcoes={OPCOES} numeros={[]} filtrosSalvos={SALVOS} />)

    const painel = abrirPainel()
    fireEvent.click(within(painel).getByRole("button", { name: "Salvar filtro" }))
    fireEvent.change(within(painel).getByLabelText("Nome do filtro"), { target: { value: "Proposta da feira" } })
    fireEvent.click(within(painel).getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(salvarFiltro).toHaveBeenCalledWith("Proposta da feira", LOJISTAS))
    await waitFor(() => expect(screen.getByRole("button", { name: "Proposta da feira" })).toBeTruthy())
  })

  it("CA-B42-12: should avisar qual condição usa funil ou etapa apagada e não deixar avançar", async () => {
    contarDestinatarios.mockImplementation(async () => ({ total: 5, amostra: pessoas("Cinco", 5) }))
    const apagado = "11111111-2222-4333-8444-555555555555"
    const filtro: Filtro = {
      juncao: "ou",
      grupos: [
        { juncao: "e", condicoes: [{ campo: `funil:${FUNIL.id}`, comparacao: "na_etapa", valores: ["e-que-sumiu"] }] },
        { juncao: "e", condicoes: [{ campo: `funil:${apagado}`, comparacao: "no_funil", valores: [] }] },
      ],
    }
    render(<EditorCampanhaClient campanha={campanha({ filtro })} opcoes={OPCOES} numeros={[]} />)
    await waitFor(() => expect(screen.getByText("5 destinatários")).toBeTruthy())

    const aviso = screen.getByRole("alert")
    expect(aviso.textContent).toContain("Etapa no funil Feira de Março está na etapa (etapa apagada)")
    expect(aviso.textContent).toContain("Etapa num funil apagado está no funil (qualquer etapa)")

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }))
    expect(screen.getByText(/Etapa 1 de 3/)).toBeTruthy()
    expect(screen.getAllByText(/Troque ou remova essa condição para confirmar/).length).toBeGreaterThan(1)
  })
})
