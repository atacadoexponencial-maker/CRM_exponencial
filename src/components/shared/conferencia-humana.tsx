"use client"

// B50-02: a conferência do Cloudflare Turnstile no cadastro e no carrinho da loja. Só
// aparece quando a Cloudflare desconfia; no resto, roda sozinha e entrega a conferência
// para o formulário mandar ao servidor, que a confirma (src/lib/conferencia-humana.ts).
//
// A conferência vale para um envio só: depois de cada tentativa, quem usa troca o
// `reinicio` e ela é gerada de novo.
//
// `aoAguardar` avisa enquanto a conferência ainda está sendo feita, para o botão esperar
// em vez de mandar sem ela. Se a Cloudflare falha ou demora, o aviso é retirado e o
// envio segue: quem decide é o servidor (que deixa passar com a Cloudflare fora do ar).

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

type Turnstile = {
  render: (lugar: HTMLElement, opcoes: Record<string, unknown>) => string
  remove: (id: string) => void
}

const SCRIPT_DO_TURNSTILE = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

/** Depois disso sem resposta da Cloudflare, o botão deixa de esperar. */
const ESPERA_MAXIMA_MS = 15_000

function turnstile(): Turnstile | undefined {
  return (window as unknown as { turnstile?: Turnstile }).turnstile
}

type Props = {
  aoMudar: (conferencia: string | null) => void
  aoAguardar?: (aguardando: boolean) => void
  reinicio?: number
}

export function ConferenciaHumana({ aoMudar, aoAguardar, reinicio = 0 }: Props) {
  const lugar = useRef<HTMLDivElement>(null)
  const avisar = useRef(aoMudar)
  const aguardar = useRef(aoAguardar)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    avisar.current = aoMudar
    aguardar.current = aoAguardar
  }, [aoMudar, aoAguardar])
  const chave = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    const api = turnstile()
    if (!chave || !lugar.current || !api) return
    avisar.current(null)
    aguardar.current?.(true)
    const relogio = setTimeout(() => aguardar.current?.(false), ESPERA_MAXIMA_MS)
    const terminou = (conferencia: string | null) => {
      clearTimeout(relogio)
      avisar.current(conferencia)
      aguardar.current?.(false)
    }
    const id = api.render(lugar.current, {
      sitekey: chave,
      appearance: "interaction-only",
      language: "pt-br",
      size: "flexible",
      callback: (conferencia: string) => terminou(conferencia),
      "expired-callback": () => avisar.current(null),
      "error-callback": () => terminou(null),
    })
    return () => {
      clearTimeout(relogio)
      api.remove(id)
    }
  }, [chave, carregado, reinicio])

  // Sem a chave, nada a esperar; com ela, o script que nunca carrega também não prende o botão
  useEffect(() => {
    if (!chave) {
      aguardar.current?.(false)
      return
    }
    const relogio = setTimeout(() => aguardar.current?.(false), ESPERA_MAXIMA_MS)
    return () => clearTimeout(relogio)
  }, [chave])

  return (
    <>
      <Script
        src={SCRIPT_DO_TURNSTILE}
        strategy="afterInteractive"
        onReady={() => setCarregado(true)}
        onError={() => aguardar.current?.(false)}
      />
      <div ref={lugar} />
    </>
  )
}
