// Quanto tempo um disparo em massa vai levar (B8-01).
//
// A conta não vem do gateway, e isso é deliberado: a previsão que ele calcula
// por mensagem (`estimated_send_at`) **ignora teto e fechamento da janela**, de
// modo que somá-la daria um número otimista e errado. Aqui a simulação usa as
// quatro restrições juntas — intervalo entre envios, teto por hora, teto por
// dia e janela de horário.
//
// Por que isso importa: com 40 segundos entre envios, mil destinatários levam
// mais de onze horas, e passam da janela. Sem ver isso antes de confirmar, o
// cliente acha que a campanha travou e dispara de novo.

import { GatewayRecusou, type ClienteGateway } from "./cliente"
import type { RitmoDoNumero } from "./tipos"

/**
 * Ritmo do número, na medida que a estimativa usa.
 *
 * Horários em minutos desde a meia-noite, hora de São Paulo — é como o gateway
 * os trata, e evita fuso no meio de uma conta que já é sensível.
 */
export type RitmoParaEstimativa = {
  intervaloSegundos: number
  tetoHora: number
  tetoDia: number
  janelaInicioMin: number
  janelaFimMin: number
}

/**
 * Ritmo assumido quando o gateway não responde.
 *
 * São os padrões do próprio gateway (A6-02 a A6-05): 40s, 60/hora, 500/dia,
 * 08:00 às 20:00. Errar para o lado conservador é o certo aqui — estimativa
 * curta demais é a que faz o cliente achar que travou.
 */
export const RITMO_PADRAO: RitmoParaEstimativa = {
  intervaloSegundos: 40,
  tetoHora: 60,
  tetoDia: 500,
  janelaInicioMin: 8 * 60,
  janelaFimMin: 20 * 60,
}

const MINUTOS_POR_DIA = 24 * 60

function minutosDoHorario(horario: string): number {
  const [h, m] = horario.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Lê o ritmo vigente do número no gateway (seção 4.5 do contrato).
 *
 * Devolve `null` quando não dá para saber — gateway fora do ar, instância
 * removida, número da Meta. Quem chama usa o padrão e diz que é estimativa.
 */
export async function buscarRitmoDoNumero(
  cliente: ClienteGateway,
  instanceId: string,
  instanceToken: string
): Promise<RitmoParaEstimativa | null> {
  try {
    const ritmo = await cliente.comInstancia<RitmoDoNumero>(instanceToken, {
      caminho: `/instances/${instanceId}/rate-profile`,
    })

    // `effective` é o que a fila usa agora: já com aquecimento e limites do
    // sistema aplicados. `configured` mentiria para número novo.
    return {
      intervaloSegundos: ritmo.effective.send_interval_seconds,
      tetoHora: ritmo.effective.hourly_cap,
      tetoDia: ritmo.effective.daily_cap,
      janelaInicioMin: minutosDoHorario(ritmo.effective.send_window_start),
      janelaFimMin: minutosDoHorario(ritmo.effective.send_window_end),
    }
  } catch (erro) {
    // Recusa e indisponibilidade dão no mesmo aqui: sem ritmo, estimativa com
    // o padrão. Nunca derruba a tela de confirmação da campanha.
    if (erro instanceof GatewayRecusou || erro instanceof Error) return null
    return null
  }
}

export type EstimativaDoDisparo = {
  /** Quando a última mensagem sai, se nada mudar. */
  terminaEm: Date
  /** Minutos entre o início e o fim, incluindo o tempo parado fora da janela. */
  minutosTotais: number
  /** Quantos dias de janela o disparo ocupa. 1 = termina hoje. */
  diasDeJanela: number
  /** Frase pronta para a tela. */
  texto: string
}

/** Mensagens por hora: o menor entre o que o intervalo permite e o teto. */
function porHoraEfetivo(ritmo: RitmoParaEstimativa): number {
  const peloIntervalo = Math.floor(3600 / Math.max(1, ritmo.intervaloSegundos))
  return Math.max(0, Math.min(peloIntervalo, ritmo.tetoHora))
}

function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${Math.max(1, Math.round(minutos))} min`

  const horas = minutos / 60
  if (horas < 24) {
    const h = Math.floor(horas)
    const m = Math.round(minutos - h * 60)
    return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`
  }

  const dias = Math.ceil(horas / 24)
  return `${dias} dias`
}

