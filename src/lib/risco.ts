// Cálculo puro do sinal de risco de bloqueio de um número (B4-03) — testável.
//
// Mora no CRM por decisão registrada na seção 4.5 do contrato do gateway: a
// régua é regra de produto e vai mudar com a experiência dos primeiros
// clientes. Se morasse no gateway, cada ajuste viraria deploy lá, com reinício
// afetando todos os números conectados.
//
// O gateway entrega os ingredientes; aqui se classifica. **Sem rede, sem
// Supabase e sem data**: só a conta.
//
// Regra de ouro do desenho: nível sem razão não serve. "Risco alto" sozinho não
// diz ao cliente o que parar de fazer, e é justamente a decisão que ele precisa
// tomar antes de perder o número.

export type NivelDeRisco = "baixo" | "medio" | "alto"

export type IngredientesDoRisco = {
  enviadasNaHora: number
  enviadasNoDia: number
  recebidasNoDia: number
  tetoHora: number
  tetoDia: number
  /** Janela dos últimos envios que o gateway usa para acionar o freio. */
  falhas: { falharam: number; enviadas: number; proporcao: number | null }
  freado: boolean
  motivoDoFreio: "failure_rate" | "manual" | "banned" | null
  estado: string
}

export type SinalDeRisco = { nivel: NivelDeRisco; razoes: string[] }

/**
 * Limiares da régua, num lugar só para serem discutíveis.
 *
 * `FALHAS_ALTO` é 20% de propósito: é o mesmo limiar com que o gateway aciona o
 * freio (10 falhas em 50 envios, `decisoes-de-operacao.md`). Antes de o freio
 * cair, o cliente já vê o sinal — se o CRM usasse um número diferente, ou
 * alarmaria sem motivo, ou só avisaria depois do estrago.
 */
export const LIMIARES = {
  falhasAlto: 0.2,
  falhasMedio: 0.1,
  consumoAlto: 0.9,
  consumoMedio: 0.85,
  /** Abaixo disto, quase ninguém está respondendo. */
  respostaAlto: 0.05,
  respostaMedio: 0.1,
  /** Volume mínimo para julgar proporção de respostas: número quieto não é risco. */
  volumeMinimoParaResposta: 20,
} as const

function proporcao(usado: number, teto: number): number {
  return teto > 0 ? usado / teto : 0
}

function porcento(valor: number): number {
  return Math.round(valor * 100)
}

/**
 * Classifica o risco e devolve o que o está elevando.
 *
 * A ordem das razões é a da gravidade: o que aparece primeiro é o que o cliente
 * deve resolver primeiro.
 */
export function classificarRisco(i: IngredientesDoRisco): SinalDeRisco {
  const razoesAltas: string[] = []
  const razoesMedias: string[] = []

  // 1. Freio e banimento. O freio já é a consequência do risco: se ele caiu, o
  //    risco é alto por definição, não por estimativa.
  if (i.estado === "banned") {
    razoesAltas.push("O WhatsApp já bloqueou este número.")
  } else if (i.freado && i.motivoDoFreio === "failure_rate") {
    razoesAltas.push("Envios interrompidos pelo freio de emergência, por excesso de falhas.")
  } else if (i.freado && i.motivoDoFreio === "banned") {
    razoesAltas.push("Envios interrompidos porque o número foi bloqueado pelo WhatsApp.")
  } else if (i.freado) {
    razoesMedias.push("Envios interrompidos manualmente pela operação.")
  }

  // 2. Falhas de envio. Entrega que falha em série é o sinal mais direto de que
  //    o WhatsApp está barrando o número.
  const taxaDeFalha = i.falhas.proporcao
  if (taxaDeFalha !== null && i.falhas.enviadas > 0) {
    const texto =
      `${i.falhas.falharam} dos últimos ${i.falhas.enviadas} envios falharam ` +
      `(${porcento(taxaDeFalha)}%).`
    if (taxaDeFalha >= LIMIARES.falhasAlto) razoesAltas.push(texto)
    else if (taxaDeFalha >= LIMIARES.falhasMedio) razoesMedias.push(texto)
  }

  // 3. Consumo dos tetos vigentes. Perto do teto não é problema em si — é
  //    volume alto, que combinado com pouca resposta é o caminho do banimento.
  const consumoDia = proporcao(i.enviadasNoDia, i.tetoDia)
  const consumoHora = proporcao(i.enviadasNaHora, i.tetoHora)

  if (consumoDia >= LIMIARES.consumoMedio) {
    razoesMedias.push(
      `Quase no teto do dia: ${i.enviadasNoDia} de ${i.tetoDia} mensagens (${porcento(consumoDia)}%).`
    )
  }
  if (consumoHora >= LIMIARES.consumoMedio) {
    razoesMedias.push(
      `Quase no teto da hora: ${i.enviadasNaHora} de ${i.tetoHora} mensagens (${porcento(consumoHora)}%).`
    )
  }

  // 4. Proporção de respostas. Conversa de mão dupla é o sinal mais forte de
  //    que o número não é robô; volume sem resposta é o oposto.
  if (i.enviadasNoDia >= LIMIARES.volumeMinimoParaResposta) {
    const taxaDeResposta = i.recebidasNoDia / i.enviadasNoDia
    const texto =
      `Poucas respostas: ${i.recebidasNoDia} para ${i.enviadasNoDia} mensagens enviadas ` +
      "nas últimas 24 horas."

    if (taxaDeResposta < LIMIARES.respostaAlto) {
      // Volume alto sem resposta é o padrão clássico de spam. Sozinha, a falta
      // de resposta é média; com o dia quase estourado, é alta.
      if (consumoDia >= LIMIARES.consumoAlto) razoesAltas.push(texto)
      else razoesMedias.push(texto)
    } else if (taxaDeResposta < LIMIARES.respostaMedio) {
      razoesMedias.push(texto)
    }
  }

  if (razoesAltas.length > 0) return { nivel: "alto", razoes: [...razoesAltas, ...razoesMedias] }
  if (razoesMedias.length > 0) return { nivel: "medio", razoes: razoesMedias }
  return { nivel: "baixo", razoes: [] }
}
