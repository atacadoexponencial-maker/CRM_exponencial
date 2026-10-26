// B38-07: filtro por um campo personalizado nos Relatórios e no Dashboard. Um campo por
// vez (SUP-B38-13), com a comparação que o tipo pede: lista e múltipla escolha marcam
// opções; sim/não escolhe um; texto compara igual; número, dinheiro e data pedem
// "entre". O servidor transforma o filtro no conjunto dos contatos que atendem.

/** O campo no formato do filtro de Contatos ("campo:<tipo>:<uuid>") e os valores. */
export type FiltroPorCampo = { campo: string; valores: string[] }

const TIPO = /^campo:([a-z_]+):[0-9a-f-]{36}$/i

export function tipoDoFiltroPorCampo(filtro: FiltroPorCampo): string | null {
  return TIPO.exec(filtro.campo)?.[1] ?? null
}

/** A comparação da condição de campo (`campoAtende`) que o filtro usa, pelo tipo. */
export function comparacaoDoFiltroPorCampo(tipo: string): string {
  switch (tipo) {
    case "lista":
      return "qualquer_de"
    case "multipla":
      return "tem_qualquer"
    case "sim_nao":
      return "e"
    case "numero":
    case "dinheiro":
    case "data":
      return "entre"
    default:
      return "igual"
  }
}

/** O filtro tem campo e os valores que a comparação pede; incompleto, não filtra. */
export function filtroPorCampoCompleto(filtro: FiltroPorCampo | null | undefined): filtro is FiltroPorCampo {
  if (!filtro) return false
  const tipo = tipoDoFiltroPorCampo(filtro)
  if (!tipo) return false
  const valores = filtro.valores.map((v) => v.trim())
  if (comparacaoDoFiltroPorCampo(tipo) === "entre") return valores.length === 2 && valores.every(Boolean)
  return valores.some(Boolean)
}
