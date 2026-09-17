// Ritmo de envio: leitura, escrita, recusa explicada (B5-02) e a estimativa de
// duração de campanha. Gateway simulado: sem rede e sem banco.

import { describe, expect, it } from "vitest"
import {
  GatewayIndisponivel,
  GatewayRecusou,
  type ClienteGateway,
} from "@/lib/whatsapp/gateway/cliente"
import { conferirAlteracao, lerRitmo, salvarRitmoNoGateway } from "@/lib/whatsapp/gateway/ritmo"
import type { RitmoDoNumero } from "@/lib/whatsapp/gateway/tipos"
import { estimarCampanha, porDia, porHora } from "@/lib/estimativa-campanha"

const CONEXAO = { instanceId: "inst_1", instanceToken: "token-da-instancia" }

const LIMITES: RitmoDoNumero["system_limits"] = {
  send_interval_seconds_min: 40,
  hourly_cap_max: 60,
  daily_cap_max: 500,
  send_window_earliest: "08:00",
  send_window_latest: "20:00",
}

const CONFIGURADO: RitmoDoNumero["configured"] = {
  send_interval_seconds: 40,
  hourly_cap: 60,
  daily_cap: 500,
  send_window_start: "08:00:00",
  send_window_end: "20:00:00",
}

const RITMO: RitmoDoNumero = {
  configured: CONFIGURADO,
  effective: { ...CONFIGURADO, warmup_applied: false },
  system_limits: LIMITES,
}

function clienteFalso(resposta: unknown) {
  const chamadas: Array<{ token: string; caminho: string; metodo?: string; corpo?: unknown }> = []
  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("Ritmo usa a credencial da instância.")
    },
    async comInstancia(token, pedido) {
      chamadas.push({ token, ...pedido })
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
  }
  return { cliente, chamadas }
}

describe("leitura do ritmo", () => {
  it("devolve configurado, efetivo e limites, com a credencial da instância", async () => {
    const { cliente, chamadas } = clienteFalso(RITMO)

    const resultado = await lerRitmo({ cliente, conexao: CONEXAO })

    expect(resultado).toEqual({ ok: true, ritmo: RITMO })
    expect(chamadas[0]).toEqual({
      token: CONEXAO.instanceToken,
      caminho: "/instances/inst_1/rate-profile",
    })
  })

  it("gateway fora do ar vira erro legível", async () => {
    const { cliente } = clienteFalso(new GatewayIndisponivel("sem resposta"))

    const resultado = await lerRitmo({ cliente, conexao: CONEXAO })

    expect(resultado.ok).toBe(false)
  })
})

describe("conferência antes de gravar", () => {
  it("aceita o que está dentro dos limites", () => {
    expect(
      conferirAlteracao({ send_interval_seconds: 120, hourly_cap: 10 }, LIMITES, CONFIGURADO)
    ).toBeNull()
  })

  it("a recusa diz o limite E o valor pedido", () => {
    expect(conferirAlteracao({ send_interval_seconds: 20 }, LIMITES, CONFIGURADO)).toBe(
      "O intervalo mínimo entre mensagens é 40 segundos, e você pediu 20."
    )
    expect(conferirAlteracao({ hourly_cap: 200 }, LIMITES, CONFIGURADO)).toBe(
      "O teto por hora vai de 1 a 60 mensagens, e você pediu 200."
    )
    expect(conferirAlteracao({ daily_cap: 9000 }, LIMITES, CONFIGURADO)).toBe(
      "O teto por dia vai de 1 a 500 mensagens, e você pediu 9000."
    )
  })

  it("janela fora do permitido é recusada nas duas pontas", () => {
    expect(conferirAlteracao({ send_window_start: "06:00" }, LIMITES, CONFIGURADO)).toMatch(
      /não pode começar antes de 08:00/
    )
    expect(conferirAlteracao({ send_window_end: "23:00" }, LIMITES, CONFIGURADO)).toMatch(
      /não pode terminar depois de 20:00/
    )
  })

  it("alterar só uma ponta não pode inverter a janela", () => {
    const comFimCedo = { ...CONFIGURADO, send_window_end: "10:00:00" }

    expect(conferirAlteracao({ send_window_start: "11:00" }, LIMITES, comFimCedo)).toBe(
      "O fim da janela de envio precisa ser depois do início."
    )
  })

  it("os limites vêm do gateway: mudando eles, muda o que é aceito", () => {
    const maisApertado = { ...LIMITES, hourly_cap_max: 20 }

    expect(conferirAlteracao({ hourly_cap: 40 }, LIMITES, CONFIGURADO)).toBeNull()
    expect(conferirAlteracao({ hourly_cap: 40 }, maisApertado, CONFIGURADO)).toMatch(/1 a 20/)
  })
})

