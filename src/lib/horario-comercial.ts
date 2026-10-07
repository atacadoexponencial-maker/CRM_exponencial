// Horário comercial da empresa (B11-08): os dias e a faixa em que vale a
// condição "dentro do horário comercial" das automações. Puro: usado pelo motor,
// pela action que grava e pelo diálogo da tela.
//
// A hora é lida no fuso da operação, e não no do servidor: a Vercel roda em UTC,
// e 20h em São Paulo seria 23h lá (ver src/lib/datas.ts). Uma faixa só para
// todos os dias marcados, como a spec pede, e sem atravessar a meia-noite.

import { FUSO_DA_OPERACAO } from "@/lib/datas"

export interface HorarioComercial {
  /** 0 = domingo … 6 = sábado, como o `getDay()`. */
  dias: number[]
  /** "HH:MM" */
  inicio: string
  fim: string
}

/** Vale enquanto a empresa não grava o dela. */
export const HORARIO_PADRAO: HorarioComercial = { dias: [1, 2, 3, 4, 5], inicio: "08:00", fim: "18:00" }

export const NOMES_DOS_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))

/** O que impede de gravar, em português; `null` quando vale. */
export function problemaDoHorario(horario: HorarioComercial): string | null {
  const { dias, inicio, fim } = horario
  if (dias.length === 0) return "Marque pelo menos um dia"
  if (dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || new Set(dias).size !== dias.length) {
    return "Os dias marcados não são válidos"
  }
  if (!FORMATO_HORA.test(inicio) || !FORMATO_HORA.test(fim)) return "Use horas no formato 08:00"
  if (minutos(inicio) >= minutos(fim)) return "O fim precisa ser depois do início"
  return null
}

/**
 * A linha do banco no formato da tela (o banco devolve `time` como "08:00:00").
 * Sem linha, o padrão.
 */
export function horarioDoBanco(linha: { dias: number[]; inicio: string; fim: string } | null): HorarioComercial {
  if (!linha) return HORARIO_PADRAO
  return { dias: [...linha.dias].sort((a, b) => a - b), inicio: linha.inicio.slice(0, 5), fim: linha.fim.slice(0, 5) }
}

const PARTES_NO_FUSO = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_DA_OPERACAO,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const DIA_EM_INGLES: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Dia marcado e hora entre o início (incluído) e o fim (excluído): às 18:00 em ponto, já está fora. */
export function dentroDoHorario(horario: HorarioComercial, agora: Date): boolean {
  const partes = Object.fromEntries(PARTES_NO_FUSO.formatToParts(agora).map((p) => [p.type, p.value]))
  const dia = DIA_EM_INGLES[partes.weekday]
  const agoraEmMinutos = Number(partes.hour) * 60 + Number(partes.minute)
  return horario.dias.includes(dia) && agoraEmMinutos >= minutos(horario.inicio) && agoraEmMinutos < minutos(horario.fim)
}

/** "Seg a Sex, das 08:00 às 18:00". Três ou mais dias seguidos viram "de … a …". */
export function descreverHorario({ dias, inicio, fim }: HorarioComercial): string {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b)
  const faixa = `das ${inicio} às ${fim}`
  if (ordenados.length === 7) return `Todos os dias, ${faixa}`

  const partes: string[] = []
  let i = 0
  while (i < ordenados.length) {
    let j = i
    while (j + 1 < ordenados.length && ordenados[j + 1] === ordenados[j] + 1) j++
    if (j - i >= 2) partes.push(`${NOMES_DOS_DIAS[ordenados[i]]} a ${NOMES_DOS_DIAS[ordenados[j]]}`)
    else for (let k = i; k <= j; k++) partes.push(NOMES_DOS_DIAS[ordenados[k]])
    i = j + 1
  }
  const lista = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}` : partes[0]
  return `${lista}, ${faixa}`
}
