// B54-02 — templates: criar com todas as partes, editar só quando a Meta permite,
// apagar com confirmação; avisos e recusas da Meta em português. A Meta e o banco são
// falsos; o `fetch` falso guarda cada chamada para conferir o que foi à Meta.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
const avisos: string[] = []
vi.mock("@/lib/aviso-na-tela", () => ({ avisar: (t: string) => { avisos.push(t) } }))

import { TemplatesClient } from "@/app/(auth)/configuracoes/templates/templates-client"
import type { Template } from "@/app/(auth)/configuracoes/templates/actions"
import { componentsParaMeta, motivoDaRecusaDaMeta, partesDoTemplate } from "@/lib/templates-da-meta"

type Chamada = { url: string; method: string; body: unknown }
let chamadas: Chamada[] = []
let respostaDaMeta: (chamada: Chamada) => Response = () => new Response(JSON.stringify({ success: true }))

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_META_APP_ID", "app-1")
  chamadas = []
  avisos.length = 0
  respostaDaMeta = () => new Response(JSON.stringify({ success: true, id: "novo-1" }))
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const chamada = { url: String(url), method: init?.method ?? "GET", body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body ?? null }
    chamadas.push(chamada)
    return respostaDaMeta(chamada)
  }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const COMPLETO = partesDoTemplate([
  { type: "HEADER", format: "TEXT", text: "Oferta da semana" },
  { type: "BODY", text: "Olá {{1}}, temos novidades." },
  { type: "FOOTER", text: "Responda SAIR" },
  { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Quero ver" }, { type: "URL", text: "Abrir", url: "https://exemplo.com" }] },
])

function template(status: string, extra: Partial<Template> = {}): Template {
  return { id: `id-${status}`, name: `tpl_${status.toLowerCase()}`, status, category: "MARKETING", language: "pt_BR", partes: COMPLETO, ...extra }
}

const linha = (nome: string) => screen.getByText(nome, { selector: "td" }).closest("tr") as HTMLElement
const recusa = (error: Record<string, unknown>) => new Response(JSON.stringify({ error }), { status: 400 })

describe("B54-02 — criar, editar e apagar template", () => {
  it("CA-B54-03: should mostrar Editar só em aprovado, rejeitado e pausado, e o aviso de análise no pendente", () => {
    render(<TemplatesClient templates={[template("APPROVED"), template("REJECTED"), template("PAUSED"), template("PENDING")]} />)

    for (const nome of ["tpl_approved", "tpl_rejected", "tpl_paused"]) {
      expect(within(linha(nome)).getByRole("button", { name: `Editar ${nome}` })).toBeTruthy()
      expect(within(linha(nome)).queryByText("Em análise pela Meta; só pode ser editado depois da resposta")).toBeNull()
    }
    expect(within(linha("tpl_pending")).queryByRole("button", { name: /Editar/ })).toBeNull()
    expect(within(linha("tpl_pending")).getByText("Em análise pela Meta; só pode ser editado depois da resposta")).toBeTruthy()
    expect(within(linha("tpl_paused")).getByText("Pausado")).toBeTruthy()
  })

  it("CA-B54-04: should abrir a edição preenchida, com categoria editável e nome e idioma travados, com o aviso da Meta", async () => {
    render(<TemplatesClient templates={[template("APPROVED")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar tpl_approved" }))

    const nome = (await screen.findByLabelText("Nome")) as HTMLInputElement
    expect(nome.value).toBe("tpl_approved")
    expect(nome.disabled).toBe(true)
    expect((screen.getByLabelText("Idioma") as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByLabelText("Categoria") as HTMLSelectElement).disabled).toBe(false)
    expect((screen.getByLabelText("Cabeçalho") as HTMLSelectElement).value).toBe("texto")
    expect((screen.getByLabelText("Texto do cabeçalho") as HTMLInputElement).value).toBe("Oferta da semana")
    expect((screen.getByLabelText("Corpo da mensagem") as HTMLTextAreaElement).value).toBe("Olá {{1}}, temos novidades.")
    expect((screen.getByLabelText("Rodapé (opcional)") as HTMLInputElement).value).toBe("Responda SAIR")
    expect((screen.getByLabelText("Texto do botão 1") as HTMLInputElement).value).toBe("Quero ver")
    expect((screen.getByLabelText("Texto do botão 2") as HTMLInputElement).value).toBe("Abrir")
    expect((screen.getByLabelText("Endereço do botão 2") as HTMLInputElement).value).toBe("https://exemplo.com")
    expect(screen.getByText("A Meta não deixa mudar o nome nem o idioma de um template criado")).toBeTruthy()
  })

  it("CA-B54-05: should mandar a edição à Meta pelo id do template, marcar Pendente e avisar da nova análise", async () => {
    render(<TemplatesClient templates={[template("APPROVED")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar tpl_approved" }))
    const corpo = await screen.findByLabelText("Corpo da mensagem")
    fireEvent.change(corpo, { target: { value: "Olá {{1}}, texto novo." } })
    fireEvent.change(screen.getByLabelText("Exemplo da variável {{1}} do corpo"), { target: { value: "Maria" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar e enviar à Meta" }))

    await waitFor(() => expect(within(linha("tpl_approved")).getByText("Pendente")).toBeTruthy())
    const edicao = chamadas.find((c) => c.method === "POST")!
    expect(edicao.url).toContain("/v21.0/id-APPROVED?access_token=tk-1")
    const body = edicao.body as { category: string; components: Array<{ type: string; text?: string }> }
    expect(body.category).toBe("MARKETING")
    expect(body.components.find((c) => c.type === "BODY")).toEqual({ type: "BODY", text: "Olá {{1}}, texto novo.", example: { body_text: [["Maria"]] } })
    expect(body).not.toHaveProperty("name")
    expect(body).not.toHaveProperty("language")
    expect(avisos).toContain("Template enviado à Meta para nova análise")
  })

  it("CA-B54-06: should manter o formulário aberto com o motivo da Meta e a lista igual quando ela recusa a edição", async () => {
    respostaDaMeta = () => recusa({ message: "Invalid parameter", error_user_msg: "O corpo não pode terminar com variável" })
    render(<TemplatesClient templates={[template("APPROVED")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar tpl_approved" }))
    fireEvent.change(await screen.findByLabelText("Corpo da mensagem"), { target: { value: "Olá {{1}}" } })
    fireEvent.change(screen.getByLabelText("Exemplo da variável {{1}} do corpo"), { target: { value: "Maria" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar e enviar à Meta" }))

    expect(await screen.findByText("O corpo não pode terminar com variável")).toBeTruthy()
    expect(screen.getByLabelText("Corpo da mensagem")).toBeTruthy()
    expect(within(linha("tpl_approved")).getByText("Aprovado")).toBeTruthy()
    expect(avisos).toEqual([])
  })

  it("CA-B54-07: should criar com cabeçalho de texto, rodapé e um botão de cada tipo, mandando tudo à Meta, e a prévia mostrar cada parte", async () => {
    render(<TemplatesClient templates={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "Novo template" }))
    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: "promo_completa" } })
    fireEvent.change(screen.getByLabelText("Cabeçalho"), { target: { value: "texto" } })
    fireEvent.change(screen.getByLabelText("Texto do cabeçalho"), { target: { value: "Só hoje" } })
    fireEvent.change(screen.getByLabelText("Corpo da mensagem"), { target: { value: "Olá {{1}}, aproveite." } })
    fireEvent.change(screen.getByLabelText("Exemplo da variável {{1}} do corpo"), { target: { value: "Maria" } })
    fireEvent.change(screen.getByLabelText("Rodapé (opcional)"), { target: { value: "Equipe Loja" } })

    fireEvent.click(screen.getByRole("button", { name: "Adicionar botão" }))
    fireEvent.change(screen.getByLabelText("Texto do botão 1"), { target: { value: "Quero" } })
    fireEvent.click(screen.getByRole("button", { name: "Adicionar botão" }))
    fireEvent.change(screen.getByLabelText("Tipo do botão 2"), { target: { value: "link" } })
    fireEvent.change(screen.getByLabelText("Texto do botão 2"), { target: { value: "Ver catálogo" } })
    fireEvent.change(screen.getByLabelText("Endereço do botão 2"), { target: { value: "https://loja.com/c" } })
    fireEvent.click(screen.getByRole("button", { name: "Adicionar botão" }))
    fireEvent.change(screen.getByLabelText("Tipo do botão 3"), { target: { value: "telefone" } })
    fireEvent.change(screen.getByLabelText("Texto do botão 3"), { target: { value: "Ligar" } })
    fireEvent.change(screen.getByLabelText("Telefone do botão 3"), { target: { value: "+5511999999999" } })
    expect(screen.queryByRole("button", { name: "Adicionar botão" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Criar template" }))
    await waitFor(() => expect(screen.getByText("promo_completa")).toBeTruthy())

    const criacao = chamadas.find((c) => c.method === "POST")!
    expect(criacao.url).toContain("/waba-1/message_templates")
    const body = criacao.body as { name: string; components: Array<Record<string, unknown>> }
    expect(body.name).toBe("promo_completa")
    expect(body.components).toEqual([
      { type: "HEADER", format: "TEXT", text: "Só hoje" },
      { type: "BODY", text: "Olá {{1}}, aproveite.", example: { body_text: [["Maria"]] } },
      { type: "FOOTER", text: "Equipe Loja" },
      { type: "BUTTONS", buttons: [
        { type: "QUICK_REPLY", text: "Quero" },
        { type: "URL", text: "Ver catálogo", url: "https://loja.com/c" },
        { type: "PHONE_NUMBER", text: "Ligar", phone_number: "+5511999999999" },
      ] },
    ])

    fireEvent.click(screen.getByRole("button", { name: "Ver promo_completa" }))
    const previa = await screen.findByTestId("previa-do-template")
    expect(within(previa).getByTestId("previa-cabecalho").textContent).toBe("Só hoje")
    expect(within(previa).getByTestId("previa-corpo").textContent).toBe("Olá {{1}}, aproveite.")
    expect(within(previa).getByTestId("previa-rodape").textContent).toBe("Equipe Loja")
    expect(within(previa).getAllByTestId("previa-botao").map((b) => b.textContent)).toEqual(["Quero", "Ver catálogo", "Ligar"])
  })

  it("CA-B54-08: should exigir o arquivo de exemplo no cabeçalho de mídia e, com ele, mandar o header_handle", async () => {
    render(<TemplatesClient templates={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "Novo template" }))
    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: "com_imagem" } })
    fireEvent.change(screen.getByLabelText("Cabeçalho"), { target: { value: "imagem" } })
    fireEvent.change(screen.getByLabelText("Corpo da mensagem"), { target: { value: "Veja a foto" } })

    fireEvent.click(screen.getByRole("button", { name: "Criar template" }))
    expect(await screen.findByText("Anexe um exemplo do arquivo do cabeçalho para a análise da Meta")).toBeTruthy()
    expect(chamadas).toEqual([])

    // o upload de exemplo: sessão e envio devolvem o handle; a criação aceita
    respostaDaMeta = (c) => {
      if (c.url.includes("/uploads")) return new Response(JSON.stringify({ id: "upload:abc" }))
      if (c.url.includes("/upload:abc")) return new Response(JSON.stringify({ h: "handle-123" }))
      return new Response(JSON.stringify({ success: true, id: "novo-2" }))
    }
    const arquivo = new File(["bytes"], "foto.jpg", { type: "image/jpeg" })
    fireEvent.change(screen.getByTestId("arquivo-de-exemplo"), { target: { files: [arquivo] } })
    await screen.findByText("foto.jpg")

    fireEvent.click(screen.getByRole("button", { name: "Criar template" }))
    await waitFor(() => expect(screen.getByText("com_imagem")).toBeTruthy())
    const criacao = chamadas.find((c) => c.url.includes("/message_templates") && c.method === "POST")!
    const body = criacao.body as { components: Array<Record<string, unknown>> }
    expect(body.components[0]).toEqual({ type: "HEADER", format: "IMAGE", example: { header_handle: ["handle-123"] } })
    expect(componentsParaMeta({ cabecalho: { tipo: "imagem" }, corpo: "x", rodape: null, botoes: [] })).toEqual([{ type: "BODY", text: "x" }])
  })

  it("CA-B54-09: should avisar do limite de edições do aprovado e traduzir a recusa da Meta por limite", async () => {
    render(<TemplatesClient templates={[template("APPROVED"), template("REJECTED")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar tpl_approved" }))
    expect(await screen.findByText("Template aprovado pode ser editado até 10 vezes em 30 dias, uma por dia")).toBeTruthy()

    respostaDaMeta = () => recusa({ code: 100, error_subcode: 2388024, message: "Message template edit limit reached" })
    fireEvent.change(screen.getByLabelText("Exemplo da variável {{1}} do corpo"), { target: { value: "Maria" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar e enviar à Meta" }))
    expect(await screen.findByText("A Meta não aceitou: limite de edições deste template atingido")).toBeTruthy()

    expect(motivoDaRecusaDaMeta({ message: "You have reached the edit limit for this template" }, "x")).toBe("A Meta não aceitou: limite de edições deste template atingido")
    expect(motivoDaRecusaDaMeta({ message: "Qualquer outra coisa" }, "x")).toBe("Qualquer outra coisa")
  })

  it("CA-B54-30: should confirmar antes de apagar, avisar do bloqueio de 30 dias, e ao confirmar apagar pelo nome na Meta", async () => {
    render(<TemplatesClient templates={[template("APPROVED"), template("PENDING")]} />)

    fireEvent.click(screen.getByRole("button", { name: "Apagar tpl_pending" }))
    expect(await screen.findByText(/A Meta bloqueia esse nome por 30 dias e recusa envios novos com ele; campanhas salvas com este template deixam de confirmar/)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    await waitFor(() => expect(screen.queryByText(/bloqueia esse nome/)).toBeNull())
    expect(chamadas).toEqual([])
    expect(screen.getByText("tpl_pending")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Apagar tpl_pending" }))
    fireEvent.click(await screen.findByRole("button", { name: "Apagar" }))
    await waitFor(() => expect(screen.queryByText("tpl_pending")).toBeNull())
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].method).toBe("DELETE")
    expect(chamadas[0].url).toContain("/waba-1/message_templates?name=tpl_pending&")
    expect(screen.getByText("tpl_approved", { selector: "td" })).toBeTruthy()
    expect(avisos).toContain("Template apagado")
  })

  it("CA-B54-31: should manter o template na lista e mostrar o motivo quando a Meta recusa apagar", async () => {
    respostaDaMeta = () => recusa({ message: "(#100) Template is being used in a running campaign" })
    render(<TemplatesClient templates={[template("APPROVED")]} />)
    fireEvent.click(screen.getByRole("button", { name: "Apagar tpl_approved" }))
    fireEvent.click(await screen.findByRole("button", { name: "Apagar" }))

    expect(await screen.findByText("(#100) Template is being used in a running campaign")).toBeTruthy()
    expect(screen.getByText("tpl_approved", { selector: "td" })).toBeTruthy()
    expect(avisos).toEqual([])
  })
})
