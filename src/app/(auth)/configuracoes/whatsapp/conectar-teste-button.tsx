"use client"

// TEMPORÁRIO — remover após aprovação da Meta

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { conectarNumeroTeste } from "./actions"

export function ConectarTesteButton() {
  const router = useRouter()
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleConectar() {
    setErro(null)
    setConectando(true)
    const resultado = await conectarNumeroTeste()
    setConectando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive max-w-sm text-right">
          {erro}
        </p>
      )}
      <Button variant="outline" onClick={handleConectar} disabled={conectando}>
        {conectando ? "Conectando..." : "Conectar número de teste"}
      </Button>
    </div>
  )
}
