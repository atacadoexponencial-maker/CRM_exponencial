// B40-01 — o campo nicho sai das telas do contato: novo contato, perfil, ficha do
// chat, lista e filtro avançado. As actions são mockadas: aqui se confere o que a
// tela mostra e o que ela manda ao servidor; o esquema do servidor recusa o nicho.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { Contato, ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"
import { esquemaFiltro, esquemaRapidos } from "@/lib/filtro-contatos"

const criarContato = vi.fn<(...a: unknown[]) => Promise<{ erro?: string; id?: string }>>(async () => ({ id: "c-9" }))
const atualizar = vi.fn<(...a: unknown[]) => Promise<{ erro?: string }>>(async () => ({}))
const filtrarContatos = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  criarContato: (...a: unknown[]) => criarContato(...a),
  verificarNumeroDuplicado: vi.fn(async () => false),
  atualizarDadosContato: (...a: unknown[]) => atualizar(...a),
  adicionarTagContato: vi.fn(async () => ({})),
  removerTagContato: vi.fn(async () => ({})),
  atualizarObservacoesContato: vi.fn(async () => ({})),
  filtrarContatos: (...a: unknown[]) => filtrarContatos(...a),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({
  resumoExclusaoContato: vi.fn(),
  excluirContato: vi.fn(),
  restaurarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: vi.fn(async () => ({
    dataPrimeiroContato: "20 de out. de 2026",
    cadastro: {
      contactId: "c-1",
      classificacao: "lead",
      tipo: "lojista",
      cidade: "Fortaleza",
      uf: "CE",
      icp: "primeira_vez",
      atendente: "Ana",
      tags: [],
      funis: [],
    },
  })),
  atualizarNomeContato: vi.fn(),
}))

import { NovoContatoDialog } from "@/app/(auth)/contatos/components/novo-contato-dialog"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"
import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"

const PERFIL: ContatoPerfil = {
  id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "lead", tipo: "lojista", cidade: "Fortaleza",
  uf: "CE", atendente: null, created_at: "2026-10-20T00:00:00Z", icp: "ja_revende", fotoUrl: null, tags: [],
  observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
}

