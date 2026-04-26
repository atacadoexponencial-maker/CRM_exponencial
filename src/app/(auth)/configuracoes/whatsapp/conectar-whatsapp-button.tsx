"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { completarConexaoWhatsApp } from "./actions"

declare global {
  interface Window {
    FB: {
      init: (params: object) => void
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        params: object
      ) => void
    }
    fbAsyncInit: () => void
  }
}

export function ConectarWhatsAppButton() {
  const router = useRouter()
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const pendingData = useRef<{ phoneNumberId?: string; wabaId?: string }>({})

  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      })
    }

    const script = document.createElement("script")
    script.id = "facebook-jssdk"
    script.src = "https://connect.facebook.net/pt_BR/sdk.js"
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com") return
      try {
        const data = JSON.parse(event.data)
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.event === "FINISH") {
          pendingData.current = {
            phoneNumberId: data.data.phone_number_id,
            wabaId: data.data.waba_id,
          }
        }
      } catch {}
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  async function handleConectar() {
    if (!window.FB) {
      setErro("SDK do Meta não carregou. Recarregue a página e tente novamente.")
      return
    }
    setErro(null)
    pendingData.current = {}

    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code
        const { phoneNumberId, wabaId } = pendingData.current

        if (!code || !phoneNumberId || !wabaId) return

        setConectando(true)
        const resultado = await completarConexaoWhatsApp({ code, phoneNumberId, wabaId })
        setConectando(false)

        if (resultado.erro) {
          setErro(resultado.erro)
          return
        }

        router.refresh()
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_APP_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive max-w-sm text-right">
          {erro}
        </p>
      )}
      <Button onClick={handleConectar} disabled={conectando}>
        {conectando ? "Conectando..." : "Conectar número"}
      </Button>
    </div>
  )
}
