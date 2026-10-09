// B21-08 — cabeçalhos de segurança em toda resposta (auditoria de 06/10/2026, rodada 3).

import { describe, expect, it } from "vitest"
import nextConfig from "../../next.config"

describe("B21-08 — Cabeçalhos de segurança no site", () => {
  it("should aplicar as proteções a todas as rotas", async () => {
    const regras = await nextConfig.headers!()
    expect(regras).toHaveLength(1)
    expect(regras[0].source).toBe("/:path*")

    const cabecalhos = Object.fromEntries(regras[0].headers.map((h) => [h.key, h.value]))
    expect(cabecalhos).toEqual({
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    })
  })

  it("should not trazer política de conteúdo que restrinja scripts (login da Meta)", async () => {
    const [regra] = await nextConfig.headers!()
    const csp = regra.headers.find((h) => h.key === "Content-Security-Policy")!.value
    expect(csp).not.toMatch(/script-src|default-src/)
  })
})
