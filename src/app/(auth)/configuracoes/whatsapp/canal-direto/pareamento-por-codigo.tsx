"use client"

// Pareamento por código digitado (B2-01, protótipo): caminho alternativo ao QR,
// para quem não consegue apontar a câmera — o código é digitado no próprio
// aparelho que está conectando.
//
// Dados fixos, na forma de `POST /instances/{id}/pair/code`:
// `{ pairing_code, expires_at }`.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type PareamentoPorCodigo = { pairing_code: string; expires_at: string }

/** Dado fixo do protótipo. Na B2-03 vem do gateway. */
const CODIGO_DE_EXEMPLO: PareamentoPorCodigo = {
  pairing_code: "WZQ7-4KDM",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
}

export function PareamentoPorCodigo() {
  const [numero, setNumero] = useState("")
  const [codigo, setCodigo] = useState<PareamentoPorCodigo | null>(null)

  return (
    <div className="rounded-lg border p-6">
      <h3 className="font-medium">Não consegue ler o código?</h3>
      <p className="text-sm text-muted-foreground mt-0.5 mb-4">
        Informe o número e digite no aparelho o código que aparecer aqui.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="numero-pareamento">Número com código do país</Label>
          <Input
            id="numero-pareamento"
            inputMode="numeric"
            placeholder="5511999998888"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <Button
          variant="outline"
          disabled={numero.trim().length < 10}
          onClick={() => setCodigo(CODIGO_DE_EXEMPLO)}
        >
          Gerar código
        </Button>
      </div>

      {codigo && (
        <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No aparelho, toque em <strong className="text-foreground">Conectar com número</strong> e
            digite:
          </p>
          <p className="text-2xl font-semibold tracking-[0.2em] tabular-nums">
            {codigo.pairing_code}
          </p>
        </div>
      )}
    </div>
  )
}
