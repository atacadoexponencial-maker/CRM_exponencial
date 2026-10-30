// Vencimento dos lembretes da Agenda, sempre no fuso da empresa (B53-09).
// Funções puras: recebem o "agora", para o servidor e os testes concordarem.

import { diaNoFuso, formatarNoFuso, instanteNoFuso, relogioNoFuso } from "@/lib/datas"

/** Soma dias a um dia de calendário (aaaa-mm-dd), sem passar por fuso. */
function somarDias(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number)
  return new Date(Date.UTC(ano, mes - 1, d + dias)).toISOString().slice(0, 10)
}

/**
 * A hora de um follow-up sem hora: hoje, a próxima hora cheia (14:20 e 14:00 vão
 * para 15:00), ou 23:59 depois das 23h (SUP-B53-03); outro dia, 09:00.
 */
function horaPadrao(data: string, fuso: string, agora: Date): string {
  if (data !== diaNoFuso(agora, fuso)) return "09:00"
  const proxima = Math.floor(relogioNoFuso(agora, fuso).minutos / 60) + 1
  return proxima >= 24 ? "23:59" : `${String(proxima).padStart(2, "0")}:00`
}

/**
 * Vencimento do follow-up a partir da data e da hora do formulário, no fuso da
 * empresa (QA M12, 06/10: a Vercel roda em UTC, e 09:00 viraria 06:00; B48-14: o
 * fuso deixou de ser sempre Brasília). Serve ao criar e ao editar (B48-06).
 */
export function lerVencimento(
  data: string,
  hora: string | undefined,
  fuso: string,
  agora: Date = new Date()
): { dueAt: Date } | { erro: string } {
  if (!data) return { erro: "Escolha a data" }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida" }
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Hora inválida" }
  const dueAt = instanteNoFuso(data, hora || horaPadrao(data, fuso, agora), fuso)
  if (Number.isNaN(dueAt.getTime())) return { erro: "Data inválida" }
  // QA baixos (06/10): follow-up no passado nasceria atrasado.
  if (dueAt.getTime() < agora.getTime() - 60_000) return { erro: "A data do follow-up já passou." }
  return { dueAt }
}

/**
 * "Adiar N dias": soma ao vencimento atual, no mesmo horário. Se ainda ficar no
 * passado (lembrete muito atrasado), vai para hoje + N dias, no horário do original.
 */
export function vencimentoAoAdiar(dueAtIso: string, dias: number, fuso: string, agora: Date = new Date()): Date {
  const original = new Date(dueAtIso)
  const horario = formatarNoFuso(original, fuso, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }, "en-GB")
  const somado = instanteNoFuso(somarDias(diaNoFuso(original, fuso), dias), horario, fuso)
  if (somado.getTime() > agora.getTime()) return somado
  return instanteNoFuso(somarDias(diaNoFuso(agora, fuso), dias), horario, fuso)
}
