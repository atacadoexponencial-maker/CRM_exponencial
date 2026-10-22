"use client"

import { useEffect } from "react"
import { aplicarTemaNoNavegador, type Tema } from "@/lib/tema"

/**
 * O perfil manda no tema (B36-01). Se o cookie deste navegador ficou para trás (a
 * pessoa trocou o tema em outro aparelho), corrige a classe e o cookie aqui.
 */
export function SincronizarTema({ tema }: { tema: Tema }) {
  useEffect(() => {
    const escuroNaTela = document.documentElement.classList.contains("dark")
    if (escuroNaTela !== (tema === "escuro")) aplicarTemaNoNavegador(tema)
  }, [tema])
  return null
}
