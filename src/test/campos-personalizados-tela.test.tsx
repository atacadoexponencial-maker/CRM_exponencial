// B38-01 — campos personalizados na tela: menu e página só para Admin e Gerente, tela
// vazia, tipo só para leitura, e o bloco do perfil do contato (ordem, formatos, erros e
// quem edita). As actions ficam mockadas; o servidor é conferido em
// campos-personalizados.integration.test.ts.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"
import type { CampoComValor } from "@/app/(auth)/contatos/campos-personalizados"
import type { CampoParaGerenciar } from "@/app/(auth)/configuracoes/campos/actions"

const redirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  usePathname: () => "/contatos",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: vi.fn(), trocarTema: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
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
// B38-09: o Salvar do editor; o resto das actions segue o de verdade (o CA-B38-03 usa).
const renomearCampo = vi.fn()
const renomearOpcao = vi.fn()
vi.mock("@/app/(auth)/configuracoes/campos/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/(auth)/configuracoes/campos/actions")>()),
  renomearCampo: (...a: unknown[]) => renomearCampo(...a),
  renomearOpcao: (...a: unknown[]) => renomearOpcao(...a),
}))
const salvarCamposDoContato = vi.fn()
vi.mock("@/app/(auth)/contatos/campos-personalizados", () => ({
  salvarCamposDoContato: (...a: unknown[]) => salvarCamposDoContato(...a),
}))

import { sessaoAtual } from "@/lib/sessao"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import CamposPage from "@/app/(auth)/configuracoes/campos/page"
import { CamposClient } from "@/app/(auth)/configuracoes/campos/campos-client"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"

