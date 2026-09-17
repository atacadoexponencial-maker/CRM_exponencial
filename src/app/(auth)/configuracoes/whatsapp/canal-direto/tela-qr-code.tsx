"use client"

// Tela de leitura do QR Code (B2-03).
//
// A imagem chega pronta do servidor: o gateway entrega o conteúdo bruto do
// código e o desenho acontece no backend (`gateway/pareamento.ts`). O conteúdo
// bruto não circula no navegador.
//
// Renovar é pedir de novo — vencido sem leitura, o gateway já gerou outro
// código, e é o CRM que vai buscar o atual.

import { useEffect, useState } from "react"
import { RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EstadoBadge, TEXTO_DO_MOTIVO, type EstadoConexao, type MotivoDeTransicao } from "./estado-badge"

/** O QR já desenhado pelo servidor. */
export type Pareamento = { imagem: string; expiresAt: string }

const PASSOS = [
  "Abra o WhatsApp no celular do número que vai conectar",
  "Toque em Mais opções e depois em Aparelhos conectados",
  "Toque em Conectar um aparelho",
  "Aponte a câmera para este código",
]

function segundosRestantes(expiresAt: string, agoraMs: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - agoraMs) / 1000))
}

export function TelaQrCode({
  pareamento,
  estado = "pairing",
  motivo,
  erro,
  renovando = false,
  onRenovar,
}: {
  pareamento: Pareamento | null
  estado?: EstadoConexao
  motivo?: MotivoDeTransicao
  /** Recusa do gateway, já legível. */
  erro?: string | null
  renovando?: boolean
  onRenovar?: () => void
}) {
  // O relógio marca o instante em que renderizamos, e a conta é derivada dele.
  // Guardar os segundos restantes em estado exigiria reescrevê-los no efeito a
  // cada troca de código, e o lint recusa `setState` síncrono em efeito — com
  // razão: seria a mesma informação em dois lugares.
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [])

  const restam = pareamento ? segundosRestantes(pareamento.expiresAt, agora) : 0

  const expirado = restam === 0

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-medium">Leia o código no aparelho</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            O código vale por pouco tempo. Expirado, gere outro.
          </p>
        </div>
        <EstadoBadge estado={estado} />
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div>
          <div
            className={`aspect-square rounded-lg border grid place-items-center overflow-hidden bg-white ${
              expirado ? "opacity-30" : ""
            }`}
          >
            {pareamento ? (
              /* Imagem desenhada no servidor a partir do conteúdo do gateway. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pareamento.imagem}
                alt="Código QR para conectar o número no WhatsApp"
                className="size-full object-contain"
              />
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {erro ? "Não foi possível gerar o código." : "Gerando o código…"}
              </p>
            )}
          </div>

          <p className="text-sm text-center mt-3" aria-live="polite">
            {!pareamento ? (
              <span className="text-muted-foreground">—</span>
            ) : expirado ? (
              <span className="text-muted-foreground">Código expirado</span>
            ) : (
              <>
                Expira em <span className="font-medium tabular-nums">{restam}s</span>
              </>
            )}
          </p>

          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={onRenovar}
            disabled={renovando}
          >
            <RefreshCw className={`size-4 ${renovando ? "animate-spin" : ""}`} aria-hidden />
            {renovando ? "Gerando…" : "Gerar novo código"}
          </Button>
        </div>

        <div>
          <p className="flex items-center gap-2 text-sm font-medium mb-3">
            <Smartphone className="size-4 shrink-0" aria-hidden />
            No celular
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {PASSOS.map((passo, i) => (
              <li key={passo} className="flex gap-2">
                <span className="tabular-nums text-foreground">{i + 1}.</span>
                {passo}
              </li>
            ))}
          </ol>

          {erro && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
              {erro}
            </p>
          )}

          {estado === "disconnected" && motivo && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
              Não foi possível conectar. {TEXTO_DO_MOTIVO[motivo]}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
