// B22-19 — ?regra= do endereço que não é de nenhuma automação conhecida (achado
// M16 do QA das automações, 09/10/2026): o filtro é ignorado e a página avisa, em
// vez de consultar com ele e mostrar a lista vazia. As actions são falsas.

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ReactElement } from "react"

vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/app/(auth)/configuracoes/automacoes/opcoes-editor", () => ({ carregarOpcoesEditor: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/configuracoes/automacoes/actions", () => ({
  listarExecucoes: vi.fn(async () => ({ execucoes: [] })),
  regrasDoFiltroDoHistorico: vi.fn(async () => [{ id: "r1", nome: "Boas-vindas" }]),
}))

import { sessaoAtual } from "@/lib/sessao"
import { listarExecucoes } from "@/app/(auth)/configuracoes/automacoes/actions"
import HistoricoAutomacoesPage from "@/app/(auth)/configuracoes/automacoes/historico/page"

beforeEach(() => {
  vi.mocked(listarExecucoes).mockClear()
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: {},
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
})

/** Props que a página passa ao HistoricoClient. */
async function propsDaPagina(regra?: string) {
  const pagina = (await HistoricoAutomacoesPage({ searchParams: Promise.resolve({ regra }) })) as ReactElement<{
    children: ReactElement<{ filtros: { regraId?: string }; aviso?: string }>
  }>
  return pagina.props.children.props
}

describe("B22-19 — ?regra= desconhecida", () => {
  it("ignora o filtro e avisa", async () => {
    const props = await propsDaPagina("nao-e-uuid")
    expect(props.filtros.regraId).toBeUndefined()
    expect(props.aviso).toBe("A automação do endereço não foi encontrada. Mostrando todas.")
    expect(vi.mocked(listarExecucoes).mock.calls[0][0].regraId).toBeUndefined()
  })

  it("regra conhecida filtra, sem aviso", async () => {
    const props = await propsDaPagina("r1")
    expect(props.filtros.regraId).toBe("r1")
    expect(props.aviso).toBeUndefined()
  })
})
