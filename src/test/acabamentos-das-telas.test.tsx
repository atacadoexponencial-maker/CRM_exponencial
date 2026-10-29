// B48-13 — acabamentos: funil sem nome barrado no formulário, nova etiqueta com a
// primeira cor marcada, e nenhum "workspace" no texto das telas. As actions são falsas.

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/etiquetas/actions", () => ({
  criarEtiqueta: vi.fn(async (nome: string, cor: string) => ({ etiqueta: { id: "e-1", nome, cor, conversas: 0 } })),
  editarEtiqueta: vi.fn(),
  excluirEtiqueta: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/funis/actions", () => ({
  criarFunil: vi.fn(async () => ({})),
  adicionarEtapa: vi.fn(), apagarEtapa: vi.fn(), apagarFunil: vi.fn(), automacoesQueUsam: vi.fn(), editarEtapa: vi.fn(), moverEtapa: vi.fn(), renomearFunil: vi.fn(),
}))

import { EtiquetasClient } from "@/app/(auth)/configuracoes/etiquetas/etiquetas-client"
import { FunisClient } from "@/app/(auth)/configuracoes/funis/funis-client"
import { criarEtiqueta } from "@/app/(auth)/configuracoes/etiquetas/actions"
import { criarFunil } from "@/app/(auth)/configuracoes/funis/actions"

beforeEach(() => vi.clearAllMocks())

describe("B48-13 — formulários", () => {
  it("CA-B48-31: Criar funil com o nome vazio diz 'Informe o nome do funil.' na hora, sem ir ao servidor", async () => {
    render(<FunisClient dados={{ fixos: [], funis: [] }} />)
    fireEvent.click(screen.getByRole("button", { name: /Novo funil/ }))
    fireEvent.change(screen.getByPlaceholderText("Ex.: Feira de Março"), { target: { value: "   " } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Criar funil" })))
    expect(screen.getByRole("alert")).toHaveTextContent("Informe o nome do funil.")
    expect(criarFunil).not.toHaveBeenCalled()
  })

  it("CA-B48-32: Nova etiqueta abre com a primeira cor marcada, e Salvar sem nome diz 'Dê um nome à etiqueta'", async () => {
    render(<EtiquetasClient etiquetasIniciais={[]} />)
    fireEvent.click(screen.getByRole("button", { name: /Nova etiqueta/ }))
    const cores = await screen.findAllByRole("button", { name: /^Cor #/ })
    expect(cores[0]).toHaveAttribute("aria-pressed", "true")
    expect(cores.slice(1).every((c) => c.getAttribute("aria-pressed") === "false")).toBe(true)

    const salvar = screen.getByRole("button", { name: "Salvar" })
    expect(salvar).not.toBeDisabled()
    await act(async () => fireEvent.click(salvar))
    expect(screen.getByText("Dê um nome à etiqueta")).toBeTruthy()
    expect(criarEtiqueta).not.toHaveBeenCalled()
  })
})

// Textos jurídicos ficam como estão (PER-B48-03): o termo do canal direto tem versão,
// e mudar o texto pede novo aceite; Política e Termos de Serviço são do jurídico.
const TEXTOS_LEGAIS = [
  "lib/whatsapp/gateway/termo.ts",
  "app/politica-de-privacidade/page.tsx",
  "app/termos-de-servico/page.tsx",
]

function arquivosDaTela(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    if (statSync(caminho).isDirectory()) return nome === "test" || nome === "integrations" ? [] : arquivosDaTela(caminho)
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })
}

/** Textos entre aspas e texto de JSX; fora comentários, colunas e tabelas do banco e canais do realtime. */
function textosComWorkspace(codigo: string): string[] {
  const semComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
  const textos = [
    ...semComentarios.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g),
  ].map((m) => m[1] ?? m[2] ?? m[3])
  const jsx = [...semComentarios.matchAll(/>([^<>{}]+)</g)].map((m) => m[1])
  return [...textos, ...jsx].filter(
    // "workspaces(name)" é junção num select, não texto de tela
    (t) => /\bworkspaces?\b(?!\()/i.test(t) && !/^workspaces?(_\w+)?$/.test(t.trim()) && !/^workspace:/.test(t.trim())
  )
}

describe("B48-13 — textos", () => {
  it("CA-B48-33: nenhum texto das telas diz 'workspace'; diz 'empresa'", () => {
    const raiz = join(process.cwd(), "src")
    const achados = arquivosDaTela(raiz)
      .filter((a) => !TEXTOS_LEGAIS.includes(relative(raiz, a).split(sep).join("/")))
      .flatMap((a) => textosComWorkspace(readFileSync(a, "utf-8")).map((t) => `${relative(raiz, a)}: ${t}`))
    expect(achados).toEqual([])
  })
})
