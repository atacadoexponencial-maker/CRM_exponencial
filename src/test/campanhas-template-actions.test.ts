// B54-04 — o servidor da campanha lista só os templates aprovados do número escolhido,
// e o Gerente vê templates como o Admin (tela e campanha). O banco e a Meta são falsos.

import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Linha = Record<string, unknown>
const conexoes: Linha[] = []
let papel = "admin"

vi.mock("@/lib/sessao", () => ({
  sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: papel, workspace_id: "w-1" }, supabase: {} })),
}))
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const filtros: Array<[string, unknown]> = []
      let limite = Infinity
      const consulta = {
        select: () => consulta,
        eq: (coluna: string, valor: unknown) => { filtros.push([coluna, valor]); return consulta },
        limit: (n: number) => { limite = n; return consulta },
        maybeSingle: async () => {
          const linhas = conexoes.filter((l) => filtros.every(([c, v]) => l[c] === v)).slice(0, limite)
          if (linhas.length > 1) return { data: null, error: { message: "multiple rows" } }
          return { data: linhas[0] ?? null, error: null }
        },
      }
      return consulta
    },
  }),
}))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/fuso-da-empresa", () => ({ fusoDaEmpresa: async () => "America/Sao_Paulo" }))

import { templatesParaCampanha } from "@/app/(auth)/campanhas/actions"
import { listarTemplates } from "@/app/(auth)/configuracoes/templates/actions"

const META = {
  "waba-1": [
    { id: "t1", name: "promo", status: "APPROVED", category: "MARKETING", language: "pt_BR", components: [{ type: "BODY", text: "Oi {{1}}" }] },
    { id: "t2", name: "pendente", status: "PENDING", category: "MARKETING", language: "pt_BR" },
    { id: "t3", name: "rejeitado", status: "REJECTED", category: "UTILITY", language: "pt_BR", rejected_reason: "INVALID_FORMAT" },
    { id: "t4", name: "codigo", status: "APPROVED", category: "AUTHENTICATION", language: "pt_BR" },
  ],
  "waba-2": [{ id: "t9", name: "do_outro_numero", status: "APPROVED", category: "MARKETING", language: "pt_BR" }],
}

beforeEach(() => {
  papel = "admin"
  conexoes.length = 0
  conexoes.push(
    { id: "c-oficial", workspace_id: "w-1", canal: "meta", waba_id: "waba-1", access_token: "tk-1" },
    { id: "c-oficial-2", workspace_id: "w-1", canal: "meta", waba_id: "waba-2", access_token: "tk-2" },
    { id: "c-chip", workspace_id: "w-1", canal: "gateway", waba_id: null, access_token: null },
    { id: "c-outra-empresa", workspace_id: "w-2", canal: "meta", waba_id: "waba-9", access_token: "tk-9" },
  )
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const waba = (Object.keys(META) as Array<keyof typeof META>).find((w) => String(url).includes(`/${w}/message_templates`))
    return new Response(JSON.stringify({ data: waba ? META[waba] : [] }))
  }))
})
afterEach(() => vi.unstubAllGlobals())

describe("B54-04 — templates da campanha no servidor", () => {
  it("CA-B54-14: should devolver só o aprovado do número escolhido, sem pendente, rejeitado, autenticação nem os do outro número", async () => {
    const { templates, erro } = await templatesParaCampanha("c-oficial")
    expect(erro).toBeUndefined()
    expect(templates.map((t) => t.name)).toEqual(["promo"])
    expect(templates[0].partes?.corpo).toBe("Oi {{1}}")
    const url = String((vi.mocked(fetch).mock.calls[0] as unknown[])[0])
    expect(url).toContain("/waba-1/message_templates")
    expect(url).toContain("access_token=tk-1")

    expect((await templatesParaCampanha("c-oficial-2")).templates.map((t) => t.name)).toEqual(["do_outro_numero"])
    // canal direto e número de outra empresa: nada, e a Meta nem é consultada
    vi.mocked(fetch).mockClear()
    expect((await templatesParaCampanha("c-chip")).templates).toEqual([])
    expect((await templatesParaCampanha("c-outra-empresa")).templates).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("CA-B54-22: should dar ao Gerente a tela de templates e a lista da campanha, e nada ao Atendente", async () => {
    papel = "gerente"
    const tela = await listarTemplates()
    expect(tela.erro).toBeUndefined()
    expect(tela.templates.map((t) => t.name)).toEqual(["promo", "pendente", "rejeitado", "codigo"])
    expect((await templatesParaCampanha("c-oficial")).templates.map((t) => t.name)).toEqual(["promo"])

    papel = "atendente"
    vi.mocked(fetch).mockClear()
    expect((await listarTemplates()).templates).toEqual([])
    expect((await templatesParaCampanha("c-oficial")).templates).toEqual([])
    expect(fetch).not.toHaveBeenCalled()

    // o menu lateral e a página aceitam o gerente
    const menu = readFileSync("src/components/shared/sidebar-nav.tsx", "utf8")
    expect(menu).toMatch(/configuracoes\/templates"[^\n]*papeis: \["admin", "gerente"\]/)
    const pagina = readFileSync("src/app/(auth)/configuracoes/templates/page.tsx", "utf8")
    expect(pagina).toContain('["admin", "gerente"].includes(perfil.role)')
  })
})
