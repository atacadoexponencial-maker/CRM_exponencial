"use client"

// B48-15: tag não tem espaço. O espaço digitado ou colado não entra no campo, e
// `comEspaco` diz à tela para mostrar "Tags não têm espaço". O servidor continua
// conferindo a tag; isto só poupa a pessoa do erro depois de clicar.

import { useState } from "react"

export const DICA_TAG_SEM_ESPACO = "Tags não têm espaço"

export function useCampoDeTag() {
  const [valor, setValor] = useState("")
  const [comEspaco, setComEspaco] = useState(false)

  return {
    valor,
    comEspaco,
    mudar(digitado: string) {
      setComEspaco(/\s/.test(digitado))
      setValor(digitado.replace(/\s/g, ""))
    },
    limpar() {
      setValor("")
      setComEspaco(false)
    },
  }
}
