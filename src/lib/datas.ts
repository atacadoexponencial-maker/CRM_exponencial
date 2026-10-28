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
// O fuso é o da empresa, e não o do aparelho de quem olha: "a mensagem chegou às
// 16h" precisa querer dizer a mesma coisa para o vendedor, o gerente e o dono.
// Começa em Brasília e o Admin troca em Configurações → Empresa (B48-14). Por
// isso todo formatador pede o fuso: esquecer de passar é erro de tipo, e não uma
// tela que volta para Brasília sem ninguém ver.

/** O fuso de quem ainda não escolheu, e o dos filtros do banco e da janela das campanhas. */
export const FUSO_DA_OPERACAO = "America/Sao_Paulo"

/**
 * Os fusos que o Admin pode escolher: os do Brasil, nenhum com horário de verão
 * hoje (B48-14, decisão do Luan em 28/10/2026).
 */
export const FUSOS_DO_BRASIL = [
  { id: "America/Noronha", nome: "Fernando de Noronha (UTC−2)" },
  { id: "America/Sao_Paulo", nome: "Brasília (UTC−3)" },
  { id: "America/Cuiaba", nome: "Cuiabá (UTC−4)" },
  { id: "America/Manaus", nome: "Manaus (UTC−4)" },
  { id: "America/Rio_Branco", nome: "Rio Branco (UTC−5)" },
] as const

/** O fuso guardado, se for um dos da lista; senão, Brasília. */
export function fusoValido(fuso: unknown): string {
  return FUSOS_DO_BRASIL.some((f) => f.id === fuso) ? (fuso as string) : FUSO_DA_OPERACAO
}

const DIAS_DA_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// Montar um Intl.DateTimeFormat custa; cada formato é montado uma vez por fuso.
const formatadores = new Map<string, Intl.DateTimeFormat>()

function formatador(fuso: string, local: string, opcoes: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const chave = `${fuso}|${local}|${JSON.stringify(opcoes)}`
  let f = formatadores.get(chave)
  if (!f) {
    f = new Intl.DateTimeFormat(local, { ...opcoes, timeZone: fuso })
    formatadores.set(chave, f)
  }
  return f
}

const HORA: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
const DIA_E_MES: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit" }
const DATA_CURTA: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
const DATA_E_HORA: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" }
const DATA: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }
const DIA_ISO: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" }

/** O dia de calendário no fuso, como aaaa-mm-dd — o que `getDate()` daria se o processo rodasse lá. */
export function diaNoFuso(data: Date, fuso: string): string {
  return formatador(fuso, "en-CA", DIA_ISO).format(data)
}

