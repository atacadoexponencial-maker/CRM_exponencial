// B53-08 — templates: a lista vem do número da API Oficial mesmo com chip na empresa,
// o erro da Meta aparece, a tela mostra o nome final e o servidor confere o nome.
// O banco e a Meta são falsos: o cliente falso aplica os filtros como o PostgREST.

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type Linha = Record<string, unknown>
const conexoes: Linha[] = []

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: "admin", workspace_id: "w-1" } })) }))
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
          if (linhas.length > 1) return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } }
          return { data: linhas[0] ?? null, error: null }
        },
      }
      return consulta
    },
  }),
}))

import { criarTemplate, listarTemplates } from "@/app/(auth)/configuracoes/templates/actions"
import { TemplatesClient } from "@/app/(auth)/configuracoes/templates/templates-client"

afterEach(() => {
  conexoes.length = 0
  vi.unstubAllGlobals()
})

describe("B53-08 — templates com chip e API Oficial", () => {
  it("CA-B53-15: should listar os templates do número da API Oficial quando a empresa também tem chip", async () => {
    conexoes.push(
      { workspace_id: "w-1", canal: "gateway", waba_id: null, access_token: null },
      { workspace_id: "w-1", canal: "meta", waba_id: "waba-oficial", access_token: "tk-oficial" },
      { workspace_id: "w-2", canal: "meta", waba_id: "waba-outra", access_token: "tk-outra" },
    )
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({
      data: [{ id: "t1", name: "boas_vindas", status: "APPROVED", category: "UTILITY", language: "pt_BR" }],
    })))
    vi.stubGlobal("fetch", fetchFalso)

    const { templates, erro } = await listarTemplates()

    expect(fetchFalso).toHaveBeenCalledTimes(1)
    const url = String((fetchFalso.mock.calls[0] as unknown[])[0])
    expect(url).toContain("/waba-oficial/message_templates")
    expect(url).toContain("access_token=tk-oficial")
    expect(erro).toBeUndefined()
    expect(templates.map((t) => t.name)).toEqual(["boas_vindas"])
  })

  it("CA-B53-16: should devolver e mostrar 'Não foi possível carregar os templates da Meta' quando a Meta responde erro", async () => {
    conexoes.push({ workspace_id: "w-1", canal: "meta", waba_id: "waba-oficial", access_token: "tk-oficial" })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Invalid OAuth access token" } }), { status: 400 })))

    const resultado = await listarTemplates()
    expect(resultado.erro).toBe("Não foi possível carregar os templates da Meta")
    expect(resultado.templates).toEqual([])

    render(<TemplatesClient templates={resultado.templates} erroAoCarregar={resultado.erro} />)
    expect(screen.getByText("Não foi possível carregar os templates da Meta")).toBeTruthy()
    expect(screen.queryByText("Nenhum template criado ainda.")).toBeNull()
  })

  it("CA-B53-17: should mostrar teste_luan como nome enviado ao digitar 'Teste Luan'", async () => {
    render(<TemplatesClient templates={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "Novo template" }))
    const campo = (await screen.findByLabelText("Nome")) as HTMLInputElement
    fireEvent.change(campo, { target: { value: "Teste Luan" } })
    expect(screen.getByText(/Será enviado como/).textContent).toBe("Será enviado como teste_luan")
  })

  it("CA-B53-18: should recusar no servidor o nome 'Promoção-Já' com a mensagem do que é aceito, sem chamar a Meta", async () => {
    conexoes.push({ workspace_id: "w-1", canal: "meta", waba_id: "waba-oficial", access_token: "tk-oficial" })
    const fetchFalso = vi.fn()
    vi.stubGlobal("fetch", fetchFalso)

    const resultado = await criarTemplate({ name: "Promoção-Já", category: "MARKETING", language: "pt_BR", body: "Oi" })

    expect(resultado.erro).toBe("Nome deve conter apenas letras minúsculas, números e underscores")
    expect(fetchFalso).not.toHaveBeenCalled()
  })
})
