// B41-05 — card parado nos funis da empresa: o limite vem do prazo da etapa, e a
// Central de Alertas ganha o tipo "Card parado".

import { describe, expect, it } from "vitest"
import { limiteDeParado, situacaoDoCard } from "@/lib/card-parado"
import { CONFIG_ALERTAS_PADRAO, calcularAlertas, type CardParaAlerta } from "@/lib/alertas"

const FEIRA = "11111111-1111-4111-8111-111111111111"
const AGORA = new Date("2026-10-23T12:00:00-03:00")
const diasAtras = (d: number) => new Date(AGORA.getTime() - d * 86_400_000 - 60_000).toISOString()

function card(id: string, etapa: string, dias: number, prazo: number | null): CardParaAlerta {
  return {
    id, funil: FEIRA, etapa, etapa_changed_at: diasAtras(dias), contact_id: `c-${id}`, contatoNome: `Contato ${id}`,
    atendenteNome: null, ultimaAtividade: null, prazoParado: prazo, funilNome: "Feira de Março", etapaNome: etapa === "e-confirmou" ? "Confirmou" : "Convidado",
  }
}

describe("B41-05 — Card parado nos funis da empresa", () => {
  it("CA-B41-22: should deixar parado o card que passou do prazo da etapa, e nunca o da etapa sem prazo", () => {
    const limite = limiteDeParado(FEIRA, "e-confirmou", CONFIG_ALERTAS_PADRAO, 3)
    expect(limite).toBe(4)
    expect(situacaoDoCard(diasAtras(4), limite, AGORA)).toEqual({ texto: "parado 4 dias", parado: true })
    expect(situacaoDoCard(diasAtras(3), limite, AGORA).parado).toBe(false)

    const semPrazo = limiteDeParado(FEIRA, "e-convidado", CONFIG_ALERTAS_PADRAO, null)
    expect(semPrazo).toBeNull()
    expect(situacaoDoCard(diasAtras(4), semPrazo, AGORA).parado).toBe(false)
    expect(situacaoDoCard(diasAtras(400), semPrazo, AGORA).parado).toBe(false)

    // Entrada e Recompra continuam com os limites dos Alertas
    expect(limiteDeParado("entrada", "lead", CONFIG_ALERTAS_PADRAO, 99)).toBe(CONFIG_ALERTAS_PADRAO.leadSemRespostaDias)
    expect(limiteDeParado("recompra", "reposicao", CONFIG_ALERTAS_PADRAO, 99)).toBe(CONFIG_ALERTAS_PADRAO.semRecompraDias + 1)
  })

  it("CA-B41-36: should gerar o alerta \"Card parado\" com o funil, a etapa e os dias", () => {
    const alertas = calcularAlertas(
      [card("1", "e-confirmou", 5, 3), card("2", "e-confirmou", 3, 3), card("3", "e-convidado", 40, null)],
      CONFIG_ALERTAS_PADRAO,
      [],
      AGORA
    )
    expect(alertas).toHaveLength(1)
    expect(alertas[0]).toMatchObject({
      cardId: "1",
      tipo: "card_parado",
      tipoLabel: "Card parado",
      etapaLabel: "Feira de Março · Confirmou",
      diasSemAtividade: 5,
    })
  })
})