/** Dia da semana (0 = domingo, como `getDay()`) e minutos desde a meia-noite, no fuso. */
export function relogioNoFuso(data: Date, fuso: string): { diaDaSemana: number; minutos: number } {
  const partes = Object.fromEntries(
    formatador(fuso, "en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(data)
      .map((p) => [p.type, p.value])
  )
  const diaDaSemana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(partes.weekday)
  return { diaDaSemana, minutos: Number(partes.hour) * 60 + Number(partes.minute) }
}

/** Quanto o relógio do fuso está à frente do UTC naquele instante, em ms (negativo no Brasil). */
function deslocamento(instante: number, fuso: string): number {
  const p = Object.fromEntries(
    formatador(fuso, "en-US", { ...DIA_ISO, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(instante))
      .map((x) => [x.type, x.value])
  )
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(instante / 1000) * 1000
}

/**
 * O instante em que o relógio do fuso marca aquele dia e aquela hora: o que a
 * pessoa digitou num formulário vira o que o banco guarda.
 */
export function instanteNoFuso(dia: string, hora: string, fuso: string): Date {
  const [ano, mes, d] = dia.split("-").map(Number)
  const [h, m, s = 0] = hora.split(":").map(Number)
  const comoSeFosseUtc = Date.UTC(ano, mes - 1, d, h, m, s)
  // A segunda volta acerta o dia em que um fuso troca de horário
  const primeira = comoSeFosseUtc - deslocamento(comoSeFosseUtc, fuso)
  return new Date(comoSeFosseUtc - deslocamento(primeira, fuso))
}

/**
 * Quantos dias de calendário separam as duas datas, contados no fuso.
 *
 * Por dia de calendário, e não por 24 horas corridas: mensagem das 23h de ontem
 * vista às 8h de hoje é "Ontem", não "hoje há 9 horas".
 */
function diasDeDiferenca(quando: Date, agora: Date, fuso: string): number {
  const inicioDe = (data: Date) => Date.parse(`${diaNoFuso(data, fuso)}T00:00:00Z`)
  return Math.round((inicioDe(agora) - inicioDe(quando)) / 86_400_000)
}

/** Só a hora: `14:32`. É o que aparece embaixo de cada balão de mensagem. */
export function formatarHoraDoDia(iso: string, fuso: string): string {
  return formatador(fuso, "pt-BR", HORA).format(new Date(iso))
}

/** Dia, mês e hora: `22/10 14:30`. É o vencimento de cada item da Agenda. */
export function formatarDiaEHora(iso: string, fuso: string): string {
  return `${formatarDiaDoMes(iso, fuso)} ${formatarHoraDoDia(iso, fuso)}`
}

/**
 * Quantos dias de calendário faltam até a data, no fuso: 0 é hoje, 1 é amanhã,
 * negativo é um dia que já passou. A Agenda agrupa por ele.
 */
export function diasAte(iso: string, fuso: string, agora: Date = new Date()): number {
  // A diferença ao contrário: de agora até a data
  return diasDeDiferenca(agora, new Date(iso), fuso)
}

/** Dia e mês: `22/10`. */
export function formatarDiaDoMes(iso: string, fuso: string): string {
  return formatador(fuso, "pt-BR", DIA_E_MES).format(new Date(iso))
}

/** Data e hora: `27/10/2026, 15:00`. É o histórico do card e as datas das campanhas (B48-01). */
export function formatarDataEHora(iso: string, fuso: string): string {
  return formatador(fuso, "pt-BR", DATA_E_HORA).format(new Date(iso))
}

/** Só a data, no fuso: `27/10/2026`. */
export function formatarData(iso: string, fuso: string): string {
  return formatador(fuso, "pt-BR", DATA).format(new Date(iso))
}

/**
 * Data de calendário guardada sem hora (`2026-10-27`), como a da compra: `27/10/2026`.
 * Não passa por fuso, porque não é um instante: virar `Date` a deslocaria um dia (B48-01).
 */
export function formatarDataDoCalendario(dia: string): string {
  const [ano, mes, d] = dia.slice(0, 10).split("-")
  return `${d}/${mes}/${ano}`
}

/**
 * Data (`2026-10-27`) e hora (`15:00`) no fuso, como os campos de data e hora de
 * um formulário esperam. É o que o "Editar follow-up" preenche (B48-06).
 */
export function paraCamposDoFormulario(iso: string, fuso: string): { data: string; hora: string } {
  return { data: diaNoFuso(new Date(iso), fuso), hora: formatarHoraDoDia(iso, fuso) }
}

/** Período entre dois instantes, no fuso: `01/10 a 27/10` (B48-10). */
export function formatarIntervalo(inicioIso: string, fimIso: string, fuso: string): string {
  return `${formatarDiaDoMes(inicioIso, fuso)} a ${formatarDiaDoMes(fimIso, fuso)}`
}

/** Período entre dois dias de calendário (`2026-10-01`, `2026-10-27`): `01/10 a 27/10`. */
export function formatarIntervaloDoCalendario(de: string, ate: string): string {
  const diaEMes = (dia: string) => formatarDataDoCalendario(dia).slice(0, 5)
  return `${diaEMes(de)} a ${diaEMes(ate)}`
}

/** Data curta: `15 abr. 2026`. */
export function formatarDataCurta(iso: string, fuso: string): string {
  return formatador(fuso, "pt-BR", DATA_CURTA).format(new Date(iso))
}

/**
 * Carimbo da lista de conversas: hora se foi hoje, "Ontem", o dia da semana na
 * última semana, e a data cheia antes disso.
 */
export function formatarHorarioDaLista(iso: string, fuso: string, agora: Date = new Date()): string {
  const data = new Date(iso)
  const dias = diasDeDiferenca(data, agora, fuso)

  if (dias <= 0) return formatarHoraDoDia(iso, fuso)
  if (dias === 1) return "Ontem"
  if (dias < 7) return DIAS_DA_SEMANA[relogioNoFuso(data, fuso).diaDaSemana]
  return formatarDataCurta(iso, fuso)
}

/** Formato só daquela tela (o cabeçalho do Dashboard, a planilha de pedidos), no fuso. */
export function formatarNoFuso(data: Date, fuso: string, opcoes: Intl.DateTimeFormatOptions, local = "pt-BR"): string {
  return formatador(fuso, local, opcoes).format(data)
}
