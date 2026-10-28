"use client"

import { createContext, useContext } from "react"
import { FUSO_DA_OPERACAO } from "@/lib/datas"

// B48-14: o fuso da empresa chega do layout e vale para toda tela de dentro.
const FusoContexto = createContext<string>(FUSO_DA_OPERACAO)

export function ProvedorDeFuso({ fuso, children }: { fuso: string; children: React.ReactNode }) {
  return <FusoContexto.Provider value={fuso}>{children}</FusoContexto.Provider>
}

/** O fuso em que esta tela mostra as datas. */
export function useFuso(): string {
  return useContext(FusoContexto)
}