function comoPapel(role: string) {
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: {},
    user: { id: "u-1" },
    perfil: { role, workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
}

const contato: ContatoPerfil = {
  id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv: null,
  icp: null, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
}

const VAZIO = { texto: null, numero: null, data: null, booleano: null, opcoes: null }
const PORTE = { id: "p", nome: "Porte", tipo: "lista" as const, opcoes: [{ id: "o-p", nome: "Pequeno" }, { id: "o-g", nome: "Grande" }] }

function abrirPerfil(campos: CampoComValor[], papel = "admin") {
  return render(<PerfilContato contato={contato} contactId="c-1" papel={papel} camposPersonalizados={campos} />)
}

const bloco = () => screen.getByRole("region", { name: "Campos personalizados" })
const linhas = () => Array.from(bloco().querySelectorAll("[data-campo]")) as HTMLElement[]

beforeEach(() => {
  redirect.mockClear()
  salvarCamposDoContato.mockReset()
})

describe("B38-01 — campos personalizados na tela", () => {
  it("CA-B38-03: should esconder do Atendente o menu e a página, e recusar as ações de gerenciar", async () => {
    const { unmount } = render(<SidebarNav papel="atendente" nomeUsuario="Ana" email="a@x.com" atrasados={0} pedidosNovos={0} />)
    expect(screen.queryByRole("link", { name: /Campos personalizados/ })).toBeNull()
    unmount()
    render(<SidebarNav papel="gerente" nomeUsuario="Gil" email="g@x.com" atrasados={0} pedidosNovos={0} />)
    expect(screen.getByRole("link", { name: /Campos personalizados/ })).toHaveAttribute("href", "/configuracoes/campos")

    comoPapel("atendente")
    redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT") })
    await expect(CamposPage()).rejects.toThrow("NEXT_REDIRECT")
    expect(redirect).toHaveBeenCalledWith("/perfil?motivo=sem-permissao")

    const acoes = await vi.importActual<typeof import("@/app/(auth)/configuracoes/campos/actions")>("@/app/(auth)/configuracoes/campos/actions")
    const id = "11111111-1111-4111-8111-111111111111"
    expect(await acoes.criarCampo("CNPJ", "texto")).toEqual({ erro: "Sem permissão" })
    expect(await acoes.renomearCampo(id, "CNPJ da loja")).toEqual({ erro: "Sem permissão" })
    expect(await acoes.adicionarOpcao(id, "Rede")).toEqual({ erro: "Sem permissão" })
    expect(await acoes.renomearOpcao(id, id, "Rede")).toEqual({ erro: "Sem permissão" })
    expect(await acoes.moverOpcao(id, id, "subir")).toEqual({ erro: "Sem permissão" })
    expect(await acoes.listarCamposParaGerenciar()).toEqual([])
  })

  it("CA-B38-15: should explicar para que servem os campos e mostrar Criar campo quando não há nenhum", () => {
    render(<CamposClient campos={[]} />)
    expect(screen.getByText("Nenhum campo criado ainda")).toBeInTheDocument()
    expect(screen.getByText(/guardar o que a empresa precisa saber de cada contato/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Criar campo" }))
    expect(screen.getByRole("region", { name: "Novo campo" })).toBeInTheDocument()
  })

  it("CA-B38-08: should mostrar o tipo só para leitura no editor do campo", () => {
    const campo: CampoParaGerenciar = { id: "q", nome: "Quantidade de lojas", tipo: "numero", ordem: 0, opcoes: [], preenchidos: 2 }
    render(<CamposClient campos={[campo]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    const editor = screen.getByRole("region", { name: "Editar Quantidade de lojas" })
    const tipo = editor.querySelector("[data-tipo-somente-leitura]") as HTMLElement
    expect(tipo).toHaveTextContent("Número")
    expect(tipo.tagName).toBe("P")
    expect(within(editor).queryByRole("combobox")).toBeNull()
    expect(within(editor).getByText("O tipo não muda depois de criado.")).toBeInTheDocument()
  })

  it("CA-B38-67: should gravar o nome do campo e da opção no Salvar e fechar o editor; Cancelar fecha sem gravar", async () => {
    renomearCampo.mockReset().mockResolvedValue({})
    renomearOpcao.mockReset().mockResolvedValue({})
    const campo: CampoParaGerenciar = { id: "p", nome: "Porte", tipo: "lista", ordem: 0, opcoes: [{ id: "o-p", nome: "Pequeno", ordem: 0 }], preenchidos: 0 }
    render(<CamposClient campos={[campo]} />)

    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    let editor = screen.getByRole("region", { name: "Editar Porte" })
    fireEvent.change(within(editor).getByLabelText("Nome do campo"), { target: { value: "Porte da loja" } })
    fireEvent.change(within(editor).getByLabelText("Nome da opção 1"), { target: { value: "Pequena" } })
    fireEvent.click(within(editor).getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("region", { name: "Editar Porte" })).toBeNull()
    expect(renomearCampo).not.toHaveBeenCalled()
    expect(renomearOpcao).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    editor = screen.getByRole("region", { name: "Editar Porte" })
    fireEvent.change(within(editor).getByLabelText("Nome do campo"), { target: { value: "Porte da loja" } })
    fireEvent.change(within(editor).getByLabelText("Nome da opção 1"), { target: { value: "Pequena" } })
    fireEvent.click(within(editor).getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(screen.queryByRole("region", { name: "Editar Porte" })).toBeNull())
    expect(renomearCampo).toHaveBeenCalledWith("p", "Porte da loja")
    expect(renomearOpcao).toHaveBeenCalledWith("p", "o-p", "Pequena")
  })

  it("CA-B38-17: should mostrar no perfil os campos na ordem da empresa, com os valores e — no vazio", () => {
    abrirPerfil([
      { id: "c", nome: "CNPJ", tipo: "texto", opcoes: [], valor: { ...VAZIO, texto: "12.345.678/0001-90" } },
      { ...PORTE, valor: { ...VAZIO, opcoes: ["o-g"] } },
      { id: "i", nome: "Instagram da loja", tipo: "link", opcoes: [], valor: null },
    ])
    expect(linhas().map((l) => l.getAttribute("data-campo"))).toEqual(["CNPJ", "Porte", "Instagram da loja"])
    expect(linhas()[0]).toHaveTextContent("12.345.678/0001-90")
    expect(linhas()[1]).toHaveTextContent("Grande")
    expect(linhas()[2]).toHaveTextContent("—")
  })

  it("CA-B38-22: should mostrar cada valor no formato do tipo e abrir o link em outra aba", () => {
    abrirPerfil([
      { id: "d", nome: "Limite", tipo: "dinheiro", opcoes: [], valor: { ...VAZIO, numero: 1500.5 } },
      { id: "a", nome: "Aniversário da loja", tipo: "data", opcoes: [], valor: { ...VAZIO, data: "2026-04-03" } },
      { id: "s", nome: "Loja física", tipo: "sim_nao", opcoes: [], valor: { ...VAZIO, booleano: true } },
      {
        id: "m", nome: "Linhas", tipo: "multipla", opcoes: [{ id: "j", nome: "Jeans" }, { id: "k", nome: "Malha" }, { id: "p", nome: "Praia" }],
        valor: { ...VAZIO, opcoes: ["j", "k"] },
      },
      { id: "l", nome: "Instagram", tipo: "link", opcoes: [], valor: { ...VAZIO, texto: "https://instagram.com/loja" } },
    ])
    const [dinheiro, data, simNao, multipla, link] = linhas()
    expect(within(dinheiro).getByRole("definition").textContent!.replace(/\s/g, " ")).toBe("R$ 1.500,50")
    expect(data).toHaveTextContent("03/04/2026")
    expect(simNao).toHaveTextContent("Sim")
    expect(multipla).toHaveTextContent("Jeans, Malha")
    const a = within(link).getByRole("link", { name: "https://instagram.com/loja" })
    expect(a).toHaveAttribute("href", "https://instagram.com/loja")
    expect(a).toHaveAttribute("target", "_blank")
  })

  it("CA-B38-21: should apontar na tela cada valor fora do formato e não chamar o servidor", async () => {
    abrirPerfil([
      { id: "n", nome: "Lojas", tipo: "numero", opcoes: [], valor: null },
      { id: "d", nome: "Limite", tipo: "dinheiro", opcoes: [], valor: null },
      { id: "e", nome: "E-mail do financeiro", tipo: "email", opcoes: [], valor: null },
      { id: "l", nome: "Site", tipo: "link", opcoes: [], valor: null },
      { id: "t", nome: "Telefone do financeiro", tipo: "telefone", opcoes: [], valor: null },
    ])
    // B48-19: um Editar só abre os dados e os campos personalizados
    fireEvent.click(within(screen.getByText("Dados do contato").closest("section") as HTMLElement).getByRole("button", { name: "Editar" }))
    fireEvent.change(screen.getByLabelText("Lojas"), { target: { value: "abc" } })
    fireEvent.change(screen.getByLabelText("Limite"), { target: { value: "12,345" } })
    fireEvent.change(screen.getByLabelText("E-mail do financeiro"), { target: { value: "fulano@" } })
    fireEvent.change(screen.getByLabelText("Site"), { target: { value: "não é link" } })
    fireEvent.change(screen.getByLabelText("Telefone do financeiro"), { target: { value: "123" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(screen.getByLabelText("Lojas")).toHaveAttribute("aria-invalid", "true"))
    for (const rotulo of ["Limite", "E-mail do financeiro", "Site", "Telefone do financeiro"]) {
      expect(screen.getByLabelText(rotulo)).toHaveAttribute("aria-invalid", "true")
    }
    expect(screen.getByText("Digite um número.")).toBeInTheDocument()
    expect(screen.getByText("E-mail inválido.")).toBeInTheDocument()
    expect(salvarCamposDoContato).not.toHaveBeenCalled()
  })

  it("CA-B38-19: should deixar o Atendente editar os campos personalizados, sem mexer nos dados fixos", () => {
    abrirPerfil([{ id: "c", nome: "CNPJ", tipo: "texto", opcoes: [], valor: null }], "atendente")
    // B48-19: o Editar é um só; para o Atendente ele abre só os campos personalizados
    fireEvent.click(within(screen.getByText("Dados do contato").closest("section") as HTMLElement).getByRole("button", { name: "Editar" }))
    expect(screen.getByLabelText("CNPJ")).toBeInTheDocument()
    expect(screen.queryByLabelText("Cidade")).toBeNull()
  })

  it("CA-B38-24: should esconder o bloco quando a empresa não tem campos", () => {
    abrirPerfil([])
    expect(screen.queryByRole("region", { name: "Campos personalizados" })).toBeNull()
    expect(screen.queryByText("Campos personalizados")).toBeNull()
  })
})
