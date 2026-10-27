// Data e hora como o atendente lê na tela.
//
// O banco guarda tudo em UTC, que é o certo. O erro estava na hora de mostrar:
// a lista de conversas e as mensagens eram formatadas no SERVIDOR, e o servidor
// da Vercel roda em UTC. Conversa das 16h aparecia como 19h. O mesmo trecho
// rodando no navegador mostrava certo, então o horário mudava conforme quem
// tinha montado a tela — servidor na primeira carga, navegador depois.
//
// A saída é um formatador só, com o fuso ESCRITO. Servidor e navegador passam a
// concordar, e o atendente vê o horário da operação mesmo acessando de fora do
// país.
//
// Fuso fixo, e não o do aparelho de quem olha, porque a operação é brasileira:
// "a mensagem chegou às 16h" precisa querer dizer a mesma coisa para o vendedor,
// o gerente e o dono. Fuso por empresa é outra conversa, e exige coluna no
// workspace e tela para escolher.

export const FUSO_DA_OPERACAO = "America/Sao_Paulo"

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  hour: "2-digit",
  minute: "2-digit",
})

const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  day: "2-digit",
  month: "2-digit",
})

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const DATA_E_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  dateStyle: "short",
  timeStyle: "short",
})

const DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

/** Partes do dia no fuso da operação — o que `getDate()` daria se o processo rodasse lá. */
function partesNoFuso(data: Date): { ano: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_DA_OPERACAO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data)

  const [ano, mes, dia] = partes.split("-").map(Number)
  return { ano, mes, dia }
}

/**
 * Quantos dias de calendário separam as duas datas, contados no fuso da operação.
 *
 * Por dia de calendário, e não por 24 horas corridas: mensagem das 23h de ontem
 * vista às 8h de hoje é "Ontem", não "hoje há 9 horas".
 */
function diasDeDiferenca(quando: Date, agora: Date): number {
  const a = partesNoFuso(quando)
  const b = partesNoFuso(agora)

  const inicioDe = (p: { ano: number; mes: number; dia: number }) => Date.UTC(p.ano, p.mes - 1, p.dia)
  return Math.round((inicioDe(b) - inicioDe(a)) / 86_400_000)
}

/** Só a hora: `14:32`. É o que aparece embaixo de cada balão de mensagem. */
export function formatarHoraDoDia(iso: string): string {
  return HORA.format(new Date(iso))
}

/** Dia, mês e hora: `22/10 14:30`. É o vencimento de cada item da Agenda. */
export function formatarDiaEHora(iso: string): string {
  return `${DIA_E_MES.format(new Date(iso))} ${formatarHoraDoDia(iso)}`
}

/**
 * Quantos dias de calendário faltam até a data, no fuso da operação: 0 é hoje,
 * 1 é amanhã, negativo é um dia que já passou. A Agenda agrupa por ele.
 */
export function diasAte(iso: string, agora: Date = new Date()): number {
  // A diferença ao contrário: de agora até a data
  return diasDeDiferenca(agora, new Date(iso))
}

/** Dia e mês: `22/10`. */
export function formatarDiaDoMes(iso: string): string {
  return DIA_E_MES.format(new Date(iso))
}

/** Data e hora: `27/10/2026, 15:00`. É o histórico do card e as datas das campanhas (B46-01). */
export function formatarDataEHora(iso: string): string {
  return DATA_E_HORA.format(new Date(iso))
}

/** Só a data, no fuso da operação: `27/10/2026`. */
export function formatarData(iso: string): string {
  return DATA.format(new Date(iso))
}

/**
 * Data de calendário guardada sem hora (`2026-10-27`), como a da compra: `27/10/2026`.
 * Não passa por fuso, porque não é um instante: virar `Date` a deslocaria um dia (B46-01).
 */
export function formatarDataDoCalendario(dia: string): string {
  const [ano, mes, d] = dia.slice(0, 10).split("-")
  return `${d}/${mes}/${ano}`
}

/**
 * Data (`2026-10-27`) e hora (`15:00`) no fuso da operação, como os campos de data
 * e hora de um formulário esperam. É o que o "Editar follow-up" preenche (B46-06).
 */
export function paraCamposDoFormulario(iso: string): { data: string; hora: string } {
  const { ano, mes, dia } = partesNoFuso(new Date(iso))
  const data = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
  return { data, hora: formatarHoraDoDia(iso) }
}

/** Data curta: `15 abr. 2026`. */
export function formatarDataCurta(iso: string): string {
  return DATA_CURTA.format(new Date(iso))
}

/**
 * Carimbo da lista de conversas: hora se foi hoje, "Ontem", o dia da semana na
 * última semana, e a data cheia antes disso.
 */
export function formatarHorarioDaLista(iso: string, agora: Date = new Date()): string {
  const data = new Date(iso)
  const dias = diasDeDiferenca(data, agora)

  if (dias <= 0) return formatarHoraDoDia(iso)
  if (dias === 1) return "Ontem"
  if (dias < 7) return DIAS_DA_SEMANA[diaDaSemanaNoFuso(data)]
  return formatarDataCurta(iso)
}

/** 0 = domingo, como `Date.getDay()`, mas contado no fuso da operação. */
function diaDaSemanaNoFuso(data: Date): number {
  const { ano, mes, dia } = partesNoFuso(data)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}