const CONVERSA: Conversa = {
  id: "conv-1",
  contato: { nome: "Marcelle", telefone: "5521970692725", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

const contato = (n: number): Contato => ({
  id: `c-${n}`,
  nome: `Contato ${n}`,
  telefone: `55119${String(n).padStart(8, "0")}`,
  classificacao: "lead",
  tipo: "lojista",
  cidade: "Fortaleza",
  atendente: null,
  created_at: "2026-10-20T10:00:00Z",
})

const renderizarLista = () =>
  render(<ListaContatos contatos={[contato(1), contato(2)]} total={2} atendentes={[]} papel="admin" />)

beforeEach(() => {
  criarContato.mockClear()
  atualizar.mockClear()
  filtrarContatos.mockReset()
  filtrarContatos.mockResolvedValue({ contatos: [contato(1)], total: 1 })
})

describe("B40-01 — nicho sai das telas do contato", () => {
  it("CA-B40-01: should criar contato sem pedir nicho", async () => {
    render(<NovoContatoDialog />)
    fireEvent.click(screen.getByRole("button", { name: /Novo contato/ }))
    const dialogo = await screen.findByRole("dialog")

    expect(within(dialogo).queryByLabelText(/Nicho/)).toBeNull()
    expect(within(dialogo).queryByText(/Nicho/)).toBeNull()

    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Loja Sol" } })
    fireEvent.change(within(dialogo).getByLabelText("WhatsApp"), { target: { value: "5511988887777" } })
    fireEvent.change(within(dialogo).getByLabelText(/Cidade/), { target: { value: "Recife" } })
    fireEvent.click(within(dialogo).getByRole("button", { name: /Salvar|Criar/ }))

    await waitFor(() => expect(criarContato).toHaveBeenCalledTimes(1))
    const enviado = criarContato.mock.calls[0][0] as Record<string, unknown>
    expect(enviado).toEqual({ nome: "Loja Sol", telefone: "5511988887777", tipo: null, cidade: "Recife", uf: null })
    expect("nicho" in enviado).toBe(false)
  })

  it("CA-B40-02: should mostrar o perfil sem a linha Nicho", () => {
    render(<PerfilContato contato={PERFIL} papel="admin" />)
    expect(screen.queryByText("Nicho")).toBeNull()
    expect(screen.getByText("Tipo")).toBeTruthy()
    expect(screen.getByText("Lojista")).toBeTruthy()
    expect(screen.getByText("Fortaleza")).toBeTruthy()
  })

  it("CA-B40-03: should editar o contato sem campo Nicho e gravar os dados novos", async () => {
    render(<PerfilContato contato={PERFIL} papel="admin" />)
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0])

    expect(screen.queryByLabelText("Nicho")).toBeNull()
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana S." } })
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "Natal" } })
    fireEvent.change(screen.getByLabelText("UF"), { target: { value: "RN" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(atualizar).toHaveBeenCalledTimes(1))
    expect(atualizar).toHaveBeenCalledWith("c-1", { nome: "Ana S.", tipo: "lojista", cidade: "Natal", uf: "RN", icp: "ja_revende" })
    expect("nicho" in (atualizar.mock.calls[0][1] as Record<string, unknown>)).toBe(false)
  })

  it("CA-B40-04: should manter as opções do ICP que falam em nicho", () => {
    render(<PerfilContato contato={PERFIL} papel="admin" />)
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0])
    const opcoes = Array.from((screen.getByLabelText("ICP") as HTMLSelectElement).options).map((o) => o.textContent)
    expect(opcoes).toEqual(["Sem ICP", "Já revende este nicho", "Primeira vez no nicho"])
  })

  it("CA-B40-05: should mostrar a ficha do chat sem nicho, com os outros dados editáveis", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} podeEditar />)
    await waitFor(() => expect(screen.getByText("Fortaleza")).toBeTruthy())

    expect(screen.queryByText("Nicho")).toBeNull()
    expect(screen.queryByLabelText("Editar nicho")).toBeNull()

    fireEvent.click(screen.getByLabelText("Editar cidade"))
    const campo = screen.getByLabelText("Cidade") as HTMLInputElement
    fireEvent.change(campo, { target: { value: "Recife" } })
    fireEvent.keyDown(campo, { key: "Enter" })
    await waitFor(() => expect(screen.getByText("Recife")).toBeTruthy())
    expect(atualizar).toHaveBeenCalledWith("c-1", { nome: "Marcelle", tipo: "lojista", cidade: "Recife", uf: "CE", icp: "primeira_vez" })
  })

  it("CA-B40-06: should mostrar a tabela de contatos sem a coluna Nicho", () => {
    renderizarLista()
    const colunas = screen.getAllByRole("columnheader").map((th) => th.textContent).filter(Boolean)
    // B43-01: a coluna Perfil RFV entrou depois da Classificação.
    expect(colunas).toEqual(["Nome", "WhatsApp", "Classificação", "Perfil RFV", "Tipo", "Cidade", "Atendente"])
  })

  it("CA-B40-07: should mostrar os botões rápidos sem os de nicho", () => {
    renderizarLista()
    // B46-11: tipo e atendente ficam atrás de "Mais filtros"
    fireEvent.click(screen.getByRole("button", { name: "Mais filtros" }))
    expect(screen.queryByRole("button", { name: "Todos nichos" })).toBeNull()
    expect(screen.getAllByRole("button", { name: "Lojista" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Ativo" }).length).toBeGreaterThan(0)
  })

  it("CA-B40-08: should oferecer no filtro avançado os campos do cadastro sem Nicho, e filtrar pelos outros", async () => {
    renderizarLista()
    fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))
    const painel = screen.getByRole("dialog")

    const cadastro = within(painel).getAllByLabelText("Campo")[0].querySelector('optgroup[label="Cadastro"]')!
    const campos = Array.from(cadastro.querySelectorAll("option")).map((o) => o.textContent)
    expect(campos).not.toContain("Nicho")
    expect(campos).toContain("Cidade")

    fireEvent.change(within(painel).getAllByLabelText("Campo")[0], { target: { value: "cidade" } })
    fireEvent.change(within(painel).getAllByLabelText("Valor")[0], { target: { value: "Fortaleza" } })
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))

    await waitFor(() => expect(filtrarContatos).toHaveBeenCalled())
    const pedido = filtrarContatos.mock.calls.at(-1)![0] as { filtro: { grupos: Array<{ condicoes: Array<{ campo: string }> }> } }
    expect(pedido.filtro.grupos[0].condicoes[0].campo).toBe("cidade")
  })

  it("CA-B40-09: should recusar no servidor filtro e botão rápido com nicho", () => {
    const filtro = esquemaFiltro.safeParse({
      juncao: "e",
      grupos: [{ juncao: "e", condicoes: [{ campo: "nicho", comparacao: "e", valores: ["Moda"] }] }],
    })
    expect(filtro.success).toBe(false)
    expect(filtro.error?.issues.map((i) => i.message)).toContain("Campo desconhecido: nicho")

    const rapidos = esquemaRapidos.safeParse([{ campo: "nicho", comparacao: "e", valores: ["Moda"] }])
    expect(rapidos.success).toBe(false)

    // Os outros campos continuam valendo.
    expect(esquemaRapidos.safeParse([{ campo: "tipo", comparacao: "e", valores: ["lojista"] }]).success).toBe(true)
  })
})
