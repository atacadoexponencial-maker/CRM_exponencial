"use client"

// Aviso de freio (B4-01): os envios deste número estão interrompidos, e por quê.
//
// Sem isto, do lado do cliente o freio é invisível — as mensagens simplesmente
// não saem. É o destaque mais forte da tela de propósito: enquanto estiver
// aqui, nada sai por este número.
//
// O botão de retomar só passa a funcionar na B4-04; aqui ele existe para a
// forma ser aprovada. Banimento nunca oferece retomada.

import { Ban, OctagonPause } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MotivoDoFreio, SaudeDoNumero } from "./tipos"

export const TEXTO_DO_MOTIVO_DO_FREIO: Record<MotivoDoFreio, string> = {
  failure_rate:
    "Muitos envios seguidos falharam. O gateway parou este número para evitar que o WhatsApp o bloqueie.",
  manual: "Os envios foram interrompidos manualmente pela nossa operação.",
  banned: "O WhatsApp bloqueou este número. Os envios pararam porque não há mais para onde enviar.",
}

export function AvisoDeFreio({
  freio,
  podeRetomar = false,
  onRetomar,
  retomando = false,
  erro,
}: {
  freio: SaudeDoNumero["freio"]
  /** Papel que permite retomar. A regra que vale é a do backend (B4-04). */
  podeRetomar?: boolean
  onRetomar?: () => void
  retomando?: boolean
  erro?: string | null
}) {
  if (!freio.freado) return null

  const banido = freio.motivo === "banned"
  const Icone = banido ? Ban : OctagonPause

  return (
    <div className="rounded-lg border-2 border-red-500/40 bg-red-500/10 p-5 text-red-100">
      <p className="flex items-center gap-2 font-medium">
        <Icone className="size-4 shrink-0 text-red-300" aria-hidden />
        Envios interrompidos
      </p>

      <p className="text-sm text-muted-foreground mt-1.5">
        {freio.motivo ? TEXTO_DO_MOTIVO_DO_FREIO[freio.motivo] : "Os envios deste número estão parados."}
      </p>

      <p className="text-sm mt-2 tabular-nums">
        {freio.mensagensParadas.toLocaleString("pt-BR")}{" "}
        {freio.mensagensParadas === 1 ? "mensagem parada" : "mensagens paradas"} na fila
        {freio.desde && (
          <span className="text-muted-foreground">
            {" "}
            · desde {new Date(freio.desde).toLocaleString("pt-BR")}
          </span>
        )}
      </p>

      {erro && <p className="text-sm mt-3 text-red-300">{erro}</p>}

      <div className="mt-4">
        {banido ? (
          <p className="text-sm text-muted-foreground">
            Número banido não se retoma: o bloqueio é do WhatsApp, e liberar a fila só produziria
            falha em série. Conecte outro número para voltar a enviar.
          </p>
        ) : podeRetomar ? (
          <Button variant="outline" onClick={onRetomar} disabled={retomando}>
            {retomando ? "Retomando…" : "Retomar envios"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Retomar os envios é ação de Admin.
          </p>
        )}
      </div>
    </div>
  )
}
