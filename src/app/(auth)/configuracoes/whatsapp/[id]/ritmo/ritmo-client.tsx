"use client"

// Tela de ritmo de um número (B5-02): valores reais, lidos do gateway.
//
// A B5-01 desenhou isto com dois exemplos fixos. Agora o ritmo configurado, o
// efetivo e **os limites do sistema** chegam do gateway na mesma resposta — os
// limites nunca são escritos no CRM, porque vivem lá e mudariam sem avisar.

import { FormularioRitmo } from "./formulario-ritmo"
import { salvarRitmo } from "./actions"
import type { RitmoDoNumero } from "@/lib/whatsapp/gateway/tipos"

export function RitmoClient({
  connectionId,
  ritmo,
  diaDeVida,
  emAquecimento,
}: {
  connectionId: string
  ritmo: RitmoDoNumero
  /** Dia de vida do número, vindo da saúde. Null quando não foi possível ler. */
  diaDeVida: number | null
  emAquecimento: boolean
}) {
  return (
    <FormularioRitmo
      ritmo={ritmo}
      diaDeVida={diaDeVida}
      emAquecimento={emAquecimento}
      salvar={(valores) => salvarRitmo(connectionId, valores)}
    />
  )
}
