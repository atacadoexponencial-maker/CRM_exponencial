// B53-15 — iniciais do avatar ignoram símbolos: uma regra só (src/lib/iniciais.ts)
// para contato, usuário e time. O time (página de servidor) chama a função direto.

import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/perfil/actions", () => ({ realizarLogout: vi.fn(), trocarTema: vi.fn() }))

import { iniciaisDoNome } from "@/lib/iniciais"
import { AvatarContato } from "@/components/shared/avatar-contato"
import { MenuDoUsuario } from "@/components/shared/menu-do-usuario"

const CASOS: Array<[string, string]> = [
  ["[TESTE] Automações B11", "TB"],
  ["Loja Beta", "LB"],
  ["(11) 99999-0000", "19"],
]

describe("B53-15 — iniciais do avatar", () => {
  it("CA-B53-30: should montar TB, LB e 19 na regra única, usada pelo avatar do time", () => {
    for (const [nome, esperado] of CASOS) expect(iniciaisDoNome(nome)).toBe(esperado)
  })

  it("CA-B53-30: should mostrar TB, LB e 19 no avatar do contato", () => {
    for (const [nome, esperado] of CASOS) {
      const { container, unmount } = render(<AvatarContato nome={nome} />)
      expect(container.textContent).toBe(esperado)
      unmount()
    }
  })

  it("CA-B53-30: should mostrar TB, LB e 19 na bolinha do usuário", () => {
    for (const [nome, esperado] of CASOS) {
      const { getByLabelText, unmount } = render(<MenuDoUsuario nome={nome} email="x@exemplo.com" />)
      expect(getByLabelText("Menu do usuário").textContent).toBe(esperado)
      unmount()
    }
  })

  it("CA-B53-30: should manter uma palavra como hoje e não inventar inicial de nome só com símbolos", () => {
    expect(iniciaisDoNome("Ana")).toBe("A")
    expect(iniciaisDoNome("Ana", 2)).toBe("AN")
    expect(iniciaisDoNome("Élida Ávila")).toBe("ÉÁ")
    expect(iniciaisDoNome("???")).toBe("")
    const { container } = render(<AvatarContato nome="???" />)
    expect(container.querySelector('[aria-label="Contato sem nome"]')).not.toBeNull()
  })
})
