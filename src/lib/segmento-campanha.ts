// B42-02: a campanha escolhe quem recebe pelo mesmo filtro avançado da lista de
// Contatos. O segmento novo guarda só `filtro`; as chaves antigas (chips e campos da
// etapa Destinatários de antes) ficam no tipo para ler as campanhas já gravadas, que
// `filtroDoSegmento` converte para um grupo só, com E, e o mesmo resultado.

import { FILTRO_VAZIO, type Condicao, type Filtro } from "@/lib/filtro-contatos"

export type Segmento = {
  /** B42-02: quem recebe, no formato do filtro de Contatos. */
  filtro?: Filtro
  /** Campanha de origem do reenvio para falhos (destinatários fixos, sem filtro). */
  reenvioDe?: string
  // Formato antigo, só leitura (campanhas gravadas antes da B42-02).
  classificacoes?: string[]
  tipos?: string[]
  cidade?: string
  tags?: string[]
  atendenteId?: string
}

/** O filtro da campanha; segmento antigo vira as condições equivalentes. */
export function filtroDoSegmento(segmento: Segmento | null | undefined): Filtro {
  if (!segmento) return FILTRO_VAZIO
  if (segmento.filtro) return segmento.filtro

  const condicoes: Condicao[] = []
  if (segmento.classificacoes?.length) condicoes.push({ campo: "classificacao", comparacao: "qualquer_de", valores: segmento.classificacoes })
  if (segmento.tipos?.length) condicoes.push({ campo: "tipo", comparacao: "qualquer_de", valores: segmento.tipos })
  if (segmento.tags?.length) condicoes.push({ campo: "etiqueta", comparacao: "tem_qualquer", valores: segmento.tags })
  if (segmento.cidade?.trim()) condicoes.push({ campo: "cidade", comparacao: "contem", valores: [segmento.cidade.trim()] })
  if (segmento.atendenteId) condicoes.push({ campo: "atendente", comparacao: "e", valores: [segmento.atendenteId] })

  return condicoes.length ? { juncao: "e", grupos: [{ juncao: "e", condicoes }] } : FILTRO_VAZIO
}
