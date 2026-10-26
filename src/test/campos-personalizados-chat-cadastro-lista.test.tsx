// B38-02 — campos personalizados no painel do Chat, no Novo contato e nas colunas da
// lista de Contatos. As actions ficam mockadas; o servidor é conferido em
// campos-personalizados.integration.test.ts.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { Contato } from "@/app/(auth)/contatos/mock-contatos"
import type { CampoComValor } from "@/app/(auth)/contatos/campos-personalizados"
import type { CampoDaEmpresa, ValorGuardado } from "@/lib/campos-personalizados"

const criarContato = vi.fn()
const camposDoContato = vi.fn()
const salvarCamposDoContato = vi.fn()
const buscarInfoContato = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  criarContato: (...a: unknown[]) => criarContato(...a),
  verificarNumeroDuplicado: vi.fn(async () => false),
  filtrarContatos: vi.fn(),
  atualizarDadosContato: vi.fn(),
  adicionarTagContato: vi.fn(),
  removerTagContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/campos-personalizados", () => ({
  camposDoContato: (...a: unknown[]) => camposDoContato(...a),
  salvarCamposDoContato: (...a: unknown[]) => salvarCamposDoContato(...a),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn() }))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({ salvarFiltro: vi.fn(), atualizarFiltroSalvo: vi.fn() }))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: (...a: unknown[]) => buscarInfoContato(...a),
  atualizarNomeContato: vi.fn(),
}))

import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"
import { NovoContatoDialog } from "@/app/(auth)/contatos/components/novo-contato-dialog"
import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"

const VAZIO: ValorGuardado = { texto: null, numero: null, data: null, booleano: null, opcoes: null }
const CNPJ = { id: "c", nome: "CNPJ", tipo: "texto" as const, opcoes: [] }
const PORTE = { id: "p", nome: "Porte", tipo: "lista" as const, opcoes: [{ id: "o-p", nome: "Pequeno" }, { id: "o-g", nome: "Grande" }] }

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

const contato = (id: string, nome: string, campos: Record<string, ValorGuardado> = {}): Contato => ({
  id, nome, telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv: null, campos,
})

const cabecalhos = () => within(screen.getByRole("table")).getAllByRole("columnheader").map((th) => th.textContent)

beforeEach(() => {
  criarContato.mockReset()
  criarContato.mockResolvedValue({ id: "c-9" })
  camposDoContato.mockReset()
  salvarCamposDoContato.mockReset()
})

