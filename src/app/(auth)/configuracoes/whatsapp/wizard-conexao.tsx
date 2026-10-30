"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

// B23-01: "aviso" fica entre a introdução e a janela da Meta — o que muda no celular
// quando o número conectado já está em uso no WhatsApp Business.
type Step = "intro" | "aviso" | "connecting" | "finalizando"

/** B23-01: os cinco pontos do aviso, na ordem da spec. */
export const PONTOS_DO_AVISO = [
  "Aparelhos conectados ao número, como o WhatsApp Web, são desconectados e precisam ser conectados de novo.",
  "Mensagens temporárias, visualização única e listas de transmissão deixam de funcionar.",
  "Grupos continuam só no celular; o CRM não os mostra.",
  "É preciso abrir o WhatsApp Business no celular ao menos a cada 14 dias, senão o número é desconectado do CRM.",
  "Mensagem enviada pelo celular continua gratuita; a enviada pelo CRM é cobrada pela Meta.",
]

/** B23-01: eventos da janela da Meta que concluem a conexão. */
const EVENTOS_DE_CONCLUSAO = ["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"]

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
  // B23-01: escolha do Admin antes de conectar; desmarcada por padrão (SUP-B23-02).
  const [criarCards, setCriarCards] = useState(false)
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
        // B23-01: o caminho do WhatsApp Business do celular termina com outro evento,
        // que pode vir só com o waba_id; o servidor descobre o número pela WABA.
        if (data.type === "WA_EMBEDDED_SIGNUP" && EVENTOS_DE_CONCLUSAO.includes(data.event)) {
          pendingData.current = {
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
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
          setStep("aviso")
          setErro("Configuração cancelada ou dados incompletos. Tente novamente.")
          return
        }

        // Aguarda até 3s pelo evento de conclusão da janela da Meta
        const tentarFinalizar = (tentativas: number) => {
          const { phoneNumberId, wabaId } = pendingData.current
          if (wabaId) {
            setStep("finalizando")
            completarConexaoWhatsApp({ code, phoneNumberId, wabaId, criarCardsDoHistorico: criarCards }).then(
              (resultado) => {
                if (resultado.erro) {
                  setStep("aviso")
                  setErro(resultado.erro)
                  return
                }
                router.push("/chat")
              }
            )
          } else if (tentativas > 0) {
            setTimeout(() => tentarFinalizar(tentativas - 1), 300)
          } else {
            setStep("aviso")
            setErro("Não foi possível obter os dados do WhatsApp. Tente novamente.")
          }
        }
        tentarFinalizar(10)
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          // B23-01: faz a janela da Meta oferecer "usar o número que já está no
          // WhatsApp Business" (documentação "Onboarding WhatsApp Business app users").
          // Embedded Signup v4: a Meta serve toda chamada como v4 desde 15/10/2026 e
          // ignora o antigo `sessionInfoVersion`; os eventos e o featureType são os mesmos.
          featureType: "whatsapp_business_app_onboarding",
        },
      }
    )
  }

  // B23-01: o aviso vem antes da janela da Meta.
  if (step === "aviso") {
    return (
      <div className="max-w-md w-full">
        <h2 className="text-xl font-semibold mb-2">Antes de conectar</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          Se o número já está em uso no WhatsApp Business do celular, ele continua lá e passa a
          funcionar também no CRM. Veja o que muda no celular:
        </p>
        <ul className="space-y-2 text-sm list-disc pl-5 mb-5">
          {PONTOS_DO_AVISO.map((ponto) => (
            <li key={ponto}>{ponto}</li>
          ))}
        </ul>

        <label className="flex cursor-pointer items-start gap-2 text-sm mb-6">
          <input
            type="checkbox"
            checked={criarCards}
            onChange={(e) => setCriarCards(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>Criar cards no Funil de Entrada para os contatos das conversas antigas</span>
        </label>

        {erro && (
          <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro w-full text-left mb-4">
            {erro}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={handleConectar} className="gap-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white">
            <FacebookIcon />
            Entendi, abrir a janela da Meta
          </Button>
          <Button variant="ghost" onClick={() => { setErro(null); setStep("intro") }}>
            Voltar
          </Button>
        </div>
      </div>
    )
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
                ? "bg-sucesso text-background"
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
        <div className="w-20 h-20 rounded-2xl bg-sucesso flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-background fill-background" />
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
          <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro w-full text-left">
            {erro}
          </p>
        )}

        <Button
          // B23-01: primeiro o aviso do que muda no celular; a janela da Meta abre de lá.
          onClick={() => { setErro(null); setStep("aviso") }}
          disabled={step !== "intro"}
          className="gap-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
        >
          <FacebookIcon />
          {step === "finalizando" ? "Finalizando configuração..." : "Continuar com o Facebook"}
        </Button>
      </div>
    </div>
  )
}
