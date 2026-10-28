// B47-09: as abas dos Relatórios e a do endereço (`?aba=rfv`). Fora do componente
// de cliente porque a página, no servidor, lê a aba pedida.

export type Aba = "visao-geral" | "rfv" | "coorte" | "funil" | "carteiras"

const ABAS: Aba[] = ["visao-geral", "rfv", "coorte", "funil", "carteiras"]

/** Sem aba, ou com uma que não existe, a Visão Geral. */
export function abaDoEndereco(valor: string | null | undefined): Aba {
  return ABAS.includes(valor as Aba) ? (valor as Aba) : "visao-geral"
}
