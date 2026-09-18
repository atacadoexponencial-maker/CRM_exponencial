// Estimativa de duração do disparo (B8-01). Lógica pura, sem rede e sem banco.
//
// O ponto da issue: a estimativa precisa considerar as QUATRO restrições —
// intervalo, teto por hora, teto por dia e janela de horário. Estimar só pelo
// intervalo é o erro que faz o cliente achar que a campanha travou.

import { describe, expect, it } from "vitest"
import { GatewayIndisponivel, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import {
  buscarRitmoDoNumero,
  estimarDuracaoDoDisparo,
  RITMO_PADRAO,
  type RitmoParaEstimativa,
} from "@/lib/whatsapp/gateway/fila-campanha"

/** 17/09/2026, 09:00 — dentro da janela padrão (08:00–20:00). */
const MANHA = new Date("2026-09-17T09:00:00-03:00")

function emMinutos(estimativa: { minutosTotais: number }) {
  return estimativa.minutosTotais
}

describe("estimativa dentro da janela", () => {
  it("campanha pequena termina no mesmo dia", () => {
    const e = estimarDuracaoDoDisparo({ destinatarios: 30, agora: MANHA })

    expect(e.diasDeJanela).toBe(1)
    expect(emMinutos(e)).toBeLessThan(12 * 60)
    expect(e.texto).toMatch(/Cerca de/)
  })

  it("respeita o teto por hora, e não só o intervalo", () => {
    // 10s de intervalo permitiriam 360/hora; o teto de 60 é que manda.
    const rapido: RitmoParaEstimativa = { ...RITMO_PADRAO, intervaloSegundos: 10 }

    const e = estimarDuracaoDoDisparo({ destinatarios: 120, ritmo: rapido, agora: MANHA })

    // 120 mensagens a 60/hora = 2 horas, não 20 minutos.
    expect(emMinutos(e)).toBe(120)
  })

  it("intervalo grande manda quando é ele o gargalo", () => {
    // 120s = 30/hora, abaixo do teto de 60.
    const lento: RitmoParaEstimativa = { ...RITMO_PADRAO, intervaloSegundos: 120 }

    const e = estimarDuracaoDoDisparo({ destinatarios: 30, ritmo: lento, agora: MANHA })

    expect(emMinutos(e)).toBe(60)
  })
})

describe("estimativa que atravessa dias", () => {
  it("mil destinatários no ritmo padrão passam de um dia", () => {
    const e = estimarDuracaoDoDisparo({ destinatarios: 1000, agora: MANHA })

    expect(e.diasDeJanela).toBeGreaterThan(1)
    expect(e.texto).toMatch(/para todo dia no fim da janela/)
  })

  it("teto por dia limita, mesmo com janela e intervalo folgados", () => {
    const tetoBaixo: RitmoParaEstimativa = { ...RITMO_PADRAO, tetoDia: 30 }

    const e = estimarDuracaoDoDisparo({ destinatarios: 90, ritmo: tetoBaixo, agora: MANHA })

    // 90 mensagens a 30/dia: três dias de janela.
    expect(e.diasDeJanela).toBe(3)
  })

  it("o tempo parado fora da janela entra na conta", () => {
    const e = estimarDuracaoDoDisparo({ destinatarios: 1000, agora: MANHA })

    // Se só o tempo ativo contasse, mil a 60/hora dariam ~17h corridas.
    // Com a janela de 12h/dia, o fim real é bem depois disso.
    expect(emMinutos(e)).toBeGreaterThan(17 * 60)
  })
})

describe("fora da janela de envio", () => {
  it("começa na abertura do dia seguinte, e a estimativa diz isso", () => {
    const noite = new Date("2026-09-17T22:00:00-03:00")

    const e = estimarDuracaoDoDisparo({ destinatarios: 10, agora: noite })

    // 22h → 08h do dia seguinte são 10 horas paradas antes do primeiro envio.
    expect(emMinutos(e)).toBeGreaterThanOrEqual(10 * 60)
    expect(e.terminaEm.getTime()).toBeGreaterThan(noite.getTime())
  })

  it("madrugada também espera a abertura", () => {
    const madrugada = new Date("2026-09-17T03:00:00-03:00")

    const e = estimarDuracaoDoDisparo({ destinatarios: 5, agora: madrugada })

    expect(emMinutos(e)).toBeGreaterThanOrEqual(5 * 60)
  })
})

describe("casos de borda", () => {
  it("campanha sem destinatários não promete prazo", () => {
    const e = estimarDuracaoDoDisparo({ destinatarios: 0, agora: MANHA })

    expect(e.texto).toBe("Sem destinatários")
    expect(e.minutosTotais).toBe(0)
  })

  it("ritmo que não permite envio nenhum é dito, não estimado", () => {
    const impossivel: RitmoParaEstimativa = { ...RITMO_PADRAO, tetoDia: 0 }

    const e = estimarDuracaoDoDisparo({ destinatarios: 10, ritmo: impossivel, agora: MANHA })

    expect(e.texto).toMatch(/não permite envios/)
  })

  it("janela invertida não gera estimativa negativa", () => {
    const invertida: RitmoParaEstimativa = {
      ...RITMO_PADRAO,
      janelaInicioMin: 20 * 60,
      janelaFimMin: 8 * 60,
    }

    const e = estimarDuracaoDoDisparo({ destinatarios: 10, ritmo: invertida, agora: MANHA })

    expect(e.minutosTotais).toBeGreaterThanOrEqual(0)
  })
})

describe("leitura do ritmo no gateway", () => {
  function clienteQueDevolve(resposta: unknown): ClienteGateway {
    return {
      async comServico() {
        throw new Error("não usado")
      },
      async comInstancia() {
        if (resposta instanceof Error) throw resposta
        return resposta as never
      },
    }
  }

  it("usa o ritmo efetivo, e não o configurado: número novo está em aquecimento", async () => {
    const cliente = clienteQueDevolve({
      configured: {
        send_interval_seconds: 40,
        hourly_cap: 60,
        daily_cap: 500,
        send_window_start: "08:00",
        send_window_end: "20:00",
      },
      effective: {
        send_interval_seconds: 40,
        hourly_cap: 4,
        daily_cap: 30,
        send_window_start: "09:00",
        send_window_end: "18:00",
        warmup_applied: true,
      },
      system_limits: {
        send_interval_seconds_min: 40,
        hourly_cap_max: 60,
        daily_cap_max: 500,
        send_window_earliest: "08:00",
        send_window_latest: "20:00",
      },
    })

    const ritmo = await buscarRitmoDoNumero(cliente, "inst_1", "token")

    expect(ritmo).toEqual({
      intervaloSegundos: 40,
      tetoHora: 4,
      tetoDia: 30,
      janelaInicioMin: 9 * 60,
      janelaFimMin: 18 * 60,
    })
  })

  it("gateway fora do ar devolve null: quem chama usa o padrão e avisa que é aproximado", async () => {
    const cliente = clienteQueDevolve(new GatewayIndisponivel("sem resposta"))

    expect(await buscarRitmoDoNumero(cliente, "inst_1", "token")).toBeNull()
  })

  it("número em aquecimento muda a estimativa de forma visível", async () => {
    const aquecendo: RitmoParaEstimativa = { ...RITMO_PADRAO, tetoHora: 4, tetoDia: 30 }

    const normal = estimarDuracaoDoDisparo({ destinatarios: 100, agora: MANHA })
    const lento = estimarDuracaoDoDisparo({ destinatarios: 100, ritmo: aquecendo, agora: MANHA })

    expect(lento.minutosTotais).toBeGreaterThan(normal.minutosTotais)
    expect(lento.diasDeJanela).toBeGreaterThan(normal.diasDeJanela)
  })
})
