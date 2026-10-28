// B36-03 — Menu lateral no estilo Caderno.
// O desenho mudou; os itens, os grupos, as permissões e os crachás são os de antes.

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/pipeline", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: vi.fn(), trocarTema: vi.fn(async () => ({})) }))

import { SidebarNav } from "@/components/shared/sidebar-nav"

type Papel = "admin" | "gerente" | "atendente"

/** O que cada papel via no menu antes da B36, grupo por grupo. */
const ESPERADO: Record<Papel, Record<string, string[]>> = {
  admin: {
    "": ["Dashboard", "Pipeline", "Chat", "Contatos", "Catálogo", "Pedidos", "Relatórios"],
    Rotina: ["Agenda", "Alertas"],
    // B28-06: "Sequências" saiu do menu
    Automação: ["Campanhas", "Automações"],
    // B41-01: "Funis" em Configurações, para o Admin e o Gerente
    // B38-01: "Campos personalizados" logo abaixo de Funis, para o Admin e o Gerente
    Configurações: ["Funis", "Campos personalizados", "Mensagens Rápidas", "Etiquetas", "Templates", "Usuários", "Times", "WhatsApp", "Empresa"],
  },
  gerente: {
    "": ["Dashboard", "Pipeline", "Chat", "Contatos", "Catálogo", "Pedidos", "Relatórios"],
    Rotina: ["Agenda", "Alertas"],
    Automação: ["Campanhas"],
    Configurações: ["Funis", "Campos personalizados"],
  },
  atendente: {
    "": ["Dashboard", "Pipeline", "Chat", "Contatos", "Pedidos", "Relatórios"],
    Rotina: ["Agenda", "Alertas"],
  },
}

function gruposDoMenu(): Record<string, string[]> {
  const nav = screen.getByRole("navigation", { name: "Menu principal" })
  const grupos: Record<string, string[]> = {}
  for (const grupo of Array.from(nav.children)) {
    const titulo = grupo.querySelector(":scope > span")?.textContent ?? ""
    grupos[titulo] = within(grupo as HTMLElement).getAllByRole("link").map((l) => l.textContent!.replace(/\d+$/, "").trim())
  }
  return grupos
}

describe("B36-03 — Menu lateral no estilo Caderno", () => {
  for (const papel of ["admin", "gerente", "atendente"] as const) {
    it(`CA-B36-13: should mostrar ao ${papel} os mesmos itens, grupos e crachás de hoje, com a tela atual destacada`, () => {
      const { unmount } = render(<SidebarNav papel={papel} nomeUsuario="Ana Mendes" email="ana@exemplo.com" atrasados={2} pedidosNovos={3} />)
      expect(gruposDoMenu()).toEqual(ESPERADO[papel])

      const nav = screen.getByRole("navigation", { name: "Menu principal" })
      expect(within(nav).getByRole("link", { name: /Pipeline/ })).toHaveAttribute("aria-current", "page")
      expect(within(nav).getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1)
      expect(within(nav).getByRole("link", { name: /Agenda/ }).querySelector("[data-badge]")?.textContent).toBe("2")
      expect(within(nav).getByRole("link", { name: /Pedidos/ }).querySelector("[data-badge]")?.textContent).toBe("3")
      expect(screen.getAllByLabelText("Menu do usuário").length).toBeGreaterThan(0)
      unmount()
    })
  }
})
