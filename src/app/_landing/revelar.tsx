"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Entrada suave ao rolar (B24-01): o bloco começa transparente e um pouco abaixo,
 * e sobe para o lugar quando entra na tela. Sem JavaScript ou com "reduzir
 * movimento" ligado, aparece direto. O HTML é o mesmo nos dois casos, então
 * buscadores e o analista da Meta leem tudo.
 */
export function Revelar({ children, className, atraso = 0 }: { children: React.ReactNode; className?: string; atraso?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      // Navegador sem o observador: mostra no próximo ciclo, sem animação.
      const id = window.setTimeout(() => setVisivel(true), 0)
      return () => window.clearTimeout(id)
    }
    // Com "reduzir movimento", as classes motion-reduce já mostram o bloco; o
    // observador só marca o estado.
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true)
          obs.disconnect()
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    )
    obs.observe(el)
    // Reforço para rolagem muito rápida: se o bloco já passou do fim da tela, mostra.
    let pedido = 0
    const aoRolar = () => {
      if (pedido) return
      pedido = window.requestAnimationFrame(() => {
        pedido = 0
        if (el.getBoundingClientRect().top < window.innerHeight) {
          setVisivel(true)
          obs.disconnect()
          window.removeEventListener("scroll", aoRolar)
        }
      })
    }
    window.addEventListener("scroll", aoRolar, { passive: true })
    return () => {
      obs.disconnect()
      window.removeEventListener("scroll", aoRolar)
      if (pedido) window.cancelAnimationFrame(pedido)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-revelar={visivel ? "visivel" : "escondido"}
      style={{ transitionDelay: `${atraso}ms` }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        visivel ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  )
}
