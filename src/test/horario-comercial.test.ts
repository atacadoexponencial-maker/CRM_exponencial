// Testes do horário comercial (B11-08): conferência, leitura do banco, "dentro
// do horário" no fuso de São Paulo e a frase que o painel mostra.
// Datas de outubro de 2026: dia 7 é quarta e dia 10 é sábado. São Paulo está em
// UTC-3 o ano todo.

import { describe, it, expect } from "vitest"
import {
  HORARIO_PADRAO,
  dentroDoHorario,
  descreverHorario,
  horarioDoBanco,
  problemaDoHorario,
} from "@/lib/horario-comercial"

const SEG_A_SEX = { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" }

describe("problemaDoHorario", () => {
  it("aceita o padrão", () => {
    expect(problemaDoHorario(HORARIO_PADRAO)).toBeNull()
  })

  it("recusa sem dia, com dia repetido ou fora de 0 a 6", () => {
    expect(problemaDoHorario({ ...SEG_A_SEX, dias: [] })).toBe("Marque pelo menos um dia")
    expect(problemaDoHorario({ ...SEG_A_SEX, dias: [1, 1] })).toBe("Os dias marcados não são válidos")
    expect(problemaDoHorario({ ...SEG_A_SEX, dias: [7] })).toBe("Os dias marcados não são válidos")
  })

  it("recusa hora fora do formato e fim antes do início ou igual a ele", () => {
    expect(problemaDoHorario({ ...SEG_A_SEX, inicio: "8:00" })).toBe("Use horas no formato 08:00")
    expect(problemaDoHorario({ ...SEG_A_SEX, fim: "24:00" })).toBe("Use horas no formato 08:00")
    expect(problemaDoHorario({ ...SEG_A_SEX, inicio: "18:00", fim: "08:00" })).toBe("O fim precisa ser depois do início")
    expect(problemaDoHorario({ ...SEG_A_SEX, inicio: "08:00", fim: "08:00" })).toBe("O fim precisa ser depois do início")
  })
})

describe("horarioDoBanco", () => {
  it("sem linha, vale o padrão", () => {
    expect(horarioDoBanco(null)).toEqual(HORARIO_PADRAO)
  })

  it("corta os segundos do time e ordena os dias", () => {
    expect(horarioDoBanco({ dias: [5, 1, 3], inicio: "09:30:00", fim: "17:00:00" })).toEqual({
      dias: [1, 3, 5],
      inicio: "09:30",
      fim: "17:00",
    })
  })
})

describe("dentroDoHorario", () => {
  it("quarta às 9h de Brasília está dentro; às 7h59, fora", () => {
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T12:00:00Z"))).toBe(true)
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T10:59:00Z"))).toBe(false)
  })

  it("o início conta como dentro e o fim, como fora", () => {
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T11:00:00Z"))).toBe(true)
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T21:00:00Z"))).toBe(false)
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T20:59:00Z"))).toBe(true)
  })

  it("sábado não marcado está fora em qualquer hora", () => {
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-10T13:00:00Z"))).toBe(false)
  })

  it("usa o dia e a hora de Brasília, e não os do servidor em UTC", () => {
    // Sábado 01:00 em UTC é sexta 22:00 em Brasília
    const ateAs23 = { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "23:00" }
    expect(dentroDoHorario(ateAs23, new Date("2026-10-10T01:00:00Z"))).toBe(true)
    // Quarta 22:30 em UTC é 19:30 em Brasília: fora das 08:00 às 18:00
    expect(dentroDoHorario(SEG_A_SEX, new Date("2026-10-07T22:30:00Z"))).toBe(false)
  })

  it("meia-noite em ponto é 00:00, não 24:00", () => {
    const madrugada = { dias: [3], inicio: "00:00", fim: "06:00" }
    expect(dentroDoHorario(madrugada, new Date("2026-10-07T03:00:00Z"))).toBe(true)
  })
})

describe("descreverHorario", () => {
  it("dias seguidos viram faixa", () => {
    expect(descreverHorario(SEG_A_SEX)).toBe("Seg a Sex, das 08:00 às 18:00")
  })

  it("dias soltos viram lista, e a semana toda, 'todos os dias'", () => {
    expect(descreverHorario({ ...SEG_A_SEX, dias: [1, 3, 5] })).toBe("Seg, Qua e Sex, das 08:00 às 18:00")
    expect(descreverHorario({ ...SEG_A_SEX, dias: [0, 6] })).toBe("Dom e Sáb, das 08:00 às 18:00")
    expect(descreverHorario({ ...SEG_A_SEX, dias: [1, 3, 4, 5] })).toBe("Seg e Qua a Sex, das 08:00 às 18:00")
    expect(descreverHorario({ ...SEG_A_SEX, dias: [0, 1, 2, 3, 4, 5, 6] })).toBe("Todos os dias, das 08:00 às 18:00")
  })
})
