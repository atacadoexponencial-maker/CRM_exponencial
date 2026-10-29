"use client"

// B50-02: a conferência do Cloudflare Turnstile no cadastro e no carrinho da loja. Só
// aparece quando a Cloudflare desconfia; no resto, roda sozinha e entrega a conferência
// para o formulário mandar ao servidor, que a confirma (src/lib/conferencia-humana.ts).
//
// A conferência vale para um envio só: depois de cada tentativa, quem usa troca o
// `reinicio` e ela é gerada de novo.

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

type Turnstile = {
  render: (lugar: HTMLElement, opcoes: Record<string, unknown>) => string
  remove: (id: string) => void
}

const SCRIPT_DO_TURNSTILE = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

function turnstile(): Turnstile | undefined {
  return (window as unknown as { turnstile?: Turnstile }).turnstile
}

export function ConferenciaHumana({ aoMudar, reinicio = 0 }: { aoMudar: (conferencia: string | null) => void; reinicio?: number }) {
  const lugar = useRef<HTMLDivElement>(null)
  const avisar = useRef(aoMudar)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    avisar.current = aoMudar
  }, [aoMudar])
  const chave = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    const api = turnstile()
    if (!chave || !lugar.current || !api) return
    avisar.current(null)
    const id = api.render(lugar.current, {
      sitekey: chave,
      appearance: "interaction-only",
      language: "pt-br",
      size: "flexible",
      callback: (conferencia: string) => avisar.current(conferencia),
      "expired-callback": () => avisar.current(null),
      "error-callback": () => avisar.current(null),
    })
    return () => api.remove(id)
  }, [chave, carregado, reinicio])

  return (
    <>
      <Script src={SCRIPT_DO_TURNSTILE} strategy="afterInteractive" onReady={() => setCarregado(true)} />
      <div ref={lugar} />
    </>
  )
}
