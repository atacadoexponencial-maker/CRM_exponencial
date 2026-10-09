// B22-02 — Política de Privacidade do Atacado Exp (spec-landing-atacado-exp.md, módulo 2).
// A análise do app da Meta avalia a URL da política: o teste trava a empresa responsável,
// os operadores e o que sobrou do nome antigo.

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import PoliticaDePrivacidadePage, { metadata } from "@/app/politica-de-privacidade/page"

function texto(): string {
  return document.body.textContent ?? ""
}

describe("B22-02 — Política de Privacidade do Atacado Exp", () => {
  it("should usar o título da aba do Atacado Exp", () => {
    expect(metadata.title).toBe("Política de Privacidade — Atacado Exp")
  })

  it("should identificar a SETE ADS LTDA com CNPJ e endereço", () => {
    render(<PoliticaDePrivacidadePage />)
    expect(texto()).toContain("SETE ADS LTDA, CNPJ 22.987.352/0001-15")
    expect(texto()).toContain("Hortolândia/SP")
    expect(texto()).toContain("CEP 13186-604")
  })

  it("should not sobrar o nome antigo do produto nem a dona antiga", () => {
    render(<PoliticaDePrivacidadePage />)
    expect(texto()).not.toContain("CRM Exponencial")
    expect(texto()).not.toContain("Atacado Exponencial")
  })

  it("should explicar os papéis de controladora e operadora", () => {
    render(<PoliticaDePrivacidadePage />)
    expect(texto()).toContain("controladora")
    expect(texto()).toContain("operadora")
  })

  it("should citar os operadores e a transferência para os Estados Unidos", () => {
    render(<PoliticaDePrivacidadePage />)
    for (const operador of ["Meta Platforms", "Supabase", "Vercel", "Estados Unidos"]) {
      expect(texto()).toContain(operador)
    }
  })

  it("should dizer que a lixeira apaga de vez em 30 dias", () => {
    render(<PoliticaDePrivacidadePage />)
    expect(texto()).toContain("lixeira e é excluído de vez após 30 dias")
  })

  it("should not citar o canal direto nem o QR Code", () => {
    render(<PoliticaDePrivacidadePage />)
    expect(texto().toLowerCase()).not.toContain("canal direto")
    expect(texto().toLowerCase()).not.toContain("qr code")
  })

  it("should ligar a landing, a política do WhatsApp em nova aba e o e-mail", () => {
    render(<PoliticaDePrivacidadePage />)
    const links = Array.from(document.querySelectorAll("a"))
    expect(links.some((a) => a.getAttribute("href") === "/")).toBe(true)
    const whatsapp = links.find((a) => a.getAttribute("href") === "https://www.whatsapp.com/legal/privacy-policy")
    expect(whatsapp?.getAttribute("target")).toBe("_blank")
    expect(links.some((a) => a.getAttribute("href") === "mailto:atacadoexponencial@gmail.com")).toBe(true)
  })
})
