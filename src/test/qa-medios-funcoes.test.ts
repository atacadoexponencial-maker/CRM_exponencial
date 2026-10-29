// QA de 06/10/2026, achados médios que viraram função pura: M13 (telefone), M15
// (preço com ponto), M17 (período personalizado), M18 (curinga no ilike) e M29
// (busca sem acento e sem formatação).

import { describe, it, expect } from "vitest"
import { escaparLike } from "@/lib/escapar-like"
import { contemTermo, semAcento, soDigitos } from "@/lib/normalizar-busca"
import { normalizarWhatsapp } from "@/lib/telefone"
import { paraNumero } from "@/app/(auth)/catalogo/components/editor-produto"
import { rangeDoPeriodo } from "@/lib/metricas-dashboard"
import { FUSO_DA_OPERACAO } from "@/lib/datas"

describe("QA M18 — texto digitado dentro de um ilike", () => {
  it("escapa %, _ e \\ para não virarem curinga", () => {
    expect(escaparLike("Entr_da")).toBe("Entr\\_da")
    expect(escaparLike("100%")).toBe("100\\%")
    expect(escaparLike("a\\b")).toBe("a\\\\b")
    expect(escaparLike("Entrada")).toBe("Entrada")
  })
})

describe("QA M29 — busca ignora acento, maiúscula e formatação de telefone", () => {
  it("semAcento e soDigitos", () => {
    expect(semAcento("  João Ávila ")).toBe("joao avila")
    expect(soDigitos("(11) 98888-0001")).toBe("11988880001")
  })

  it("contemTermo acha nome sem acento e telefone formatado", () => {
    expect(contemTermo("João da Silva", "joao")).toBe(true)
    expect(contemTermo("Padaria Pão Quente", "PAO")).toBe(true)
    expect(contemTermo("5511988880001", "(11) 98888")).toBe(true)
    expect(contemTermo("Maria", "jo")).toBe(false)
    expect(contemTermo("qualquer", "")).toBe(true)
  })
})

describe("QA M13 — telefone do contato na mesma forma da loja", () => {
  it("aceita com DDD e formatação; recusa lixo", () => {
    expect(normalizarWhatsapp("(11) 98888-0001")).toBe("5511988880001")
    expect(normalizarWhatsapp("5511988880001")).toBe("5511988880001")
    expect(normalizarWhatsapp("abcdef")).toBeNull()
    expect(normalizarWhatsapp("1")).toBeNull()
  })
})

describe("QA M15 — preço digitado com ponto como decimal", () => {
  it("'10.50' é 10,50; '1.050,00' é 1050; '10,5' é 10,5", () => {
    expect(paraNumero("10.50")).toBe(10.5)
    expect(paraNumero("1.050,00")).toBe(1050)
    expect(paraNumero("10,5")).toBe(10.5)
    expect(paraNumero("1.050")).toBe(1050)
    expect(paraNumero("")).toBeNull()
  })
})

describe("QA M17 — período personalizado do dashboard", () => {
  const agora = new Date("2026-10-20T15:00:00")

  it("só a data final: 30 dias até ela", () => {
    const r = rangeDoPeriodo({ periodo: "custom", inicio: "", fim: "2026-10-10" } as never, FUSO_DA_OPERACAO, agora)
    expect(r.fim.toISOString()).toBe(new Date("2026-10-10T23:59:59").toISOString())
    expect(r.inicio.toISOString()).toBe(new Date("2026-09-10T00:00:00").toISOString())
  })

  it("inicial depois da final: vale a ordem certa, em vez de zerar tudo", () => {
    const r = rangeDoPeriodo({ periodo: "custom", inicio: "2026-10-15", fim: "2026-10-01" } as never, FUSO_DA_OPERACAO, agora)
    expect(r.inicio.toISOString()).toBe(new Date("2026-10-01T00:00:00").toISOString())
    expect(r.fim.toISOString()).toBe(new Date("2026-10-15T23:59:59").toISOString())
  })

  it("inicial e final em ordem: como antes", () => {
    const r = rangeDoPeriodo({ periodo: "custom", inicio: "2026-10-01", fim: "2026-10-15" } as never, FUSO_DA_OPERACAO, agora)
    expect(r.inicio.toISOString()).toBe(new Date("2026-10-01T00:00:00").toISOString())
    expect(r.fim.toISOString()).toBe(new Date("2026-10-15T23:59:59").toISOString())
  })
})
