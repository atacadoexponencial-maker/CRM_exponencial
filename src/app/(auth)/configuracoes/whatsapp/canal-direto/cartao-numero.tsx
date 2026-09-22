"use client"

// Cartão de um número conectado (B2-01, protótipo): número, nome de exibição,
// canal, estado e os avisos.
//
// Banido tem aviso próprio, separado de desconectado: são situações diferentes.
// Desconectado reconecta lendo outro código; banido não reconecta — o bloqueio
// é do WhatsApp, e ler o QR de novo não desfaz.

import { AlertTriangle, Ban } from "lucide-react"
import { formatarNumero } from "@/lib/whatsapp"
import { CanalBadge, EstadoBadge, TEXTO_DO_MOTIVO, type EstadoConexao, type MotivoDeTransicao } from "./estado-badge"

export type NumeroConectado = {
  id: string
  canal: "meta" | "gateway"
  phone_number: string | null
  display_name: string | null
  state: EstadoConexao
  state_reason: MotivoDeTransicao | null
}

export function CartaoNumero({
  numero,
  acoes,
}: {
  numero: NumeroConectado
  acoes?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold truncate">{formatarNumero(numero.phone_number)}</p>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {numero.display_name ?? "Sem nome de exibição"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <EstadoBadge estado={numero.state} />
          <CanalBadge canal={numero.canal} />
        </div>
      </div>

      {numero.state === "banned" && (
        <p className="mt-4 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm ">
          <Ban className="size-4 shrink-0 mt-0.5 text-red-300" aria-hidden />
          <span>
            O WhatsApp bloqueou este número. Ler o código de novo não desfaz o bloqueio: é preciso
            conectar outro número.
          </span>
        </p>
      )}

      {numero.state !== "banned" && numero.state_reason && (
        <p className="mt-4 flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
          <span>{TEXTO_DO_MOTIVO[numero.state_reason]}</span>
        </p>
      )}

      {acoes && <div className="mt-4">{acoes}</div>}
    </div>
  )
}
