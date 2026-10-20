// B30-01: validação dos campos da compra e sugestão de atendente, sem banco.

import { describe, it, expect } from "vitest"
import { esquemaCompra, atendenteSugerido, FORMAS_PAGAMENTO } from "@/lib/compras"

const base = { data: "2026-10-20", valor: "500" }

describe("B30-01 — Compra do contato com peças, desconto, pagamento, atendente e origem", () => {
  it("CA-B30-08: o atendente sugerido é o do contato; sem ele, quem está registrando", () => {
    expect(atendenteSugerido("atendente-do-contato", "usuario-logado")).toBe("atendente-do-contato")
    expect(atendenteSugerido(null, "usuario-logado")).toBe("usuario-logado")
    expect(atendenteSugerido(undefined, "usuario-logado")).toBe("usuario-logado")
  })

  it('CA-B30-09: peças "2,5" é recusada apontando o campo Peças', () => {
    const r = esquemaCompra.safeParse({ ...base, pecas: "2,5" })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["pecas"])
      expect(r.error.issues[0].message).toMatch(/inteiro/)
    }
  })

  it('CA-B30-09: peças "-1" é recusada apontando o campo Peças', () => {
    const r = esquemaCompra.safeParse({ ...base, pecas: "-1" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(["pecas"])
  })

  it('CA-B30-09: desconto "-10" é recusado apontando o campo Desconto', () => {
    const r = esquemaCompra.safeParse({ ...base, desconto: "-10" })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["desconto"])
      expect(r.error.issues[0].message).toMatch(/negativo/)
    }
  })

  it("CA-B30-09: só data e valor passam, com os demais campos vazios", () => {
    const r = esquemaCompra.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).toEqual({ data: "2026-10-20", valor: 500, pecas: null, desconto: null, formaPagamento: null, atendenteId: null })
    }
  })

  it("CA-B30-09: peças 0, desconto 0 e toda forma da lista passam; forma fora da lista não", () => {
    for (const forma of FORMAS_PAGAMENTO) {
      expect(esquemaCompra.safeParse({ ...base, pecas: "0", desconto: "0", formaPagamento: forma }).success).toBe(true)
    }
    const r = esquemaCompra.safeParse({ ...base, formaPagamento: "fiado" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(["formaPagamento"])
  })
})
