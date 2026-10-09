// B22-03 — Termos de Serviço do Atacado Exp (spec-landing-atacado-exp.md, módulo 3).

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import TermosDeServicoPage, { metadata } from "@/app/termos-de-servico/page"

function texto(): string {
  return document.body.textContent ?? ""
}

describe("B22-03 — Termos de Serviço do Atacado Exp", () => {
  it("should usar o título da aba do Atacado Exp", () => {
    expect(metadata.title).toBe("Termos de Serviço — Atacado Exp")
  })

  it("should identificar a SETE ADS LTDA com CNPJ e endereço", () => {
    render(<TermosDeServicoPage />)
    expect(texto()).toContain("SETE ADS LTDA, CNPJ 22.987.352/0001-15")
    expect(texto()).toContain("CEP 13186-604")
  })

  it("should not sobrar o nome antigo do produto nem a dona antiga", () => {
    render(<TermosDeServicoPage />)
    expect(texto()).not.toContain("CRM Exponencial")
    expect(texto()).not.toContain("Atacado Exponencial")
  })

  it("should eleger o foro de Hortolândia/SP", () => {
    render(<TermosDeServicoPage />)
    expect(texto()).toContain("foro da comarca de Hortolândia/SP")
  })

  it("should exigir opt-in e deixar os custos da Meta com o cliente", () => {
    render(<TermosDeServicoPage />)
    expect(texto()).toContain("opt-in")
    expect(texto()).toContain("Os custos das mensagens cobrados pela Meta são do cliente")
  })

  it("should ligar a landing, a política, as políticas do WhatsApp em nova aba e o e-mail", () => {
    render(<TermosDeServicoPage />)
    const links = Array.from(document.querySelectorAll("a"))
    const href = (h: string) => links.find((a) => a.getAttribute("href") === h)
    expect(href("/")).toBeTruthy()
    expect(href("/politica-de-privacidade")).toBeTruthy()
    expect(href("https://www.whatsapp.com/legal/business-policy")?.getAttribute("target")).toBe("_blank")
    expect(href("mailto:atacadoexponencial@gmail.com")).toBeTruthy()
  })
})
