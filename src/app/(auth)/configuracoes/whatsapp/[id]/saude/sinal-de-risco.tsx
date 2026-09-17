"use client"

// Sinal de risco de banimento (B4-01).
//
// "Risco alto" sozinho não serve: o cliente não sabe o que parar de fazer. Por
// isso a tela sempre lista **o que** está elevando — e, quando nada está, diz
// isso em vez de ficar em branco.
//
// A classificação é calculada no backend (B4-03). Este componente só exibe.

import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react"
import type { NivelDeRisco, SaudeDoNumero } from "./tipos"

const ESTILO: Record<
  NivelDeRisco,
  { rotulo: string; classe: string; icone: typeof ShieldCheck; corIcone: string }
> = {
  baixo: {
    rotulo: "Risco baixo",
    classe: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40",
    icone: ShieldCheck,
    corIcone: "text-green-700 dark:text-green-500",
  },
  medio: {
    rotulo: "Risco médio",
    classe: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    icone: TriangleAlert,
    corIcone: "text-amber-700 dark:text-amber-500",
  },
  alto: {
    rotulo: "Risco alto",
    classe: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
    icone: ShieldAlert,
    corIcone: "text-red-700 dark:text-red-400",
  },
}

export function SinalDeRisco({ risco }: { risco: SaudeDoNumero["risco"] }) {
  const { rotulo, classe, icone: Icone, corIcone } = ESTILO[risco.nivel]

  return (
    <div className={`rounded-lg border p-4 ${classe}`}>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Icone className={`size-4 shrink-0 ${corIcone}`} aria-hidden />
        {rotulo} de bloqueio pelo WhatsApp
      </p>

      {risco.razoes.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-1.5">
          Nada nos últimos envios está elevando o risco deste número.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {risco.razoes.map((razao) => (
            <li key={razao} className="flex gap-2">
              <span aria-hidden className="text-muted-foreground">
                •
              </span>
              {razao}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
