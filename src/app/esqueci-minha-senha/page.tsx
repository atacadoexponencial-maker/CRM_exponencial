"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { ConferenciaHumana } from "@/components/shared/conferencia-humana"
import { AVISO_MUITAS_TENTATIVAS } from "../login/avisos"
import { pedirLinkDeSenhaNova } from "./actions"

export const AVISO_PEDIDO_RECEBIDO =
  "Se esse e-mail tiver conta no crmatacado exp, enviamos um link para criar uma senha nova. Ele vale por 1 hora."

const ERROS = {
  dados_invalidos: "Digite um e-mail válido.",
  conferencia: "Não foi possível confirmar que você é uma pessoa. Tente de novo.",
  limite: AVISO_MUITAS_TENTATIVAS,
} as const

// B52-01: pedir o link de criar senha nova.
export default function EsqueciMinhaSenhaPage() {
  const [email, setEmail] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [pedido, setPedido] = useState(false)
  // B50-02: a conferência vale para um envio só; o botão espera por ela
  const [conferencia, setConferencia] = useState<string | null>(null)
  const [conferindo, setConferindo] = useState(true)
  const [reinicio, setReinicio] = useState(0)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    let resultado: Awaited<ReturnType<typeof pedirLinkDeSenhaNova>>
    try {
      resultado = await pedirLinkDeSenhaNova({ email, conferencia })
    } catch {
      resultado = { erro: "conferencia" }
    }
    setEnviando(false)
    if ("erro" in resultado) {
      setErro(ERROS[resultado.erro])
      setReinicio((r) => r + 1)
      return
    }
    setPedido(true)
  }

  return (
    <TemaClaro>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoDaMarca className="mx-auto mb-6 h-16" />
          <h1 className="text-2xl font-semibold tracking-tight">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {pedido ? AVISO_PEDIDO_RECEBIDO : "Digite o e-mail da sua conta. Vamos mandar um link para criar uma senha nova."}
          </p>
        </div>

        {!pedido && (
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="joao@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {erro && (
              <p role="alert" className="text-sm text-erro text-center">
                {erro}
              </p>
            )}

            <ConferenciaHumana aoMudar={setConferencia} aoAguardar={setConferindo} reinicio={reinicio} />

            <Button type="submit" className="mt-2 w-full" disabled={conferindo || enviando}>
              {conferindo ? "Conferindo…" : enviando ? "Enviando…" : "Enviar link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
            Voltar para o login
          </a>
        </p>
      </div>
    </div>
    </TemaClaro>
  )
}
