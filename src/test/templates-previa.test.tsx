// B54-01 — templates: o botão Ver abre a prévia com o conteúdo real que está na Meta
// (cabeçalho, corpo, rodapé e botões) e o cabeçalho de mídia mostra a marca do tipo.
// A Meta e o banco são falsos.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn(async () => ({ user: { id: "u-1" }, perfil: { role: "admin", workspace_id: "w-1" } })) }))
vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const consulta = {
        select: () => consulta,
        eq: () => consulta,
        limit: () => consulta,
        maybeSingle: async () => ({ data: { waba_id: "waba-1", access_token: "tk-1" }, error: null }),
      }
      return consulta
    },
  }),
}))

import { listarTemplates, type Template } from "@/app/(auth)/configuracoes/templates/actions"
import { TemplatesClient } from "@/app/(auth)/configuracoes/templates/templates-client"
import { partesDoTemplate } from "@/lib/templates-da-meta"

afterEach(() => vi.unstubAllGlobals())

const COMPONENTES_COMPLETOS = [
  { type: "HEADER", format: "TEXT", text: "Oferta da semana" },
  { type: "BODY", text: "Olá {{1}}, temos novidades para a sua loja." },
  { type: "FOOTER", text: "Responda SAIR para não receber mais" },
  { type: "BUTTONS", buttons: [
    { type: "QUICK_REPLY", text: "Quero ver" },
    { type: "URL", text: "Abrir catálogo", url: "https://exemplo.com" },
  ] },
]

function template(partes: unknown, extra: Partial<Template> = {}): Template {
  return { id: "t1", name: "oferta_semana", status: "APPROVED", category: "MARKETING", language: "pt_BR", partes: partesDoTemplate(partes), ...extra }
}

describe("B54-01 — prévia do template", () => {
  it("CA-B54-01: should pedir components à Meta e, ao clicar em Ver, mostrar cabeçalho, corpo com {{1}}, rodapé e os dois botões", async () => {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify({
      data: [{ id: "t1", name: "oferta_semana", status: "APPROVED", category: "MARKETING", language: "pt_BR", components: COMPONENTES_COMPLETOS }],
    })))
    vi.stubGlobal("fetch", fetchFalso)

    const { templates } = await listarTemplates()
    expect(String((fetchFalso.mock.calls[0] as unknown[])[0])).toContain("components")
    expect(templates[0].partes?.corpo).toBe("Olá {{1}}, temos novidades para a sua loja.")

    render(<TemplatesClient templates={templates} />)
    fireEvent.click(screen.getByRole("button", { name: "Ver oferta_semana" }))

    const previa = await screen.findByTestId("previa-do-template")
    expect(within(previa).getByTestId("previa-cabecalho").textContent).toBe("Oferta da semana")
    expect(within(previa).getByTestId("previa-corpo").textContent).toBe("Olá {{1}}, temos novidades para a sua loja.")
    expect(within(previa).getByTestId("previa-rodape").textContent).toBe("Responda SAIR para não receber mais")
    expect(within(previa).getAllByTestId("previa-botao").map((b) => b.textContent)).toEqual(["Quero ver", "Abrir catálogo"])
  })

  it("CA-B54-02: should mostrar 'Imagem', 'Vídeo' ou 'Documento' no lugar da mídia do cabeçalho", async () => {
    for (const [format, rotulo] of [["IMAGE", "Imagem"], ["VIDEO", "Vídeo"], ["DOCUMENT", "Documento"]] as const) {
      const { unmount } = render(
        <TemplatesClient templates={[template([{ type: "HEADER", format }, { type: "BODY", text: "Veja o anexo" }])]} />
      )
      fireEvent.click(screen.getByRole("button", { name: "Ver oferta_semana" }))
      const previa = await screen.findByTestId("previa-do-template")
      expect(within(previa).getByTestId("previa-cabecalho-midia").textContent).toBe(rotulo)
      expect(within(previa).queryByTestId("previa-cabecalho")).toBeNull()
      expect(within(previa).getByTestId("previa-corpo").textContent).toBe("Veja o anexo")
      expect(previa.querySelector("img, video")).toBeNull()
      unmount()
    }
  })
})
