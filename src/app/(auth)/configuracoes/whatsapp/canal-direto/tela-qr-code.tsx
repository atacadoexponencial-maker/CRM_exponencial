"use client"

// Tela de leitura do QR Code (B2-01, protótipo).
//
// Dados fixos, na forma do contrato: `{ qr, expires_at }`, onde `qr` é o
// **conteúdo bruto** do código — quem desenha é o CRM. Este protótipo mostra o
// conteúdo em texto, com a área do desenho reservada: o projeto não tem
// biblioteca de QR Code, e escolher uma é da issue de implementação (B2-03).

import { useEffect, useState } from "react"
import { RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EstadoBadge, TEXTO_DO_MOTIVO, type EstadoConexao, type MotivoDeTransicao } from "./estado-badge"

/** Pareamento no formato de `POST /instances/{id}/pair/qr`. */
export type Pareamento = { qr: string; expires_at: string }

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
  onRenovar,
}: {
  pareamento: Pareamento
  estado?: EstadoConexao
  motivo?: MotivoDeTransicao
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

  const restam = segundosRestantes(pareamento.expires_at, agora)

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
            className={`aspect-square rounded-lg border-2 border-dashed grid place-items-center p-4 text-center ${
              expirado ? "opacity-40" : ""
            }`}
          >
            {/* O desenho do código entra na B2-03; aqui fica o conteúdo bruto. */}
            <code className="text-[10px] leading-tight break-all text-muted-foreground">
              {pareamento.qr}
            </code>
          </div>

          <p className="text-sm text-center mt-3" aria-live="polite">
            {expirado ? (
              <span className="text-muted-foreground">Código expirado</span>
            ) : (
              <>
                Expira em <span className="font-medium tabular-nums">{restam}s</span>
              </>
            )}
          </p>

          <Button variant="outline" className="w-full mt-3" onClick={onRenovar}>
            <RefreshCw className="size-4" aria-hidden />
            Gerar novo código
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
