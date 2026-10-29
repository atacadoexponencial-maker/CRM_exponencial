// B28-06 — fim das sequências: o menu e as telas não falam mais nelas, `/sequencias`
// leva para as automações, o editor não oferece mais a ação, a regra antiga que a
// tem fica marcada no editor e recusada no Salvar, e a empresa nova nasce sem
// sequência. Sem rede: a sessão e o banco são falsos.

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/pipeline", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "10.0.0.1" }) }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: vi.fn(), trocarTema: vi.fn(async () => ({})) }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/lib/limite-de-tentativas", () => ({
  chaveDoIp: () => "ip",
  chaveDoUsuario: () => "u",
  ipDaRequisicao: async () => "10.0.0.1",
  passouDoLimite: async () => false,
  registrarTentativa: async () => {},
}))

import nextConfig from "../../next.config"
import { createServiceClient } from "@/integrations/supabase/service"
import { createClient } from "@/integrations/supabase/server"
import { sessaoAtual } from "@/lib/sessao"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { ACAO_REMOVIDA, type Fluxo } from "@/lib/fluxo-automacao"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import { AgendaEquipeClient } from "@/app/(auth)/agenda/equipe/agenda-equipe-client"
import { cadastrarEmpresa } from "@/app/cadastro/actions"
import { salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import { MenuNovoBloco } from "@/app/(auth)/configuracoes/automacoes/components/menu-novo-bloco"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const RAIZ = path.resolve(__dirname, "../..")
const fonte = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo), "utf8")
const posicao = { x: 0, y: 0 }

const OPCOES: OpcoesEditor = {
  etiquetas: [],
  atendentes: [],
  tags: [],
  times: [],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("B28-06 — o menu e as telas não falam mais em sequência", () => {
  it("CA-B28-31: o menu do admin não tem 'Sequências'", () => {
    render(<SidebarNav papel="admin" nomeUsuario="Ana" email="ana@exemplo.com" atrasados={0} pedidosNovos={0} />)
    const menu = screen.getByRole("navigation", { name: "Menu principal" })
    expect(within(menu).queryByText(/Sequências/)).toBeNull()
    expect(within(menu).getAllByRole("link").map((l) => l.getAttribute("href"))).not.toContain("/sequencias")
  })

  it("CA-B28-31: a Agenda da equipe não tem o quadro de sequências", () => {
    render(<AgendaEquipeClient itensIniciais={[]} atendentes={[]} />)
    expect(screen.queryByText(/sequência/i)).toBeNull()
  })

  it("CA-B28-31: o card do funil, o perfil do contato e a central de alertas não têm 'Iniciar sequência'", () => {
    for (const arquivo of [
      "src/app/(auth)/pipeline/components/painel-card.tsx",
      "src/app/(auth)/contatos/[id]/components/perfil-contato.tsx",
      "src/app/(auth)/alertas/alertas-client.tsx",
    ]) {
      expect(fonte(arquivo), arquivo).not.toMatch(/Iniciar sequência|IniciarSequencia|>\s*Sequência\s*</)
    }
    expect(existsSync(path.join(RAIZ, "src/components/shared/iniciar-sequencia-dialog.tsx"))).toBe(false)
    expect(existsSync(path.join(RAIZ, "src/app/(auth)/sequencias"))).toBe(false)
  })

  it("CA-B28-31: abrir /sequencias, ou um endereço dentro dele, leva para as automações", async () => {
    const regras = await nextConfig.redirects!()
    const para = (endereco: string) =>
      regras.find((r) => r.source === endereco || (r.source.endsWith("/:path*") && endereco.startsWith(r.source.replace("/:path*", "/"))))
    expect(para("/sequencias")?.destination).toBe("/configuracoes/automacoes")
    expect(para("/sequencias/nova")?.destination).toBe("/configuracoes/automacoes")
  })
})

describe("B28-06 — as ações de sequência saem do editor", () => {
  it("CA-B28-33: o menu de novo bloco não tem 'Iniciar sequência'", () => {
    render(<MenuNovoBloco aberto saida={null} onFechar={vi.fn()} onEscolher={vi.fn()} />)
    const menu = screen.getByRole("dialog")
    expect(within(menu).queryByText(/sequência/i)).toBeNull()
    expect(within(menu).getByRole("button", { name: /Mover card/ })).toBeTruthy()
  })

  it("CA-B28-33: a lista 'Fazer' não oferece 'Iniciar sequência', e o 'mover card' não tem a opção da etapa", async () => {
    render(
      <PainelBloco
        bloco={{ id: "a", tipo: "acao", acao: "mover_card", parametros: { funil: "entrada", etapa: "catalogo_enviado" }, posicao }}
        gatilho="conversa_criada"
        repeticao={{ modo: "sempre" }}
        onMudarRepeticao={vi.fn()}
        opcoes={OPCOES}
        pendencias={[]}
        guardarArquivo={vi.fn()}
        onMudar={vi.fn()}
        onRemover={vi.fn()}
        onDuplicar={vi.fn()}
        onFechar={vi.fn()}
      />
    )
    expect(screen.queryByText(/Iniciar a sequência desta etapa/)).toBeNull()
    expect(screen.queryByRole("checkbox")).toBeNull()

    fireEvent.click(screen.getByRole("combobox", { name: "Fazer" }))
    const opcoes = (await screen.findAllByRole("option")).map((o) => o.textContent)
    expect(opcoes.length).toBeGreaterThan(5)
    expect(opcoes.some((o) => /sequência/i.test(o ?? ""))).toBe(false)
  })
})

describe("B28-06 — regra antiga com 'iniciar sequência'", () => {
  const regraAntiga: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { id: "seq", tipo: "acao", acao: "iniciar_sequencia", parametros: { sequencia_id: "seq-1" }, posicao: { x: 0, y: 150 } },
    ],
    ligacoes: [{ de: "g", saida: "proximo", para: "seq" }],
  }

  it("CA-B28-34: o editor aponta a pendência no bloco e o Salvar não grava", async () => {
    const salvar = vi.fn(async () => ({}))
    render(
      <EditorFluxo
        regraInicial={{ nome: "Antiga", repeticao: { modo: "uma_vez_por_contato" }, fluxo: regraAntiga }}
        opcoes={OPCOES}
        buscarContatos={vi.fn(async () => [])}
        salvar={salvar}
        simular={vi.fn()}
        guardarArquivo={vi.fn()}
        onVoltar={vi.fn()}
        chaveRascunho="teste:b28-06"
        regraNova={false}
      />
    )
    const bloco = document.querySelector(".react-flow__node-acao") as HTMLElement
    expect(bloco.textContent).toContain(ACAO_REMOVIDA)

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    expect(salvar).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("Corrija o bloco marcado")
  })

  it("CA-B28-34: o servidor recusa salvar a regra com a ação que saiu", async () => {
    const insert = vi.fn()
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from: vi.fn(() => ({ insert })) },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

    expect(await salvarRegra({ id: null, nome: "Antiga", fluxo: regraAntiga, repeticao: { modo: "sempre" } })).toEqual({
      erro: ACAO_REMOVIDA,
    })
    expect(insert).not.toHaveBeenCalled()
  })
})