describe("gravação do ritmo", () => {
  it("manda só o que mudou, com PATCH", async () => {
    const { cliente, chamadas } = clienteFalso(RITMO)

    const resultado = await salvarRitmoNoGateway({
      cliente,
      conexao: CONEXAO,
      alteracao: { daily_cap: 300 },
      limites: LIMITES,
      atual: CONFIGURADO,
    })

    expect(resultado.ok).toBe(true)
    expect(chamadas[0]).toEqual({
      token: CONEXAO.instanceToken,
      caminho: "/instances/inst_1/rate-profile",
      metodo: "PATCH",
      corpo: { daily_cap: 300 },
    })
  })

  it("valor fora do limite não chega a viajar até o gateway", async () => {
    const { cliente, chamadas } = clienteFalso(RITMO)

    const resultado = await salvarRitmoNoGateway({
      cliente,
      conexao: CONEXAO,
      alteracao: { hourly_cap: 500 },
      limites: LIMITES,
      atual: CONFIGURADO,
    })

    expect(resultado.ok).toBe(false)
    expect(chamadas).toEqual([])
  })

  it("recusa do gateway chega ao administrador com a mensagem dele", async () => {
    const { cliente } = clienteFalso(
      new GatewayRecusou(
        "rate_profile_out_of_range",
        "O teto por hora precisa ficar entre 1 e 60 mensagens.",
        422
      )
    )

    const resultado = await salvarRitmoNoGateway({
      cliente,
      conexao: CONEXAO,
      // Passa pela conferência local, mas o gateway é a última palavra.
      alteracao: { hourly_cap: 60 },
      limites: { ...LIMITES, hourly_cap_max: 120 },
      atual: CONFIGURADO,
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.erro).toBe("O teto por hora precisa ficar entre 1 e 60 mensagens.")
    }
  })

  it("gateway fora do ar: o ritmo não foi alterado, e a tela diz isso", async () => {
    const { cliente } = clienteFalso(new GatewayIndisponivel("sem resposta"))

    const resultado = await salvarRitmoNoGateway({
      cliente,
      conexao: CONEXAO,
      alteracao: { daily_cap: 100 },
      limites: LIMITES,
      atual: CONFIGURADO,
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/não foi alterado/)
  })
})

describe("estimativa de duração da campanha", () => {
  const RITMO_CHEIO = {
    intervaloSegundos: 40,
    tetoHora: 60,
    tetoDia: 500,
    janelaInicioMin: 8 * 60,
    janelaFimMin: 20 * 60,
  }

  it("por hora é o menor entre o que o intervalo permite e o teto", () => {
    // 40s permitiriam 90 por hora; o teto de 60 manda.
    expect(porHora(RITMO_CHEIO)).toBe(60)
    expect(porHora({ ...RITMO_CHEIO, intervaloSegundos: 120 })).toBe(30)
  })

  it("por dia respeita a janela e o teto do dia", () => {
    // 60/h × 12h de janela = 720, mas o teto do dia é 500.
    expect(porDia(RITMO_CHEIO)).toBe(500)
    // Janela de 2h: 120 cabem, e o teto não chega a pesar.
    expect(porDia({ ...RITMO_CHEIO, janelaFimMin: 10 * 60 })).toBe(120)
  })

  it("campanha que cabe no dia é apresentada em horas", () => {
    const e = estimarCampanha(300, RITMO_CHEIO)

    expect(e.dias).toBe(1)
    expect(e.texto).toMatch(/cerca de 5 horas/)
  })

  it("campanha que não cabe no dia é apresentada em dias, com o quanto cabe por dia", () => {
    const e = estimarCampanha(5000, RITMO_CHEIO)

    expect(e.dias).toBe(10)
    expect(e.texto).toMatch(/cerca de 10 dias/)
    expect(e.texto).toMatch(/500 por dia/)
  })

  it("ritmo mais devagar aumenta a estimativa: é o efeito que a tela precisa mostrar", () => {
    const rapido = estimarCampanha(1000, RITMO_CHEIO)
    const devagar = estimarCampanha(1000, { ...RITMO_CHEIO, tetoDia: 50 })

    expect(devagar.dias).toBeGreaterThan(rapido.dias)
  })

  it("arredonda para cima: aproximação que sobra é melhor que promessa que falta", () => {
    expect(estimarCampanha(61, RITMO_CHEIO).horas).toBe(2)
  })

  it("janela vazia não vira zero hora: diz que nada sairia", () => {
    const e = estimarCampanha(100, { ...RITMO_CHEIO, janelaFimMin: 8 * 60 })

    expect(e.porDia).toBe(0)
    expect(e.texto).toMatch(/nenhuma mensagem sairia/)
  })

  it("sem destinatários não estima nada", () => {
    expect(estimarCampanha(0, RITMO_CHEIO).texto).toMatch(/Sem destinatários/)
  })
})
