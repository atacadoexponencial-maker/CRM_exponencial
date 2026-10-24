// B43-01 — o que a lista de contatos, o perfil do contato e o painel do chat mostram
// do perfil RFV. As actions são mockadas; o perfil vem do servidor (ver
// perfil-rfv-no-contato.integration.test.ts).

import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { Contato, ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"
import type { PerfilRfv } from "@/lib/relatorios/rfv"

const buscarInfoContato = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  filtrarContatos: vi.fn(),
  verificarNumeroDuplicado: vi.fn(),
  criarContato: vi.fn(),
  atualizarDadosContato: vi.fn(),
  adicionarTagContato: vi.fn(),
  removerTagContato: vi.fn(),
  atualizarObservacoesContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({
  resumoExclusaoContato: vi.fn(),
  excluirContato: vi.fn(),
  restaurarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: (...a: unknown[]) => buscarInfoContato(...a),
  atualizarNomeContato: vi.fn(),
}))

import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"

const contato = (id: string, nome: string, perfilRfv: PerfilRfv | null): Contato => ({
  id, nome, telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv,
})

const perfil = (perfilRfv: PerfilRfv | null): ContatoPerfil => ({
  ...contato("c-1", "Ana Souza", perfilRfv),
  icp: null, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
})

const conversa: Conversa = {
  id: "conv-1",
  contato: { nome: "Ana Souza", telefone: "5511999998888", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "20/10/2026",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

function abrirPainelDoChat(perfilRfv: PerfilRfv | null) {
  buscarInfoContato.mockResolvedValue({
    dataPrimeiroContato: "20 de out.",
    cadastro: { contactId: "c-1", classificacao: "ativo", tipo: null, cidade: null, uf: null, icp: null, atendente: null, perfilRfv, tags: [], funis: [] },
  })
  return render(<PainelContato conversa={conversa} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} />)
}

/** A linha "Perfil RFV" do cadastro, no painel do chat. */
async function linhaDoPerfilNoChat() {
  const rotulo = await screen.findByText("Perfil RFV")
  return rotulo.parentElement as HTMLElement
}

describe("B43-01 — perfil RFV nas telas", () => {
  it("CA-B43-01: should mostrar na lista a coluna Perfil RFV com ícone e nome do perfil de cada contato", () => {
    render(
      <ListaContatos
        contatos={[contato("c-1", "Ana", "campeao"), contato("c-2", "Bruno", "hibernando")]}
        total={2}
        atendentes={[]}
        papel="admin"
      />
    )

    const tabela = screen.getByRole("table")
    const cabecalhos = within(tabela).getAllByRole("columnheader").map((th) => th.textContent)
    expect(cabecalhos).toContain("Perfil RFV")
    const coluna = cabecalhos.indexOf("Perfil RFV")

    const celula = (nome: string) => within(screen.getByText(nome).closest("tr")!).getAllByRole("cell")[coluna]
    expect(celula("Ana").textContent).toBe("🏆 Campeão")
    expect(celula("Bruno").textContent).toBe("😴 Hibernando")
  })

  it("CA-B43-02: should mostrar Sem compras na lista, no perfil e no painel do chat para quem nunca comprou", async () => {
    const lista = render(<ListaContatos contatos={[contato("c-1", "Ana", null)]} total={1} atendentes={[]} papel="admin" />)
    const cabecalhos = within(screen.getByRole("table")).getAllByRole("columnheader").map((th) => th.textContent)
    const celula = within(screen.getByText("Ana").closest("tr")!).getAllByRole("cell")[cabecalhos.indexOf("Perfil RFV")]
    expect(celula.textContent).toBe("Sem compras")
    lista.unmount()

    const doPerfil = render(<PerfilContato contato={perfil(null)} papel="admin" />)
    expect(doPerfil.getByText("Sem compras")).toBeTruthy()
    doPerfil.unmount()

    abrirPainelDoChat(null)
    expect((await linhaDoPerfilNoChat()).textContent).toBe("Perfil RFVSem compras")
  })

  it("CA-B43-03: should mostrar no perfil do contato o selo 💎 Clientes Fiéis", () => {
    render(<PerfilContato contato={perfil("fieis")} papel="admin" />)
    expect(screen.getByText("💎 Clientes Fiéis")).toBeTruthy()
  })

  it("CA-B43-04: should mostrar no painel do contato do chat o selo 🔥 Em Risco", async () => {
    abrirPainelDoChat("em_risco")
    await waitFor(() => expect(buscarInfoContato).toHaveBeenCalledWith("conv-1"))
    expect((await linhaDoPerfilNoChat()).textContent).toBe("Perfil RFV🔥 Em Risco")
  })
})
