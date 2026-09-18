"use client"

// Pareamento por código digitado (B2-03): caminho alternativo ao QR, para quem
// não consegue apontar a câmera — o código é digitado no próprio aparelho que
// está conectando.
//
// O código vem do gateway pela Server Action; a validação do número acontece no
// backend, que é quem também recusaria.

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { pedirCodigoDePareamento } from "../actions"

export function PareamentoPorCodigo() {
  const [numero, setNumero] = useState("")
  const [codigo, setCodigo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedindo, pedir] = useTransition()

  function pedirCodigo() {
    setErro(null)
    setCodigo(null)
    pedir(async () => {
      const resultado = await pedirCodigoDePareamento(numero)
      if (resultado.erro) {
        setErro(resultado.erro)
        return
      }
      setCodigo(resultado.codigo ?? null)
    })
  }

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
        <Button variant="outline" disabled={numero.trim().length < 10 || pedindo} onClick={pedirCodigo}>
          {pedindo ? "Gerando…" : "Gerar código"}
        </Button>
      </div>

      {erro && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm ">
          {erro}
        </p>
      )}

      {codigo && (
        <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            No aparelho, toque em <strong className="text-foreground">Conectar com número</strong> e
            digite:
          </p>
          <p className="text-2xl font-semibold tracking-[0.2em] tabular-nums">{codigo}</p>
        </div>
      )}
    </div>
  )
}
