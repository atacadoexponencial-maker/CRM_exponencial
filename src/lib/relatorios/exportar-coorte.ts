// B34-01: colunas das planilhas de coorte (retenção em %, valor médio em moeda) e a URL
// da rota de download.

import type { ColunaPlanilha } from "@/lib/exportar-planilha"
import { MESES_DA_COORTE, type Coorte } from "./coorte"

export type TabelaCoorte = "retencao" | "valor"

export function colunasExportacaoCoorte(tabela: TabelaCoorte): ColunaPlanilha<Coorte>[] {
  const meses: ColunaPlanilha<Coorte>[] = Array.from({ length: MESES_DA_COORTE }, (_, k) => ({
    titulo: `Mês ${k}`,
    tipo: tabela === "retencao" ? "percentual" : "moeda",
    valor: (c) => (tabela === "retencao" ? c.retencao[k] : c.valorMedio[k]),
    largura: 12,
  }))
  return [
    { titulo: "Coorte", tipo: "texto", valor: (c) => c.rotulo, largura: 12 },
    { titulo: "Clientes", tipo: "numero", valor: (c) => c.clientes, largura: 10 },
    ...meses,
  ]
}

export const TITULOS_EXPORTACAO_COORTE = ["Coorte", "Clientes", ...Array.from({ length: MESES_DA_COORTE }, (_, k) => `Mês ${k}`)]

export function urlDeExportacaoCoorte(tabela: TabelaCoorte, atendenteId: string | null): string {
  const q = new URLSearchParams({ tabela })
  if (atendenteId) q.set("atendente", atendenteId)
  return `/relatorios/coorte/exportar?${q.toString()}`
}
