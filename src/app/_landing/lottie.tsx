"use client"

import { useEffect, useRef, useState } from "react"
import type { AnimationItem } from "lottie-web"
import { cn } from "@/lib/utils"

type Modo = "loop" | "ao-passar"

/**
 * Ícone animado em Lottie (B24, 23/10). O `lottie-web` (versão leve) só é baixado na
 * landing e só depois que a página montou; até lá, e se o JSON falhar, fica o ícone
 * de reserva (`reserva`, um Lucide). Modo "loop" toca sempre; "ao-passar" fica no
 * primeiro quadro e toca uma vez quando o mouse passa pelo elemento pai com
 * `data-lottie-alvo`.
 */
export function Lottie({ caminho, modo, reserva, className }: { caminho: string; modo: Modo; reserva: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return

    let anim: AnimationItem | undefined
    let cancelado = false
    let alvo: HTMLElement | null = null
    const tocar = () => {
      if (!anim) return
      anim.goToAndPlay(0, true)
    }

    ;(async () => {
      try {
        const [{ default: lottie }, dados] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          fetch(caminho).then((r) => {
            if (!r.ok) throw new Error(`Lottie ${caminho}: ${r.status}`)
            return r.json()
          }),
        ])
        if (cancelado) return
        anim = lottie.loadAnimation({
          container: el,
          renderer: "svg",
          loop: modo === "loop",
          autoplay: modo === "loop",
          animationData: dados,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        })
        if (modo === "ao-passar") {
          alvo = el.closest<HTMLElement>("[data-lottie-alvo]") ?? el
          alvo.addEventListener("mouseenter", tocar)
          alvo.addEventListener("focusin", tocar)
        }
        setPronto(true)
      } catch (erro) {
        // fica o ícone de reserva; o motivo vai ao console para diagnóstico
        console.error("Lottie não carregou", caminho, erro)
      }
    })()

    return () => {
      cancelado = true
      alvo?.removeEventListener("mouseenter", tocar)
      alvo?.removeEventListener("focusin", tocar)
      anim?.destroy()
    }
  }, [caminho, modo])

  return (
    <span className={cn("relative block", className)} data-lottie={pronto ? "pronto" : "reserva"}>
      <span className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-300", pronto ? "opacity-0" : "opacity-100")} aria-hidden>
        {reserva}
      </span>
      <div ref={ref} className={cn("size-full transition-opacity duration-300", pronto ? "opacity-100" : "opacity-0")} aria-hidden />
    </span>
  )
}