describe("B28-06 — empresa nova", () => {
  it("CA-B28-35: o cadastro cria a empresa sem tocar nas sequências", async () => {
    const from = vi.fn<(tabela: string) => unknown>((tabela) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "insert", "upsert", "update", "in", "limit", "order", "is", "gt"]) obj[m] = vi.fn(() => obj)
      // B51-02: o convite do link vale
      obj.maybeSingle = vi.fn(async () => ({ data: tabela === "convites" ? { email: null } : null, error: null }))
      obj.single = obj.maybeSingle
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve)
      return obj
    })
    const rpc = vi.fn(async () => ({ data: "ws-nova", error: null }))
    vi.mocked(createServiceClient).mockReturnValue({
      from,
      rpc,
      auth: { admin: { createUser: vi.fn(async () => ({ data: { user: { id: "u-novo" } }, error: null })), deleteUser: vi.fn() } },
    } as unknown as ReturnType<typeof createServiceClient>)
    vi.mocked(createClient).mockResolvedValue({
      auth: { signInWithPassword: vi.fn(async () => ({ error: null })) },
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const resultado = await cadastrarEmpresa({
      nomeEmpresa: "Empresa Nova",
      nomeResponsavel: "Bia",
      email: "bia@empresa-nova.com",
      senha: "senha-forte-123",
      confirmarSenha: "senha-forte-123",
      conferencia: "XXXX.DUMMY.TOKEN.XXXX", // B50-02: conferência de teste do Turnstile
      convite: "convite-de-teste", // B51-02
    })

    expect(resultado).toEqual({ ok: true })
    expect(rpc).toHaveBeenCalledWith("cadastrar_empresa_com_convite", expect.anything())
    expect(from.mock.calls.map(([tabela]) => String(tabela)).filter((t) => t.startsWith("sequence"))).toEqual([])
  })
})
