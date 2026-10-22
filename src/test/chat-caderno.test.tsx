// B36-06 — Chat no estilo Caderno: a ficha do cliente ao lado da conversa, com o resumo
// das compras (total, pedidos, ticket médio, última compra), a etapa e as etiquetas.

import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import { resumoDeCompras } from "@/lib/resumo-de-compras"

const AGORA = new Date("2026-10-22T15:00:00-03:00")
const diasAntes = (d: number) => new Date(AGORA.getTime() - d * 86400000).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
const COMPRAS = [
  { valor: 1000, data: diasAntes(40) },
  { valor: 2000, data: diasAntes(25) },
  { valor: 3000, data: diasAntes(10) },
]

vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(async () => ({})),
  adicionarTagContato: vi.fn(async () => ({})),
  removerTagContato: vi.fn(async () => ({})),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: vi.fn(async () => ({
    dataPrimeiroContato: "20 de out. de 2026",
    compras: resumoDeCompras(COMPRAS, AGORA),
    cadastro: {
      contactId: "c-1", classificacao: "ativo", tipo: "lojista", nicho: "Moda", cidade: "Uberlândia", uf: "MG",
      icp: null, atendente: "Ana", tags: ["vip", "feira"], funis: [{ funil: "recompra", etapa: "Ativos" }],
    },
  })),
  atualizarNomeContato: vi.fn(),
}))

import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"

const CONVERSA: Conversa = {
  id: "conv-1",
  contato: { nome: "Moda Sol", telefone: "5534999991180", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

describe("B36-06 — Chat no estilo Caderno", () => {
  it("CA-B36-26: should mostrar na ficha ao lado da conversa o total comprado, os pedidos, o ticket médio, a última compra, a etapa e as etiquetas", async () => {
    expect(resumoDeCompras(COMPRAS, AGORA)).toEqual({ total: 6000, quantidade: 3, ticketMedio: 2000, diasDesdeUltima: 10 })

    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} />)
    const ficha = screen.getByRole("complementary", { name: "Ficha do cliente" })
    const compras = await within(ficha).findByLabelText("Compras")
    const valor = (rotulo: string) => compras.querySelector(`[data-resumo="${rotulo}"] dd`)!.textContent!.replace(/\s/g, " ")
    expect(valor("Total comprado")).toBe("R$ 6.000,00")
    expect(valor("Pedidos")).toBe("3")
    expect(valor("Ticket médio")).toBe("R$ 2.000,00")
    expect(valor("Última compra")).toBe("há 10 dias")
    await waitFor(() => expect(within(ficha).getByText("Ativos")).toBeTruthy())
    expect(within(ficha).getByText("vip")).toBeTruthy()
    expect(within(ficha).getByText("feira")).toBeTruthy()
  })
})
