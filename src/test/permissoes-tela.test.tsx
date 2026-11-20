// B63-02 — Tela de Permissões: só o Admin vê o item e a página, a escolha atual vem
// marcada, salvar chama a action e o aviso de "Só os atribuídos a ele" aparece no bloco.
// As actions ficam mockadas; o servidor é conferido em permissoes-por-cargo.integration.test.ts.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const redirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  usePathname: () => "/configuracoes/permissoes",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/lib/aviso-na-tela", () => ({ avisar: vi.fn() }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: vi.fn(), trocarTema: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/configuracoes/permissoes/actions", () => ({
  carregarPermissoes: vi.fn(),
  salvarPermissoes: vi.fn(async () => ({})),
}))

import { sessaoAtual } from "@/lib/sessao"
import { avisar } from "@/lib/aviso-na-tela"
import { carregarPermissoes, salvarPermissoes } from "@/app/(auth)/configuracoes/permissoes/actions"
import PermissoesPage from "@/app/(auth)/configuracoes/permissoes/page"
import { SidebarNav } from "@/components/shared/sidebar-nav"

function comoPapel(role: string) {
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: {} as never,
    user: { id: "u-1" } as never,
    perfil: { id: "u-1", role, workspace_id: "w-1", name: "Ana" } as never,
  } as never)
}

async function abrirComoAdmin() {
  comoPapel("admin")
  vi.mocked(carregarPermissoes).mockResolvedValue({ atendente: "atribuidos_e_sem_dono", gerente: "todos" })
  render(await PermissoesPage())
}

const bloco = (cargo: string) => screen.getByRole("group", { name: cargo })
const AVISO = /Lead novo sem dono só aparece para quem vê os sem dono.*Atribuir ao time/

beforeEach(() => {
  vi.clearAllMocks()
  redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT")
  })
})

describe("B63-02 — Tela de Permissões", () => {
  it("CA-B63-01: should mostrar ao Admin Atendente e Gerente com a opção atual marcada e a linha fixa do Admin", async () => {
    await abrirComoAdmin()

    expect(within(bloco("Atendente")).getByRole("radio", { name: "Os dele e os sem dono" })).toBeChecked()
    expect(within(bloco("Atendente")).getByRole("radio", { name: "Só os atribuídos a ele" })).not.toBeChecked()
    expect(within(bloco("Gerente")).getByRole("radio", { name: "Todos da empresa" })).toBeChecked()

    const admin = screen.getByRole("region", { name: "Admin" })
    expect(admin).toHaveTextContent("Vê tudo da empresa")
    expect(within(admin).queryAllByRole("radio")).toHaveLength(0)
    expect(screen.getAllByRole("radio")).toHaveLength(6)
  })

  it("CA-B63-02: should esconder o item do menu do Gerente e do Atendente e não abrir a página para eles", async () => {
    const { unmount } = render(<SidebarNav papel="admin" nomeUsuario="Lu" email="l@x.com" atrasados={0} pedidosNovos={0} />)
    expect(screen.getByRole("link", { name: /Permissões/ })).toHaveAttribute("href", "/configuracoes/permissoes")
    unmount()

    for (const papel of ["gerente", "atendente"] as const) {
      const r = render(<SidebarNav papel={papel} nomeUsuario="X" email="x@x.com" atrasados={0} pedidosNovos={0} />)
      expect(screen.queryByRole("link", { name: /Permissões/ })).toBeNull()
      r.unmount()

      comoPapel(papel)
      redirect.mockClear()
      await expect(PermissoesPage()).rejects.toThrow("NEXT_REDIRECT")
      expect(redirect).toHaveBeenCalledWith("/perfil?motivo=sem-permissao")
    }
    expect(carregarPermissoes).not.toHaveBeenCalled()
  })

  it("CA-B63-03: should salvar a escolha nova e confirmar na tela", async () => {
    await abrirComoAdmin()
    const salvar = screen.getByRole("button", { name: "Salvar" })
    expect(salvar).toBeDisabled()

    fireEvent.click(within(bloco("Atendente")).getByRole("radio", { name: "Só os atribuídos a ele" }))
    fireEvent.click(salvar)

    await waitFor(() => expect(avisar).toHaveBeenCalledWith("Permissões salvas"))
    expect(salvarPermissoes).toHaveBeenCalledWith({ atendente: "atribuidos", gerente: "todos" })
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
  })

  it("CA-B63-06: should mostrar no bloco o aviso do lead sem dono ao marcar 'Só os atribuídos a ele'", async () => {
    await abrirComoAdmin()
    expect(within(bloco("Gerente")).queryByText(AVISO)).toBeNull()

    fireEvent.click(within(bloco("Gerente")).getByRole("radio", { name: "Só os atribuídos a ele" }))

    expect(within(bloco("Gerente")).getByText(AVISO)).toBeInTheDocument()
    expect(within(bloco("Atendente")).queryByText(AVISO)).toBeNull()
  })
})
