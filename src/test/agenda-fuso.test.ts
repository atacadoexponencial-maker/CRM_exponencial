// A Agenda mostra o vencimento e agrupa por dia no fuso da operação (Brasília),
// rode onde rodar. O servidor da Vercel roda em UTC: com o fuso da máquina, a
// página do servidor e a do navegador saíam diferentes, e o React descartava a
// do servidor (erro #418, achado no roteiro da B28-01 em 20/10/2026).
// Aqui o processo roda em UTC, como o servidor.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { ItemAgenda } from "@/app/(auth)/agenda/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/agenda/actions", () => ({}))

import { grupoDoItem } from "@/app/(auth)/agenda/agenda-client"
import { diasAte, formatarDiaEHora, FUSO_DA_OPERACAO } from "@/lib/datas"

const fusoDaMaquina = process.env.TZ
beforeAll(() => {
  process.env.TZ = "UTC"
})
afterAll(() => {
  process.env.TZ = fusoDaMaquina
})

const item = (dueAt: string): ItemAgenda => ({
  id: "l",
  origem: "avulso",
  automacaoNome: null,
  contatoNome: "Ana",
  contatoId: "c",
  conversaId: null,
  instrucao: "",
  dueAt,
  atrasado: false,
  atendenteNome: "Ana",
  atendenteId: "ana",
})

describe("Agenda no fuso da operação", () => {
  it("o vencimento sai na hora de Brasília, com o servidor em UTC", () => {
    // 23/10 às 02:00 UTC é 22/10 às 23:00 em Brasília
    expect(formatarDiaEHora("2026-10-23T02:00:00.000Z", FUSO_DA_OPERACAO)).toBe("22/10 23:00")
  })

  it("às 22h de Brasília, um vencimento às 23h do mesmo dia é Hoje, não Amanhã", () => {
    const agora = new Date("2026-10-23T01:00:00.000Z") // 22/10, 22:00 em Brasília
    expect(diasAte("2026-10-23T02:00:00.000Z", FUSO_DA_OPERACAO, agora)).toBe(0)
    expect(grupoDoItem(item("2026-10-23T02:00:00.000Z"), FUSO_DA_OPERACAO, agora)).toBe("hoje")
  })

  it("às 22h de Brasília, um vencimento às 10h do dia seguinte é Amanhã", () => {
    const agora = new Date("2026-10-23T01:00:00.000Z")
    expect(grupoDoItem(item("2026-10-23T13:00:00.000Z"), FUSO_DA_OPERACAO, agora)).toBe("amanha")
  })

  it("o que já passou continua em Atrasados", () => {
    const agora = new Date("2026-10-23T01:00:00.000Z")
    expect(grupoDoItem(item("2026-10-22T23:00:00.000Z"), FUSO_DA_OPERACAO, agora)).toBe("atrasados")
  })
})
