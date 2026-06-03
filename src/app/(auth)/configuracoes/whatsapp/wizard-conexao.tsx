"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { completarConexaoWhatsApp, conectarNumeroTeste } from "./actions"

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

type Step = "intro" | "connecting" | "finalizando"

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function WizardConexao() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("intro")
  const [erro, setErro] = useState<string | null>(null)
  const [erroTeste, setErroTeste] = useState<string | null>(null)
  const [conectandoTeste, setConectandoTeste] = useState(false)
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
      if (event.origin.includes("facebook.com") || event.origin.includes("meta.com")) {
        console.log("[embedded-signup] mensagem recebida:", event.origin, event.data)
      }
      if (!event.origin.includes("facebook.com") && !event.origin.includes("meta.com")) return
      try {
        const data = JSON.parse(event.data)
        console.log("[embedded-signup] parsed:", data.type, data.event, data.data)
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

  function handleConectar() {
    if (!window.FB) {
      setErro("SDK do Meta não carregou. Recarregue a página e tente novamente.")
      return
    }
    setErro(null)
    pendingData.current = {}
    setStep("connecting")

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setStep("intro")
          setErro("Configuração cancelada ou dados incompletos. Tente novamente.")
          return
        }

        // Aguarda até 3s pelo evento WA_EMBEDDED_SIGNUP FINISH
        const tentarFinalizar = (tentativas: number) => {
          const { phoneNumberId, wabaId } = pendingData.current
          if (phoneNumberId && wabaId) {
            setStep("finalizando")
            completarConexaoWhatsApp({ code, phoneNumberId, wabaId }).then((resultado) => {
              if (resultado.erro) {
                setStep("intro")
                setErro(resultado.erro)
                return
              }
              router.push("/chat")
            })
          } else if (tentativas > 0) {
            setTimeout(() => tentarFinalizar(tentativas - 1), 300)
          } else {
            setStep("intro")
            setErro("Não foi possível obter os dados do WhatsApp. Tente novamente.")
          }
        }
        tentarFinalizar(10)
      },
      {
        config_id: "4323624887902256",
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

  async function handleConectarTeste() {
    setErroTeste(null)
    setConectandoTeste(true)
    const resultado = await conectarNumeroTeste()
    setConectandoTeste(false)
    if (resultado.erro) {
      setErroTeste(resultado.erro)
      return
    }
    router.push("/chat")
  }

  const stepAtivo = step === "finalizando" ? 2 : 1

  return (
    <div className="max-w-md w-full">
      <div className="flex items-center gap-3 mb-10">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
              stepAtivo > 1
                ? "bg-green-500 text-white"
                : "bg-primary text-primary-foreground"
            )}
          >
            {stepAtivo > 1 ? "✓" : "1"}
          </div>
          <span className={cn("text-sm", stepAtivo === 1 ? "font-medium" : "text-muted-foreground")}>
            Conectar Facebook
          </span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
              stepAtivo === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            2
          </div>
          <span className={cn("text-sm", stepAtivo === 2 ? "font-medium" : "text-muted-foreground")}>
            Finalizar
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-white fill-white" />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Conecte o WhatsApp Business</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            Vincule sua conta WhatsApp Business existente ou crie uma nova com um número de telefone.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mt-3">
            Esse processo leva aproximadamente 10 a 15 minutos. Certifique-se de que seu número de telefone esteja ativo durante a configuração.
          </p>
        </div>

        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive w-full text-left">
            {erro}
          </p>
        )}

        <Button
          onClick={handleConectar}
          disabled={step !== "intro"}
          className="gap-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
        >
          <FacebookIcon />
          {step === "finalizando" ? "Finalizando configuração..." : "Continuar com o Facebook"}
        </Button>

        <div className="flex flex-col items-center gap-1">
          <p className="text-xs text-muted-foreground">
            Ambiente de teste (aguardando aprovação da Meta)
          </p>
          {erroTeste && (
            <p className="text-xs text-destructive">{erroTeste}</p>
          )}
          <button
            onClick={handleConectarTeste}
            disabled={conectandoTeste || step !== "intro"}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            {conectandoTeste ? "Conectando..." : "Usar número de teste"}
          </button>
        </div>
      </div>
    </div>
  )
}
