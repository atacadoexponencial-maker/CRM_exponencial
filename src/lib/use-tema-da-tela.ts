"use client"

import { useEffect, useState } from "react"

/**
 * Tema que está na tela agora ("light" | "dark"), acompanhando a troca feita no menu
 * do usuário (B36-12). Serve para bibliotecas que pedem o modo de cor, como o
 * React Flow do editor de automações.
 */
export function useTemaDaTela(): "light" | "dark" {
  const [modo, setModo] = useState<"light" | "dark">("light")
  useEffect(() => {
    const html = document.documentElement
    const ler = () => setModo(html.classList.contains("dark") ? "dark" : "light")
    ler()
    const observador = new MutationObserver(ler)
    observador.observe(html, { attributes: true, attributeFilter: ["class"] })
    return () => observador.disconnect()
  }, [])
  return modo
}
