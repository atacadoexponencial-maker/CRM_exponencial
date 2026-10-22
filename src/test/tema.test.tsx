// B36-01 — Tema claro e escuro por usuário.
// Telas e cores: o layout raiz no tema do cookie, a troca no menu do usuário, as
// páginas sempre claras, a logo de cada tema e o contraste de toda a paleta.

import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { Suspense } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

let cookieTema: string | undefined
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nome: string) => (nome === "tema" && cookieTema ? { value: cookieTema } : undefined) }),
}))
vi.mock("next/font/google", () => ({
  IBM_Plex_Sans: () => ({ variable: "fonte-plex-sans" }),
  IBM_Plex_Mono: () => ({ variable: "fonte-plex-mono" }),
}))
const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  unstable_rethrow: () => {},
}))
const gravarTema = vi.fn(async (tema: string) => { void tema; return {} })
vi.mock("@/app/(auth)/perfil/actions", () => ({
  realizarLogout: vi.fn(),
  trocarTema: (tema: string) => gravarTema(tema),
}))
vi.mock("@/app/login/actions", () => ({ realizarLogin: vi.fn() }))
vi.mock("@/app/cadastro/actions", () => ({ cadastrarEmpresa: vi.fn() }))

import RootLayout from "@/app/layout"
import { MenuDoUsuario } from "@/components/shared/menu-do-usuario"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import LoginPage from "@/app/login/page"
import CadastroPage from "@/app/cadastro/page"
import PoliticaPage from "@/app/politica-de-privacidade/page"
import TermosPage from "@/app/termos-de-servico/page"
import NaoEncontrado from "@/app/not-found"
import LojaLayout from "@/app/loja/[endereco]/layout"

const CSS = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf-8")

/** Variáveis declaradas no bloco do seletor dado, lidas do globals.css. */
function variaveis(seletor: string): Record<string, string> {
  const inicio = CSS.indexOf(seletor + " {")
  const bloco = CSS.slice(inicio, CSS.indexOf("}", inicio))
  return Object.fromEntries([...bloco.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]))
}

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

afterEach(() => {
  cookieTema = undefined
  document.documentElement.classList.remove("dark")
})

