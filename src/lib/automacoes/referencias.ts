// O que um fluxo cita de fora dele: etiquetas, atendentes, números de WhatsApp e
// etapas de funil. O servidor confere tudo antes de gravar, porque o motor roda
// com o service client, que passa por cima da RLS: uma etiqueta de outra empresa
// gravada no fluxo seria aplicada sem ninguém barrar.

import { ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "@/app/(auth)/pipeline/mock-pipeline"
import type { Fluxo } from "@/lib/fluxo-automacao"

export interface ReferenciasDoFluxo {
  etiquetas: string[]
  atendentes: string[]
  conexoes: string[]
  etapas: Array<{ funil: string; etapa: string }>
}

const PREFIXO_NUMERO = "numero:"

export function referenciasDoFluxo(fluxo: Fluxo): ReferenciasDoFluxo {
  const etiquetas = new Set<string>()
  const atendentes = new Set<string>()
  const conexoes = new Set<string>()
  const etapas: ReferenciasDoFluxo["etapas"] = []

  for (const bloco of fluxo.blocos) {
    if (bloco.tipo === "condicao") {
      for (const v of bloco.verificacoes) {
        if (v.tipo === "etiqueta_conversa" && v.valor) etiquetas.add(v.valor)
        if (v.tipo === "atendente" && v.operador === "e" && v.valor) atendentes.add(v.valor)
        if (v.tipo === "canal" && v.valor.startsWith(PREFIXO_NUMERO)) conexoes.add(v.valor.slice(PREFIXO_NUMERO.length))
        if (v.tipo === "card_etapa") {
          const [funil = "", etapa = ""] = v.valor.split(":")
          etapas.push({ funil, etapa })
        }
      }
      continue
    }

    const p = bloco.parametros
    if (p.label_id) etiquetas.add(p.label_id)
    if (p.atendente_id) atendentes.add(p.atendente_id)
    // Funil sozinho também é conferido: o gatilho "card movido" aceita "qualquer etapa"
    if (p.funil) etapas.push({ funil: p.funil, etapa: p.etapa ?? "" })
  }

  return { etiquetas: [...etiquetas], atendentes: [...atendentes], conexoes: [...conexoes], etapas }
}

const ETAPAS_DO_FUNIL: Record<string, readonly string[]> = {
  entrada: ETAPAS_ENTRADA.map((e) => e.id),
  recompra: ETAPAS_RECOMPRA.map((e) => e.id),
}

/** Funil que existe e etapa dele; etapa vazia vale como "qualquer etapa". */
export function etapaValida({ funil, etapa }: { funil: string; etapa: string }): boolean {
  const etapas = ETAPAS_DO_FUNIL[funil]
  return etapas !== undefined && (etapa === "" || etapas.includes(etapa))
}