function formatarQuando(data: Date): string {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Simula o disparo dia a dia, respeitando as quatro restrições.
 *
 * A simulação é por dia inteiro, e não mensagem a mensagem: com campanhas de
 * dezenas de milhares de destinatários, iterar por mensagem custaria caro para
 * dar o mesmo resultado.
 */
export function estimarDuracaoDoDisparo({
  destinatarios,
  ritmo = RITMO_PADRAO,
  agora = new Date(),
}: {
  destinatarios: number
  ritmo?: RitmoParaEstimativa
  agora?: Date
}): EstimativaDoDisparo {
  const inicio = new Date(agora)

  if (destinatarios <= 0) {
    return { terminaEm: inicio, minutosTotais: 0, diasDeJanela: 0, texto: "Sem destinatários" }
  }

  const porHora = porHoraEfetivo(ritmo)
  const janelaValida = ritmo.janelaFimMin > ritmo.janelaInicioMin

  if (porHora <= 0 || ritmo.tetoDia <= 0 || !janelaValida) {
    return {
      terminaEm: inicio,
      minutosTotais: 0,
      diasDeJanela: 0,
      texto: "Não é possível estimar: o ritmo configurado não permite envios.",
    }
  }

  const minutoAtual = inicio.getHours() * 60 + inicio.getMinutes()

  // Cursor em minutos desde a meia-noite de hoje; passa de 1440 ao virar o dia.
  // Fora da janela, o disparo só começa na próxima abertura.
  let cursor = minutoAtual
  if (minutoAtual < ritmo.janelaInicioMin) cursor = ritmo.janelaInicioMin
  else if (minutoAtual >= ritmo.janelaFimMin) cursor = MINUTOS_POR_DIA + ritmo.janelaInicioMin

  let restantes = destinatarios
  let enviadosNoDia = 0
  let diaCorrente = Math.floor(cursor / MINUTOS_POR_DIA)
  const diasTocados = new Set<number>()

  // Teto de segurança: mesmo no pior ritmo, a conta fecha muito antes disso.
  // Existe para uma configuração absurda não virar laço infinito em produção.
  const LIMITE_DE_DIAS = 3650

  while (restantes > 0 && diaCorrente < LIMITE_DE_DIAS) {
    const dia = Math.floor(cursor / MINUTOS_POR_DIA)
    if (dia !== diaCorrente) {
      diaCorrente = dia
      enviadosNoDia = 0
    }

    const fimDaJanelaHoje = dia * MINUTOS_POR_DIA + ritmo.janelaFimMin
    const minutosDisponiveis = fimDaJanelaHoje - cursor
    const cabeNoTempo = Math.floor((minutosDisponiveis / 60) * porHora)
    const cabeNoTeto = ritmo.tetoDia - enviadosNoDia
    const cabeHoje = Math.max(0, Math.min(cabeNoTempo, cabeNoTeto))

    if (cabeHoje <= 0) {
      // Janela fechada ou teto do dia esgotado: espera a abertura seguinte.
      cursor = (dia + 1) * MINUTOS_POR_DIA + ritmo.janelaInicioMin
      continue
    }

    const enviaAgora = Math.min(restantes, cabeHoje)
    cursor += Math.ceil((enviaAgora / porHora) * 60)
    enviadosNoDia += enviaAgora
    restantes -= enviaAgora
    diasTocados.add(dia)
  }

  const minutosDecorridos = cursor - minutoAtual

  const terminaEm = new Date(inicio.getTime() + minutosDecorridos * 60_000)

  const dias = diasTocados.size

  const texto =
    dias > 1
      ? `Cerca de ${formatarDuracao(minutosDecorridos)} — termina em ${formatarQuando(terminaEm)}. O envio para todo dia no fim da janela e recomeça no dia seguinte.`
      : `Cerca de ${formatarDuracao(minutosDecorridos)} — termina em ${formatarQuando(terminaEm)}.`

  return { terminaEm, minutosTotais: minutosDecorridos, diasDeJanela: dias, texto }
}
