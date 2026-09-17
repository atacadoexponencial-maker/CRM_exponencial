"use client"

// Vocabulário visual dos estados de uma conexão, compartilhado pelo cartão, pela
// lista e pelas telas de pareamento (B2-01).
//
// Os seis valores são os de `instance.state` no contrato do gateway. Uma conexão
// da Meta só usa `connected` e `disconnected` — os outros quatro nascem do
// pareamento por QR Code.

import { Badge } from "@/components/ui/badge"

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
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  connecting: {
    texto: "Conectando",
    classe:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  connected: {
    texto: "Conectado",
    classe:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  disconnected: {
    texto: "Desconectado",
    classe:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
  banned: {
    texto: "Banido",
    classe:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  removed: {
    texto: "Removido",
    classe:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
}

/** Texto legível do motivo. Banido tem aviso próprio, mais forte que este. */
export const TEXTO_DO_MOTIVO: Record<MotivoDeTransicao, string> = {
  session_closed_on_device: "A sessão foi encerrada no aparelho.",
  banned_by_whatsapp: "O WhatsApp bloqueou este número.",
  connection_lost: "A conexão com o aparelho caiu.",
}

export function EstadoBadge({ estado }: { estado: EstadoConexao }) {
  const { texto, classe } = ESTILO[estado]
  return <Badge className={classe}>{texto}</Badge>
}

export function CanalBadge({ canal }: { canal: "meta" | "gateway" }) {
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700">
      {canal === "meta" ? "API Oficial" : "Canal direto"}
    </Badge>
  )
}
