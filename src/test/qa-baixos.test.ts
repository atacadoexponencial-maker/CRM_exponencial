// QA de 06/10/2026, achados baixos que viraram regra testável: destino do login,
// gráfico por mês em período longo, linha "Sem atendente" na performance, CSV em
// ANSI, follow-up no passado e nome do pedido na loja.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
// B48-14: a empresa do teste está no horário de Brasília
vi.mock("@/lib/fuso-da-empresa", () => ({ fusoDaEmpresa: async () => "America/Sao_Paulo" }))

import { destinoSeguro } from "@/app/login/destino"
import { calcularMetricas, calcularPerformanceVendedores, SEM_ATENDENTE, type CardRow } from "@/lib/metricas-dashboard"
import { lerArquivoPlanilha } from "@/lib/catalogo/importacao"
import { sessaoAtual } from "@/lib/sessao"
import { criarFollowUp } from "@/app/(auth)/agenda/actions"

describe("login volta para a página pedida", () => {
  it("aceita caminho interno; recusa externo, //, /login e vazio", () => {
    expect(destinoSeguro("/contatos?busca=ana")).toBe("/contatos?busca=ana")
    expect(destinoSeguro("//evil.com")).toBeNull()
    expect(destinoSeguro("https://evil.com")).toBeNull()
    expect(destinoSeguro("/login")).toBeNull()
    expect(destinoSeguro("/cadastro")).toBeNull()
    expect(destinoSeguro("")).toBeNull()
    expect(destinoSeguro(undefined)).toBeNull()
  })
})

const card = (parcial: Partial<CardRow>): CardRow => ({
  id: "c", funil: "entrada", etapa: "lead", created_at: "2026-01-01T00:00:00Z", contact_id: "x", atendente_id: null, ...parcial,
})

describe("gráfico de leads por período", () => {
  it("90 dias: barras por semana; um ano: por mês, com o ano no rótulo", () => {
    const curto = calcularMetricas([], [], [], { inicio: new Date("2026-07-01T00:00:00"), fim: new Date("2026-09-28T23:59:59") })
    expect(curto.entrada.leadsPorSemana.length).toBeLessThanOrEqual(14)
    expect(curto.entrada.leadsPorSemana[0].label).toBe("01/07")

    const longo = calcularMetricas([], [], [], { inicio: new Date("2025-10-01T00:00:00"), fim: new Date("2026-09-30T23:59:59") })
    expect(longo.entrada.leadsPorSemana.length).toBe(12)
    expect(longo.entrada.leadsPorSemana[0].label).toBe("10/25")
  })
})

describe("performance mostra os leads sem atendente", () => {
  it("cards sem atendente ganham a linha 'Sem atendente'; sem eles, ela não aparece", () => {
    const range = { inicio: new Date("2025-12-01T00:00:00"), fim: new Date("2026-12-31T23:59:59") }
    const com = calcularPerformanceVendedores([{ id: "a-1", nome: "Ana" }], [card({ id: "1", atendente_id: "a-1" }), card({ id: "2", atendente_id: null })], [], [], range)
    expect(com.map((l) => [l.atendenteId, l.leadsCriados])).toEqual([["a-1", 1], [SEM_ATENDENTE, 1]])
    expect(com[1].nome).toBe("Sem atendente")
    const sem = calcularPerformanceVendedores([{ id: "a-1", nome: "Ana" }], [card({ id: "1", atendente_id: "a-1" })], [], [], range)
    expect(sem.map((l) => l.atendenteId)).toEqual(["a-1"])
  })
})

describe("CSV salvo em ANSI pelo Excel", () => {
  it("lê os acentos como windows-1252 quando não é UTF-8", () => {
    const ansi = new Uint8Array([0x6e, 0x6f, 0x6d, 0x65, 0x0a, 0x50, 0xe3, 0x6f, 0x0a]) // "nome\nPão\n"
    expect(lerArquivoPlanilha("produtos.csv", ansi.buffer)).toEqual([["nome"], ["Pão"]])
    const utf8 = new TextEncoder().encode("nome\nPão\n")
    expect(lerArquivoPlanilha("produtos.csv", utf8.buffer as ArrayBuffer)).toEqual([["nome"], ["Pão"]])
  })
})

describe("follow-up no passado", () => {
  beforeEach(() => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "is", "insert"]) obj[m] = vi.fn(() => obj)
    obj.single = vi.fn(async () => ({ data: { workspace_id: "ws-1" }, error: null }))
    vi.mocked(sessaoAtual).mockResolvedValue({ supabase: { from: () => obj }, user: { id: "u-1" }, perfil: { workspace_id: "ws-1", role: "admin" } } as never)
  })

  it("data de ontem é recusada", async () => {
    expect(await criarFollowUp({ contactId: "c-1", data: "2020-01-01", hora: "10:00", nota: "ligar" })).toEqual({ erro: "A data do follow-up já passou." })
  })
})
