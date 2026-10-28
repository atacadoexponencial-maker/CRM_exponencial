"use client"

// B47-04: mostra por alguns segundos a confirmação que a tela pediu com `avisar`.

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { ouvirAvisos } from "@/lib/aviso-na-tela"

export const TEMPO_DO_AVISO_MS = 3000

export function AvisosNaTela() {
  const [aviso, setAviso] = useState<{ texto: string; vez: number } | null>(null)

  useEffect(() => ouvirAvisos((texto) => setAviso((atual) => ({ texto, vez: (atual?.vez ?? 0) + 1 }))), [])

  useEffect(() => {
    if (!aviso) return
    const relogio = setTimeout(() => setAviso(null), TEMPO_DO_AVISO_MS)
    return () => clearTimeout(relogio)
  }, [aviso])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {aviso && (
        <div role="status" key={aviso.vez} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-lg">
          <Check className="size-4 text-sucesso" />
          {aviso.texto}
        </div>
      )}
    </div>
  )
}
