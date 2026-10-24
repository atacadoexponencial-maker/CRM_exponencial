// B40-02 — o nicho sai da segmentação de campanhas e das automações (gatilho e
// ação de dado do contato). Na campanha, a tela é conferida com as actions
// mockadas e a contagem do servidor com banco falso; nas automações, as opções
// que o editor mostra e as validações que o salvar usa.

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as AcoesDeCampanha from "@/app/(auth)/campanhas/actions"

const contar = vi.fn<(...a: unknown[]) => Promise<{ total: number; amostra: unknown[] }>>(async () => ({ total: 0, amostra: [] }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn(async () => 0) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/app/(auth)/campanhas/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof AcoesDeCampanha>()),
  contarDestinatarios: (...a: unknown[]) => contar(...a),
  avaliarDisparo: vi.fn(async () => null),
  confirmarCampanha: vi.fn(),
  salvarRascunho: vi.fn(),
  uploadArquivoCampanha: vi.fn(),
}))

import { sessaoAtual } from "@/lib/sessao"
import { EditorCampanhaClient } from "@/app/(auth)/campanhas/[id]/editor-campanha-client"
import { GATILHOS, ACOES, opcoesDaFonte, type FonteOpcoes, type OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { dadoDoContatoValido, gatilhoDeDadoValido } from "@/lib/automacoes/referencias"

const OPCOES_EDITOR = {
  etiquetas: [], atendentes: [], tags: [], times: [], sequencias: [], mensagensRapidas: [], numeros: [],
} as unknown as OpcoesEditor

/** Nomes que o seletor "Campo" do bloco mostra. */
function camposDoBloco(campos: Array<{ chave: string; fonte?: FonteOpcoes }>): string[] {
  const campo = campos.find((c) => c.chave === "campo")!
  return opcoesDaFonte(campo.fonte!, OPCOES_EDITOR).map((o) => o.nome)
}

/**
 * Banco falso da contagem: guarda o filtro que chegou à função do banco e devolve os
 * contatos lojistas. B42-02: a campanha conta pelo filtro de Contatos (filtrar_contatos).
 */
function bancoDaContagem() {
  const pedido: { filtro?: unknown } = {}
  const linhas = [
    { id: "c-1", name: "Loja A", phone_number: "5511999990001", classificacao: "lead", tipo: "lojista", cidade: "Recife", uf: null, created_at: "2026-10-20T10:00:00Z", atendente_nome: null, total: 2 },
    { id: "c-2", name: "Loja B", phone_number: "5511999990002", classificacao: "lead", tipo: "lojista", cidade: "Natal", uf: null, created_at: "2026-10-20T10:00:00Z", atendente_nome: null, total: 2 },
  ]
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: {
      rpc: vi.fn(async (_nome: string, args: { p_filtro: unknown }) => { pedido.filtro = args.p_filtro; return { data: linhas, error: null } }),
    },
    user: { id: "u-1" },
    perfil: { id: "u-1", workspace_id: "ws-1", role: "admin" },
  } as never)
  return pedido
}

beforeEach(() => {
  contar.mockClear()
})

describe("B40-02 — nicho sai de campanhas e automações", () => {
  it("CA-B40-10: should segmentar a campanha sem o grupo Nicho e contar o público pelos outros filtros", async () => {
    render(<EditorCampanhaClient campanha={null} opcoes={{ atendentes: [], etiquetas: ["vip"], funis: [] }} numeros={[]} />)

    // B42-02: a etapa Destinatários usa o painel do filtro de Contatos, sem Nicho.
    fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))
    const campos = Array.from(screen.getByLabelText("Campo").querySelectorAll("option")).map((o) => o.textContent)
    expect(campos).not.toContain("Nicho")
    expect(campos).toContain("Classificação")
    expect(campos).toContain("Tipo")
    expect(campos).toContain("Etiqueta")

    // No servidor, o público por tipo sai do banco sem nicho no filtro.
    const porTipo = { juncao: "e" as const, grupos: [{ juncao: "e" as const, condicoes: [{ campo: "tipo", comparacao: "e" as const, valores: ["lojista"] }] }] }
    const pedido = bancoDaContagem()
    const { contarDestinatarios } = await vi.importActual<typeof AcoesDeCampanha>("@/app/(auth)/campanhas/actions")
    const resultado = await contarDestinatarios({ filtro: porTipo })
    expect(resultado.total).toBe(2)
    expect(resultado.amostra.map((d) => d.id)).toEqual(["c-1", "c-2"])
    expect(JSON.stringify(pedido.filtro)).not.toContain("nicho")
    expect(pedido.filtro).toEqual(porTipo)
  })

  it("CA-B40-11: should oferecer no gatilho de dado alterado só classificação, tipo e cidade", () => {
    expect(camposDoBloco(GATILHOS.dado_contato_alterado.campos)).toEqual(["Classificação", "Tipo", "Cidade"])
  })

  it("CA-B40-12: should oferecer na ação de alterar dado só tipo, cidade e observações", () => {
    expect(camposDoBloco(ACOES.alterar_dado_contato.campos)).toEqual(["Tipo", "Cidade", "Observações (acrescentar linha)"])
  })

  it("CA-B40-13: should recusar ao salvar gatilho ou ação que usa nicho", () => {
    expect(gatilhoDeDadoValido("nicho", "")).toBe(false)
    expect(gatilhoDeDadoValido("nicho", "Moda")).toBe(false)
    expect(dadoDoContatoValido("nicho", "Moda")).toBe(false)

    // Os outros campos continuam valendo.
    expect(gatilhoDeDadoValido("cidade", "Recife")).toBe(true)
    expect(dadoDoContatoValido("cidade", "Recife")).toBe(true)
  })
})
