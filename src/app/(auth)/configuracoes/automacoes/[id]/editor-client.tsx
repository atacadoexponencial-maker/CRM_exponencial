"use client"

// Liga o editor de fluxo às actions. Na primeira vez que uma regra nova é salva,
// o endereço passa de `nova` para o id dela, e salvar de novo atualiza a mesma.
//
// Trocar o endereço faz o Next carregar a página de novo e remontar o editor
// (inclusive com `history.replaceState`: o [id] da rota muda). Por isso o
// endereço novo leva `?salva=1`, e o editor remontado já abre com o aviso.

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { buscarContatosTeste, salvarRegra, simularRegra, type RegraDoEditor } from "../actions"
import type { OpcoesEditor } from "../components/catalogo"
import { EditorFluxo, type RegraEditada } from "../components/editor-fluxo"

const AVISO_SALVA = "Automação salva"

export function EditorClient({
  regra,
  opcoes,
  acabouDeSalvar,
}: {
  regra: RegraDoEditor
  opcoes: OpcoesEditor
  /** A página veio do primeiro salvamento de uma regra nova (`?salva=1`). */
  acabouDeSalvar: boolean
}) {
  const router = useRouter()
  // Evita criar a regra duas vezes se salvar for clicado de novo antes de o endereço trocar
  const idSalvo = useRef(regra.id)

  async function salvar(editada: RegraEditada) {
    const resultado = await salvarRegra({
      id: idSalvo.current,
      automationId: regra.automationId,
      nome: editada.nome,
      fluxo: editada.fluxo,
      repeticao: editada.repeticao,
    })
    if (resultado.erro) return { erro: resultado.erro }
    if (!idSalvo.current && resultado.id) {
      idSalvo.current = resultado.id
      router.replace(`/configuracoes/automacoes/${resultado.id}?salva=1`)
    }
    return { aviso: AVISO_SALVA }
  }

  return (
    <EditorFluxo
      regraInicial={{ nome: regra.nome, repeticao: regra.repeticao, fluxo: regra.fluxo }}
      opcoes={opcoes}
      avisoInicial={acabouDeSalvar ? AVISO_SALVA : undefined}
      buscarContatos={buscarContatosTeste}
      salvar={salvar}
      simular={simularRegra}
      onVoltar={() => router.push("/configuracoes/automacoes")}
    />
  )
}
