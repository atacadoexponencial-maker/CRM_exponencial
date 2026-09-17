// Quanto tempo uma campanha levaria num dado ritmo (B5-02) — cálculo puro.
//
// Existe para o cliente não configurar um ritmo com que a campanha dele levaria
// uma semana sem perceber. É **informativo**: arredonda para cima e se
// apresenta como aproximação, nunca como promessa.
//
// Não usa o `estimated_send_at` que o gateway devolve por mensagem: segundo as
// pendências da Parte A, aquela previsão ignora teto e fechamento da janela — é
// justamente o que faz a diferença entre "2 horas" e "3 dias".
//
// O que a conta considera, nesta ordem: o intervalo entre mensagens, o teto por
// hora, o teto por dia e o tamanho da janela de envio.

export type RitmoParaEstimativa = {
  intervaloSegundos: number
  tetoHora: number
  tetoDia: number
  /** Minutos desde a meia-noite. */
  janelaInicioMin: number
  janelaFimMin: number
}

export type EstimativaDeCampanha = {
  /** Sempre >= 1 quando há mensagem a enviar. */
  horas: number
  dias: number
  /** Quantas mensagens cabem num dia de envio, com este ritmo. */
  porDia: number
  texto: string
}

function minutosDaJanela(r: RitmoParaEstimativa): number {
  return Math.max(0, r.janelaFimMin - r.janelaInicioMin)
}

/**
 * Mensagens que cabem em uma hora: o menor entre o que o intervalo permite e o
 * teto por hora. Intervalo de 40s permite 90 por hora, mas o teto de 60 manda.
 */
export function porHora(r: RitmoParaEstimativa): number {
  const peloIntervalo = r.intervaloSegundos > 0 ? Math.floor(3600 / r.intervaloSegundos) : 0
  return Math.max(0, Math.min(peloIntervalo, r.tetoHora))
}

/** Mensagens que cabem em um dia: a janela e o ritmo limitam, e o teto do dia corta. */
export function porDia(r: RitmoParaEstimativa): number {
  const horasDeJanela = minutosDaJanela(r) / 60
  return Math.max(0, Math.min(Math.floor(porHora(r) * horasDeJanela), r.tetoDia))
}

/**
 * Estimativa de duração de um disparo.
 *
 * `porDia` zero significa ritmo que não envia nada — janela vazia ou intervalo
 * impossível. Aí a resposta é a ausência de resposta, não "0 horas".
 */
export function estimarCampanha(
  totalDeMensagens: number,
  ritmo: RitmoParaEstimativa
): EstimativaDeCampanha {
  const cabemPorDia = porDia(ritmo)
  const cabemPorHora = porHora(ritmo)

  if (totalDeMensagens <= 0) {
    return { horas: 0, dias: 0, porDia: cabemPorDia, texto: "Sem destinatários para estimar." }
  }

  if (cabemPorDia === 0 || cabemPorHora === 0) {
    return {
      horas: 0,
      dias: 0,
      porDia: 0,
      texto: "Com este ritmo, nenhuma mensagem sairia: revise a janela de envio e os tetos.",
    }
  }

  const dias = Math.ceil(totalDeMensagens / cabemPorDia)
  const horas = Math.ceil(totalDeMensagens / cabemPorHora)

  // Até caber em um dia de janela, falar em horas é mais concreto. Acima disso,
  // "37 horas" engana: as mensagens não saem de madrugada.
  const texto =
    dias <= 1
      ? `Uma campanha de ${totalDeMensagens.toLocaleString("pt-BR")} mensagens levaria cerca de ${horas} ${
          horas === 1 ? "hora" : "horas"
        } neste ritmo.`
      : `Uma campanha de ${totalDeMensagens.toLocaleString("pt-BR")} mensagens levaria cerca de ${dias} dias neste ritmo — cabem ${cabemPorDia.toLocaleString(
          "pt-BR"
        )} por dia dentro da janela de envio.`

  return { horas, dias, porDia: cabemPorDia, texto }
}
