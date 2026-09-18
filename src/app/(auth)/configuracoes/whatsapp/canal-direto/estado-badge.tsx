"use client"

// Vocabulário visual dos estados de uma conexão, compartilhado pelo cartão, pela
// lista e pelas telas de pareamento (B2-01).
//
// Os seis valores são os de `instance.state` no contrato do gateway. Uma conexão
// da Meta só usa `connected` e `disconnected` — os outros quatro nascem do
// pareamento por QR Code.

import { Badge } from "@/components/ui/badge"
import { TEXTO_DO_MOTIVO } from "@/lib/whatsapp/gateway/estado"

export type EstadoConexao =
  | "pairing"
  | "connecting"
  | "connected"
  | "disconnected"
  | "banned"
  | "removed"

export type MotivoDeTransicao =
  | "session_closed_on_device"
  | "banned_by_whatsapp"
  | "connection_lost"

/** Cores no padrão que `page.tsx` já usava para conectado/desconectado. */
const ESTILO: Record<EstadoConexao, { texto: string; classe: string }> = {
  pairing: {
    texto: "Aguardando leitura",
    classe:
      "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  connecting: {
    texto: "Conectando",
    classe:
      "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  connected: {
    texto: "Conectado",
    classe:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  disconnected: {
    texto: "Desconectado",
    classe:
      "bg-muted text-muted-foreground border-border",
  },
  banned: {
    texto: "Banido",
    classe:
      "bg-red-500/15 text-red-300 border-red-500/30",
  },
  removed: {
    texto: "Removido",
    classe:
      "bg-muted text-muted-foreground border-border",
  },
}

/**
 * Texto legível do motivo, reexportado do backend (B2-04): a tradução mora em
 * `gateway/estado.ts`, porque o webhook (B6) também precisa dela e duas cópias
 * divergiriam. Banido tem aviso próprio, mais forte que este.
 */
export { TEXTO_DO_MOTIVO }

export function EstadoBadge({ estado }: { estado: EstadoConexao }) {
  const { texto, classe } = ESTILO[estado]
  return <Badge className={classe}>{texto}</Badge>
}

export function CanalBadge({ canal }: { canal: "meta" | "gateway" }) {
  return (
    <Badge className="bg-muted text-muted-foreground border-border">
      {canal === "meta" ? "API Oficial" : "Canal direto"}
    </Badge>
  )
}
