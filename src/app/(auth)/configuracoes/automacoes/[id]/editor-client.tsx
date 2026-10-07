"use client"

// Liga o editor de fluxo às actions. Na primeira vez que uma regra nova é salva,
// o endereço passa de `nova` para o id dela, e salvar de novo atualiza a mesma.

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { buscarContatosTeste, salvarRegra, simularRegra, type RegraDoEditor } from "../actions"
import type { OpcoesEditor } from "../components/catalogo"
import { EditorFluxo, type RegraEditada } from "../components/editor-fluxo"

export function EditorClient({ regra, opcoes }: { regra: RegraDoEditor; opcoes: OpcoesEditor }) {
  const router = useRouter()
  // Guardado fora do estado: o editor continua montado enquanto o endereço troca
  const idSalvo = useRef(regra.id)

  async function salvar(editada: RegraEditada) {
    const resultado = await salvarRegra({
      id: idSalvo.current,
      automationId: regra.automationId,
      nome: editada.nome,
      fluxo: editada.fluxo,
    })
    if (resultado.erro) return { erro: resultado.erro }
    if (!idSalvo.current && resultado.id) {
      idSalvo.current = resultado.id
      // Só troca o endereço, sem buscar a página de novo: o editor fica como está
      window.history.replaceState(null, "", `/configuracoes/automacoes/${resultado.id}`)
    }
    return { aviso: "Automação salva" }
  }

  return (
    <EditorFluxo
      regraInicial={{ nome: regra.nome, repeticao: { modo: "sempre" }, fluxo: regra.fluxo }}
      opcoes={opcoes}
      buscarContatos={buscarContatosTeste}
      salvar={salvar}
      simular={simularRegra}
      onVoltar={() => router.push("/configuracoes/automacoes")}
    />
  )
}
