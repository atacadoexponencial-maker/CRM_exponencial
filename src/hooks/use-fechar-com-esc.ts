"use client"

// B48-04: janela ou painel por cima da tela fecha com Esc, sem salvar. As janelas
// do Base UI já fazem isso; este gancho serve às que o CRM monta à mão.

import { useEffect, useRef } from "react"

export function useFecharComEsc(onFechar: () => void, aberto = true) {
  const fechar = useRef(onFechar)
  useEffect(() => {
    fechar.current = onFechar
  })
  useEffect(() => {
    if (!aberto) return
    function aoApertar(e: KeyboardEvent) {
      if (e.key === "Escape") fechar.current()
    }
    document.addEventListener("keydown", aoApertar)
    return () => document.removeEventListener("keydown", aoApertar)
  }, [aberto])
}
