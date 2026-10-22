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
    classe: "border-sucesso/30 bg-sucesso-fundo text-sucesso ",
    icone: ShieldCheck,
    corIcone: "text-sucesso",
  },
  medio: {
    rotulo: "Risco médio",
    classe: "border-aviso/30 bg-aviso-fundo text-aviso ",
    icone: TriangleAlert,
    corIcone: "text-aviso",
  },
  alto: {
    rotulo: "Risco alto",
    classe: "border-erro/30 bg-erro-fundo text-erro ",
    icone: ShieldAlert,
    corIcone: "text-erro",
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
