"use client"

// Indicador de aquecimento (B4-01).
//
// Número novo disparando em volume é o cenário de banimento mais provável, e
// por isso o gateway aperta os tetos nos primeiros dias. A tela existe para o
// cliente não achar que o CRM está travando o envio por defeito: os tetos
// baixos são a proteção, e em poucos dias sobem sozinhos.

import { Flame, ShieldCheck } from "lucide-react"
import type { SaudeDoNumero } from "./tipos"

export function IndicadorAquecimento({ aquecimento }: { aquecimento: SaudeDoNumero["aquecimento"] }) {
  if (!aquecimento.ativo) {
    return (
      <div className="flex gap-3 rounded-lg border p-4">
        <ShieldCheck className="size-4 shrink-0 mt-0.5 text-green-700 dark:text-green-500" aria-hidden />
        <div>
          <p className="text-sm font-medium">Número maduro</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Passou do período de aquecimento. Valem os tetos configurados, sem aperto extra.
          </p>
        </div>
      </div>
    )
  }

  // O último dia do aquecimento é constante do gateway e o contrato não a
  // expõe (B4-02). Duplicá-la aqui seria reimplementar regra da Parte A: sem
  // ela, a tela mostra o dia atual e omite o total.
  const diasRestantes =
    aquecimento.ultimoDia === null ? null : Math.max(0, aquecimento.ultimoDia - aquecimento.dia + 1)

  return (
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
      <Flame className="size-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-500" aria-hidden />
      <div>
        <p className="text-sm font-medium">
          Em aquecimento · dia {aquecimento.dia}
          {aquecimento.ultimoDia !== null && ` de ${aquecimento.ultimoDia}`}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enquanto aquece, valem {aquecimento.tetoHora} mensagens por hora e {aquecimento.tetoDia} por
          dia — menos que o configurado, de propósito.
          {diasRestantes !== null && (
            <>
              {" "}
              Faltam {diasRestantes === 1 ? "1 dia" : `${diasRestantes} dias`} para os tetos cheios.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