describe("B36-01 — Tema claro e escuro por usuário", () => {
  it("CA-B36-01: should abrir no tema claro quem nunca escolheu, com fundo de papel e texto tinta", async () => {
    const html = renderToStaticMarkup(await RootLayout({ children: <p>tela</p> }))
    const classe = html.match(/<html[^>]*class="([^"]*)"/)![1]
    expect(classe.split(" ")).not.toContain("dark")
    const claro = variaveis(":root,\n.tema-claro")
    expect(claro.background).toBe("#F6F4EF")
    expect(claro.foreground).toBe("#1C1B18")
  })

  it("CA-B36-02: should trocar para o escuro na hora pelo menu do usuário, sem navegar, e gravar a escolha", async () => {
    render(<MenuDoUsuario nome="Ana Mendes" email="ana@exemplo.com" tema="claro" />)
    fireEvent.click(screen.getByLabelText("Menu do usuário"))
    fireEvent.click(await screen.findByText("Escuro"))
    await waitFor(() => expect(gravarTema).toHaveBeenCalledWith("escuro"))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.cookie).toContain("tema=escuro")
    expect(push).not.toHaveBeenCalled()
  })

  it("CA-B36-04: should mandar o HTML já escuro do servidor quando o cookie diz escuro", async () => {
    cookieTema = "escuro"
    const html = renderToStaticMarkup(await RootLayout({ children: <p>tela</p> }))
    const classe = html.match(/<html[^>]*class="([^"]*)"/)![1]
    expect(classe.split(" ")).toContain("dark")
  })

  it("CA-B36-06: should deixar login, cadastro, páginas legais e não-encontrado no claro, com a logo grafite", async () => {
    const telas = [
      <Suspense key="login"><LoginPage searchParams={Promise.resolve({})} /></Suspense>,
      <CadastroPage key="cadastro" />,
    ]
    for (const tela of telas) {
      let resultado!: ReturnType<typeof render>
      await act(async () => { resultado = render(tela) })
      const { container, unmount } = resultado
      const claro = container.querySelector(".tema-claro")
      expect(claro).not.toBeNull()
      expect(claro!.querySelector('img[data-logo="grafite"]')).not.toBeNull()
      unmount()
    }
    for (const Pagina of [PoliticaPage, TermosPage, NaoEncontrado]) {
      const { container, unmount } = render(<Pagina />)
      expect(container.firstElementChild?.classList.contains("tema-claro")).toBe(true)
      unmount()
    }
    const exclusao = readFileSync(path.resolve(__dirname, "../app/exclusao-de-dados/[code]/page.tsx"), "utf-8")
    expect(exclusao).toMatch(/return \(\s*<TemaClaro>/)
  })

  it("CA-B36-07: should manter a loja pública sempre clara e sem cores do tema do CRM", () => {
    document.documentElement.classList.add("dark")
    const { container } = render(<LojaLayout><main>vitrine</main></LojaLayout>)
    expect(container.firstElementChild?.classList.contains("tema-claro")).toBe(true)

    const arquivos: string[] = []
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = path.join(dir, nome)
        if (statSync(caminho).isDirectory()) varrer(caminho)
        else if (/\.tsx?$/.test(nome)) arquivos.push(caminho)
      }
    }
    varrer(path.resolve(__dirname, "../app/loja"))
    const tokens = /\b(?:bg|text|border)-(?:background|foreground|card|popover|primary|secondary|muted|accent|sidebar)\b|\bdark:/
    expect(arquivos.filter((a) => tokens.test(readFileSync(a, "utf-8"))).map((a) => path.basename(a))).toEqual([])
  })

  it("CA-B36-08: should mostrar a logo grafite no claro e a branca só no escuro", () => {
    const { container } = render(<LogoDaMarca className="h-8" />)
    const grafite = container.querySelector('img[data-logo="grafite"]')!
    const branca = container.querySelector('img[data-logo="branca"]')!
    expect(grafite.getAttribute("src")).toContain("logo-crmatacado-exp-grafite.png")
    expect(grafite.className.split(" ")).toContain("dark:hidden")
    expect(branca.getAttribute("src")).toContain("logo-crmatacado-exp.png")
    expect(branca.className.split(" ")).toEqual(expect.arrayContaining(["hidden", "dark:block"]))
  })

  it("CA-B36-09: should ter contraste de pelo menos 4,5:1 em todo par texto/fundo dos dois temas", () => {
    const pares: [string, string][] = [
      ["foreground", "background"], ["foreground", "card"], ["foreground", "sidebar"], ["foreground", "muted"], ["foreground", "accent"],
      ["muted-foreground", "background"], ["muted-foreground", "card"], ["muted-foreground", "sidebar"], ["muted-foreground", "muted"], ["muted-foreground", "accent"],
      ["sidebar-foreground", "sidebar"], ["sidebar-accent-foreground", "sidebar-accent"], ["sidebar-primary-foreground", "sidebar-primary"],
      ["primary", "background"], ["primary", "card"], ["primary-foreground", "primary"], ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
      ["destructive", "background"], ["destructive", "card"],
      ["alta", "background"], ["alta", "card"], ["queda", "background"], ["queda", "card"],
      ["aviso", "aviso-fundo"], ["sucesso", "sucesso-fundo"], ["erro", "erro-fundo"], ["info", "info-fundo"],
      ["aviso", "background"], ["info", "background"],
    ]
    for (const [nome, tema] of [["claro", variaveis(":root,\n.tema-claro")], ["escuro", variaveis(".dark")]] as const) {
      for (const [texto, fundo] of pares) {
        expect(tema[texto], `${nome}: --${texto}`).toBeDefined()
        expect(tema[fundo], `${nome}: --${fundo}`).toBeDefined()
        expect(contraste(tema[texto], tema[fundo]), `${nome}: --${texto} sobre --${fundo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
