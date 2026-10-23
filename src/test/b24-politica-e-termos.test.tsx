// B24-02 — Política de Privacidade e Termos de Serviço com a SETE ADS 2 LTDA.
// As páginas são estáticas: renderizamos o HTML e conferimos o texto, como
// src/test/tema.test.tsx já faz com as mesmas páginas.
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import PoliticaPage from "@/app/politica-de-privacidade/page"
import TermosPage from "@/app/termos-de-servico/page"

function textoDe(elemento: React.ReactElement): string {
  return renderToStaticMarkup(elemento)
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
}

describe("B24-02 — política e termos com a SETE ADS 2 LTDA", () => {
  it("CA-B24-15 — a política cita a SETE ADS 2 LTDA e o CNPJ novo, e não a razão social nem o CNPJ antigos", () => {
    const texto = textoDe(<PoliticaPage />)

    expect(texto).toContain("SETE ADS 2 LTDA")
    expect(texto).toContain("53.756.257/0001-34")
    expect(texto).not.toContain("22.987.352/0001-15")
    // "SETE ADS LTDA" sozinha (sem o "2") não pode aparecer
    expect(texto).not.toMatch(/SETE ADS LTDA/)
    // a controladora é a SETE ADS 2 LTDA, não "Atacado Exponencial" sozinha
    expect(texto).toMatch(/operado pela\s+SETE ADS 2 LTDA/)
  })

  it("CA-B24-16 — a política nomeia Supabase, Vercel e Meta como operadores e diz o que faz com os dados do WhatsApp", () => {
    const texto = textoDe(<PoliticaPage />)

    expect(texto).toContain("Supabase")
    expect(texto).toContain("Vercel")
    expect(texto).toContain("Meta Platforms, Inc.")
    expect(texto).toContain("não usam os dados para fins próprios")

    expect(texto).toContain("Uso dos dados recebidos do WhatsApp")
    expect(texto).toMatch(/não são vendidos, não são usados para publicidade/)
    expect(texto).toMatch(/apagados quando a empresa desconecta o número ou pede a exclusão/)
  })

  it("CA-B24-17 — os termos citam a SETE ADS 2 LTDA, o CNPJ e o foro de Hortolândia/SP, sem o domicílio do usuário", () => {
    const texto = textoDe(<TermosPage />)

    expect(texto).toContain("SETE ADS 2 LTDA")
    expect(texto).toContain("53.756.257/0001-34")
    expect(texto).toContain("comarca de Hortolândia/SP")
    expect(texto).not.toContain("domicílio do usuário")
    expect(texto).not.toMatch(/SETE ADS LTDA/)
    expect(texto).not.toContain("22.987.352/0001-15")
  })
})
