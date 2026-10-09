// B22-01 — landing pública do Atacado Exp (spec-landing-atacado-exp.md, módulo 1).
// A Meta compara o site com o app e a empresa verificada: o teste trava os dados da
// empresa, os links e o que a página não pode prometer.

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import LandingPage, { metadata } from "@/app/page"

function hrefs(): string[] {
  return Array.from(document.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "")
}

describe("B22-01 — Landing do Atacado Exp", () => {
  it("should levar todos os botões Entrar para o login", () => {
    render(<LandingPage />)
    // Cabeçalho, abertura e chamada final
    const entrar = screen.getAllByRole("link", { name: /^Entrar/ })
    expect(entrar).toHaveLength(3)
    for (const link of entrar) expect(link.getAttribute("href")).toBe("/login")
  })

  it("should not ter nenhum link para o cadastro", () => {
    render(<LandingPage />)
    expect(hrefs().some((h) => h.startsWith("/cadastro"))).toBe(false)
    expect(screen.queryByText(/criar conta/i)).toBeNull()
  })

  it("should ligar a política, os termos e o e-mail de contato", () => {
    render(<LandingPage />)
    const links = hrefs()
    expect(links).toContain("/politica-de-privacidade")
    expect(links).toContain("/termos-de-servico")
    expect(links).toContain("mailto:atacadoexponencial@gmail.com")
  })

  it("should mostrar a empresa responsável com CNPJ e endereço", () => {
    render(<LandingPage />)
    const texto = document.body.textContent ?? ""
    expect(texto).toContain("Atacado Exp é um produto da SETE ADS LTDA")
    expect(texto).toContain("CNPJ 22.987.352/0001-15")
    expect(texto).toContain("Hortolândia/SP")
    expect(texto).toContain("CEP 13186-604")
  })

  it("should listar os oito recursos", () => {
    render(<LandingPage />)
    for (const recurso of [
      "Caixa de entrada do WhatsApp",
      "Funis de Entrada e Recompra",
      "Contatos",
      "Sequências e agenda",
      "Campanhas",
      "Automações",
      "Catálogo e loja",
      "Painel",
    ]) {
      expect(screen.getByRole("heading", { name: recurso })).toBeTruthy()
    }
  })

  it("should not prometer o que ainda não existe nem citar o canal direto", () => {
    render(<LandingPage />)
    const texto = (document.body.textContent ?? "").toLowerCase()
    for (const proibido of ["coexist", "preço", "grátis", "gratuito", "teste grátis", "qr code", "canal direto"]) {
      expect(texto).not.toContain(proibido)
    }
  })

  it("should not colar o nome do produto às marcas da Meta", () => {
    render(<LandingPage />)
    const texto = document.body.textContent ?? ""
    expect(texto).not.toMatch(/Atacado Exp (WhatsApp|Meta|Facebook|Instagram)/)
  })

  it("should usar o título da aba do Atacado Exp", () => {
    expect(metadata.title).toBe("Atacado Exp — CRM para atacadistas que vendem pelo WhatsApp")
  })
})
