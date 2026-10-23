// B41-01: funis da empresa, além de Entrada e Recompra.
// O card de funil novo guarda o id do funil em `funil` e o id da etapa em `etapa`.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"
import { corValida, razaoContraste } from "@/app/loja/components/tema"
import type { CorColuna } from "@/app/(auth)/pipeline/mock-pipeline"

/** SUP-B41-02 (confirmada em 23/10/2026). O banco segura os mesmos limites. */
export const LIMITE_DE_FUNIS = 20
export const LIMITE_DE_ETAPAS = 20
export const NOME_MAXIMO = 40

export const FUNIS_FIXOS = ["entrada", "recompra"] as const

/** As cores prontas são as da paleta das colunas de Entrada e Recompra (B15-02). */
export const CORES_PRONTAS: { id: CorColuna; rotulo: string }[] = [
  { id: "verde", rotulo: "Verde" },
  { id: "amarelo", rotulo: "Amarelo" },
  { id: "cinza", rotulo: "Cinza" },
  { id: "laranja", rotulo: "Laranja" },
  { id: "vermelho", rotulo: "Vermelho" },
]

export function ehFunilFixo(funil: string): boolean {
  return (FUNIS_FIXOS as readonly string[]).includes(funil)
}

/** Para comparar nomes: sem espaço sobrando e sem diferença de maiúscula. */
export function chaveDoNome(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR")
}

export function ehCorPronta(cor: string): cor is CorColuna {
  return CORES_PRONTAS.some((c) => c.id === cor)
}

/** Cor própria é `#rrggbb`. */
export function ehCorPropria(cor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(cor) && corValida(cor)
}

/** Vazio (sem cor), cor pronta ou cor própria. */
export function corDaEtapaValida(cor: string | null | undefined): boolean {
  if (cor === null || cor === undefined || cor === "") return true
  return ehCorPronta(cor) || ehCorPropria(cor)
}

/**
 * CA-B41-42: a coluna de cor própria tem o fundo da cor escolhida e o texto em
 * preto ou branco puros, o que contrastar mais. Sobre qualquer cor, um dos dois dá
 * pelo menos 4,58:1, nos dois temas, porque o fundo é a própria cor. (O preto da
 * vitrine, #111111, não serve: com cores médias fica abaixo de 4,5:1.)
 */
export function estiloDaCorPropria(hex: string): { fundo: string; texto: string } {
  const texto = razaoContraste(hex, "#000000") >= razaoContraste(hex, "#ffffff") ? "#000000" : "#ffffff"
  return { fundo: hex, texto }
}

/**
 * B41-03: nomes dos funis da empresa e das etapas deles, pelos ids guardados nos cards.
 * Ids de Entrada e Recompra são ignorados. Uma leitura só; a RLS de quem chama vale.
 */
export async function lerNomesDosFunis(
  supabase: SupabaseClient<Database>,
  funis: Array<string | null | undefined>
): Promise<{ funis: Record<string, string>; etapas: Record<string, string> }> {
  const ids = [...new Set(funis.filter((f): f is string => !!f && !ehFunilFixo(f) && UUID_DO_FUNIL.test(f)))]
  const nomes = { funis: {} as Record<string, string>, etapas: {} as Record<string, string> }
  if (ids.length === 0) return nomes
  const { data } = await supabase.from("funis").select("id, nome, funil_etapas (id, nome)").in("id", ids)
  for (const f of data ?? []) {
    nomes.funis[f.id] = f.nome
    for (const e of f.funil_etapas ?? []) nomes.etapas[e.id] = e.nome
  }
  return nomes
}

const UUID_DO_FUNIL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Onde abre o quadro do funil. */
export function enderecoDoFunil(funil: string): string {
  if (funil === "entrada") return "/pipeline"
  if (funil === "recompra") return "/pipeline/recompra"
  return `/pipeline/funil/${funil}`
}
