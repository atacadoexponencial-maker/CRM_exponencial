// B38-07 — o filtro por campo na tela dos Relatórios: aparece ao lado do de atendente
// e, completo, recarrega a Visão Geral com ele. O servidor é conferido em
// campos-personalizados-relatorios.integration.test.ts.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ usePathname: () => "/relatorios", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarVisaoGeral = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarVisaoGeral: (...args: unknown[]) => buscarVisaoGeral(...args) }))

import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const HOJE = "2026-10-26"
const visao = (periodo = periodoPadrao(HOJE)) => ({ ...calcularCartoes([], periodo, HOJE), graficos: calcularGraficos([], periodo, HOJE, {}), tabela: [], porUf: variacaoPorUf([], periodo, HOJE), mesesHistorico: historicoDe25Meses([], HOJE), atendenteId: null })
const PORTE = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Porte",
  tipo: "lista",
  opcoes: [{ id: "33333333-3333-4333-8333-333333333333", nome: "Pequeno" }, { id: "44444444-4444-4444-8444-444444444444", nome: "Grande" }],
}

beforeEach(() => {
  buscarVisaoGeral.mockReset()
  buscarVisaoGeral.mockImplementation(async () => visao())
})

describe("B38-07 — filtro por campo nos Relatórios", () => {
  it("CA-B38-50: should mostrar o filtro por campo ao lado do de atendente e recarregar a Visão Geral com Porte Grande", async () => {
    render(<RelatoriosClient visaoInicial={visao()} atendentes={[{ id: "a1", nome: "Ana" }]} papel="admin" hoje={HOJE} campos={[PORTE]} />)
    const atendente = screen.getByLabelText("Atendente")
    const campo = screen.getByLabelText("Campo personalizado")
    expect(atendente.parentElement).toBe(campo.closest("div")!.parentElement)

    fireEvent.change(campo, { target: { value: `campo:lista:${PORTE.id}` } })
    expect(buscarVisaoGeral).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText("Grande"))
    await waitFor(() =>
      expect(buscarVisaoGeral).toHaveBeenCalledWith(expect.objectContaining({ campo: { campo: `campo:lista:${PORTE.id}`, valores: [PORTE.opcoes[1].id] } }))
    )
  })
})
