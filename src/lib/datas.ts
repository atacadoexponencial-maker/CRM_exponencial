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

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_DA_OPERACAO,
  day: "2-digit",
  month: "short",
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
