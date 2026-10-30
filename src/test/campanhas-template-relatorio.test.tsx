// B54-06 — a lista de campanhas e o relatório dizem qual template foi usado. As actions
// são mockadas; o teste confere o que as telas mostram com os dados que o servidor devolve.

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CampanhaListada, RelatorioCampanha } from "@/app/(auth)/campanhas/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/campanhas/actions", () => ({
  cancelarCampanha: vi.fn(),
  excluirCampanha: vi.fn(),
  criarReenvioParaFalhos: vi.fn(),
  interromperCampanha: vi.fn(),
  retomarCampanha: vi.fn(),
  progressoDoDisparo: vi.fn(async () => null),
}))

import { CampanhasClient } from "@/app/(auth)/campanhas/campanhas-client"
import { RelatorioCampanhaClient } from "@/app/(auth)/campanhas/[id]/relatorio/relatorio-client"

const listada = (extra: Partial<CampanhaListada>): CampanhaListada => ({
  id: "c-1", nome: "Oferta", status: "enviada", totalDestinatarios: 12, dataEnvio: "2026-10-30T12:00:00Z",
  criador: "Marcelle", precisaDeAjuste: false, mensagem: "—", ...extra,
})

const RELATORIO: RelatorioCampanha = {
  id: "c-1", nome: "Oferta de outubro", status: "enviada", enviadaEm: "2026-10-30T12:00:00Z", interrompidaMotivo: null,
  total: 2, enviados: 2, entregues: 1, lidos: 0, falhos: 0, pendentes: 0, naFila: 0,
  templateNome: "oferta_outubro",
  destinatarios: [
    { nome: "Maria", telefone: "5511900000001", status: "entregue", atualizadoEm: null, motivo: null },
    { nome: "João", telefone: "5511900000002", status: "enviado", atualizadoEm: null, motivo: null },
  ],
}

describe("B54-06 — lista e relatório dizem o template", () => {
  it("CA-B54-28: should mostrar 'Template: nome' na coluna Mensagem da lista e o nome do template no cabeçalho do relatório", () => {
    const { unmount } = render(
      <CampanhasClient campanhasIniciais={[
        listada({ id: "c-1", nome: "Oferta", mensagem: "Template: oferta_outubro" }),
        listada({ id: "c-2", nome: "Aviso", mensagem: "Olá {{nome_contato|cliente}}, chegou novidade" }),
      ]} />
    )
    expect(screen.getByRole("columnheader", { name: "Mensagem" })).toBeTruthy()
    const linhaDaOferta = screen.getByText("Oferta").closest("tr") as HTMLElement
    expect(within(linhaDaOferta).getByText("Template: oferta_outubro")).toBeTruthy()
    const linhaDoAviso = screen.getByText("Aviso").closest("tr") as HTMLElement
    expect(within(linhaDoAviso).getByText("Olá {{nome_contato|cliente}}, chegou novidade")).toBeTruthy()
    unmount()

    render(<RelatorioCampanhaClient relatorio={RELATORIO} />)
    expect(screen.getByRole("heading", { name: "Oferta de outubro" })).toBeTruthy()
    expect(screen.getByText("oferta_outubro").closest("p")?.textContent).toBe("Template: oferta_outubro")
    unmount()

    const { container } = render(<RelatorioCampanhaClient relatorio={{ ...RELATORIO, templateNome: null }} />)
    expect(container.textContent).not.toContain("Template:")
  })
})