describe("B38-02 — campos no Chat, no cadastro e na lista", () => {
  it("CA-B38-26: should mostrar os campos no painel do Chat e deixar editar o Porte pelo lápis", async () => {
    buscarInfoContato.mockResolvedValue({
      dataPrimeiroContato: "20 de out.",
      cadastro: { contactId: "c-1", classificacao: "ativo", tipo: null, cidade: null, uf: null, icp: null, atendente: null, perfilRfv: null, tags: [], funis: [] },
    })
    const antes: CampoComValor[] = [{ ...CNPJ, valor: { ...VAZIO, texto: "12.345.678/0001-90" } }, { ...PORTE, valor: null }]
    const depois: CampoComValor[] = [antes[0], { ...PORTE, valor: { ...VAZIO, opcoes: ["o-p"] } }]
    camposDoContato.mockResolvedValueOnce(antes).mockResolvedValueOnce(depois)
    salvarCamposDoContato.mockResolvedValue({})

    render(<PainelContato conversa={conversa} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} />)
    const secao = await screen.findByRole("region", { name: "Campos personalizados" })
    expect(within(secao).getByText("12.345.678/0001-90")).toBeInTheDocument()

    fireEvent.click(within(secao).getByRole("button", { name: "Editar Porte" }))
    fireEvent.change(within(secao).getByLabelText("Porte"), { target: { value: "o-p" } })
    fireEvent.click(within(secao).getByRole("button", { name: "Salvar Porte" }))

    await waitFor(() => expect(salvarCamposDoContato).toHaveBeenCalledWith("c-1", { p: "o-p" }))
    await waitFor(() => expect(secao.querySelector('[data-campo="Porte"]')).toHaveTextContent("Pequeno"))
    expect(within(secao).getByText("12.345.678/0001-90")).toBeInTheDocument()
  })

  it("CA-B38-28: should mandar os campos preenchidos no Novo contato", async () => {
    render(<NovoContatoDialog campos={[CNPJ, PORTE]} />)
    fireEvent.click(screen.getByRole("button", { name: /Novo contato/ }))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Loja Sol" } })
    fireEvent.change(within(dialogo).getByLabelText("WhatsApp"), { target: { value: "5511988887777" } })
    fireEvent.change(within(dialogo).getByLabelText(/CNPJ/), { target: { value: "12.345.678/0001-90" } })
    fireEvent.change(within(dialogo).getByLabelText(/Porte/), { target: { value: "o-g" } })
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(criarContato).toHaveBeenCalledTimes(1))
    expect(criarContato.mock.calls[0][0]).toMatchObject({ nome: "Loja Sol", campos: { c: "12.345.678/0001-90", p: "o-g" } })
  })

  it("CA-B38-30: should apontar o e-mail fora do formato no Novo contato e não criar o contato", async () => {
    const EMAIL = { id: "e", nome: "E-mail do financeiro", tipo: "email" as const, opcoes: [] }
    render(<NovoContatoDialog campos={[EMAIL]} />)
    fireEvent.click(screen.getByRole("button", { name: /Novo contato/ }))
    const dialogo = await screen.findByRole("dialog")
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Loja Sol" } })
    fireEvent.change(within(dialogo).getByLabelText("WhatsApp"), { target: { value: "5511988887777" } })
    fireEvent.change(within(dialogo).getByLabelText(/E-mail do financeiro/), { target: { value: "fulano@" } })
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(within(dialogo).getByLabelText(/E-mail do financeiro/)).toHaveAttribute("aria-invalid", "true"))
    expect(within(dialogo).getByText("E-mail inválido.")).toBeInTheDocument()
    expect(criarContato).not.toHaveBeenCalled()
  })

  it("CA-B38-47: should mostrar na lista só a coluna do campo marcado", () => {
    const campos: CampoDaEmpresa[] = [{ ...CNPJ, mostrarNaLista: false }, { ...PORTE, mostrarNaLista: true }]
    render(<ListaContatos contatos={[contato("c-1", "Ana", { p: { ...VAZIO, opcoes: ["o-g"] } })]} total={1} atendentes={[]} papel="admin" campos={campos} />)
    expect(cabecalhos()).toContain("Porte")
    expect(cabecalhos()).not.toContain("CNPJ")
    const linha = screen.getByText("Ana").closest("tr")!
    expect(linha.querySelector('[data-coluna="Porte"]')).toHaveTextContent("Grande")
  })

  it("CA-B38-58: should mostrar a coluna de dinheiro formatada e — em quem não tem valor", () => {
    const LIMITE: CampoDaEmpresa = { id: "l", nome: "Limite de crédito", tipo: "dinheiro", opcoes: [], mostrarNaLista: true }
    render(
      <ListaContatos
        contatos={[contato("c-1", "Ana", { l: { ...VAZIO, numero: 1500 } }), contato("c-2", "Bruno")]}
        total={2}
        atendentes={[]}
        papel="admin"
        campos={[LIMITE]}
      />
    )
    const celula = (nome: string) => screen.getByText(nome).closest("tr")!.querySelector('[data-coluna="Limite de crédito"]')!
    expect(celula("Ana").textContent!.replace(/\s/g, " ")).toBe("R$ 1.500,00")
    expect(celula("Bruno").textContent).toBe("—")
  })
})
