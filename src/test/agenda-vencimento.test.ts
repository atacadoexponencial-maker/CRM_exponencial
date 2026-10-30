// B53-09 — follow-up de hoje sem horário vai para a próxima hora cheia, no fuso
// da empresa. O relógio é fixo e o processo roda em UTC, como o servidor.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { lerVencimento } from "@/app/(auth)/agenda/vencimento"
import { FUSO_DA_OPERACAO } from "@/lib/datas"

const fusoDaMaquina = process.env.TZ
beforeAll(() => {
  process.env.TZ = "UTC"
})
afterAll(() => {
  process.env.TZ = fusoDaMaquina
})
afterEach(() => {
  vi.useRealTimers()
})

/** Fixa o relógio numa hora de Brasília do dia 30/10/2026. */
const agoraEmBrasilia = (hora: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`2026-10-30T${hora}:00-03:00`))
}

describe("B53-09 — follow-up de hoje sem horário", () => {
  it("CA-B53-19: should salvar para hoje às 15:00 quando agora são 14:20, sem o erro de data passada", () => {
    agoraEmBrasilia("14:20")
    const r = lerVencimento("2026-10-30", undefined, FUSO_DA_OPERACAO)
    expect(r).not.toHaveProperty("erro")
    expect("dueAt" in r && r.dueAt.toISOString()).toBe(new Date("2026-10-30T15:00:00-03:00").toISOString())
  })

  it("CA-B53-19: should ir para 15:00 quando agora são 14:00 em ponto", () => {
    agoraEmBrasilia("14:00")
    const r = lerVencimento("2026-10-30", "", FUSO_DA_OPERACAO)
    expect("dueAt" in r && r.dueAt.toISOString()).toBe(new Date("2026-10-30T15:00:00-03:00").toISOString())
  })

  it("CA-B53-19: should ir para 23:59 de hoje depois das 23h (SUP-B53-03)", () => {
    agoraEmBrasilia("23:20")
    const r = lerVencimento("2026-10-30", undefined, FUSO_DA_OPERACAO)
    expect("dueAt" in r && r.dueAt.toISOString()).toBe(new Date("2026-10-30T23:59:00-03:00").toISOString())
  })

  it("CA-B53-19: should manter 09:00 para outro dia sem horário e recusar hora digitada que já passou", () => {
    agoraEmBrasilia("14:20")
    const amanha = lerVencimento("2026-10-31", undefined, FUSO_DA_OPERACAO)
    expect("dueAt" in amanha && amanha.dueAt.toISOString()).toBe(new Date("2026-10-31T09:00:00-03:00").toISOString())
    expect(lerVencimento("2026-10-30", "10:00", FUSO_DA_OPERACAO)).toEqual({ erro: "A data do follow-up já passou." })
  })
})
