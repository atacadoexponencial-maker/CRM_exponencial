"use client"

// Liga o editor de fluxo às actions. Na primeira vez que uma regra nova é salva,
// o endereço passa de `nova` para o id dela, e salvar de novo atualiza a mesma.
//
// Trocar o endereço faz o Next carregar a página de novo e remontar o editor
// (inclusive com `history.replaceState`: o [id] da rota muda). Por isso o
// endereço novo leva `?salva=1` (ou `?salva=ativa`), e o editor remontado já
// abre com o aviso.
//
// B46-08: a regra nova nasce desligada. "Salvar e ativar" salva e liga pela
// mesma action do botão da lista, que confere as escolhas antes de ligar.

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  alternarRegra,
  buscarContatosTeste,
  contarEsperasQueSaem,
  guardarArquivoDaAutomacao,
  salvarRegra,
  simularRegra,
  type RegraDoEditor,
} from "../actions"
import type { OpcoesEditor } from "../components/catalogo"
import { EditorFluxo, type RegraEditada } from "../components/editor-fluxo"
import { chaveDoRascunho } from "../components/rascunho-editor"
import { AVISO_SALVA, AVISO_SALVA_DESLIGADA, AVISO_SALVA_LIGADA } from "./avisos-do-salvar"


export function EditorClient({
  regra,
  opcoes,
  usuarioId,
  avisoInicial,
}: {
  regra: RegraDoEditor
  opcoes: OpcoesEditor
  /** Separa o rascunho de cada pessoa que usa o mesmo navegador. */
  usuarioId: string
  /** Aviso do primeiro salvamento de uma regra nova (`?salva=`), ou nada. */
  avisoInicial?: string
}) {
  const router = useRouter()
  // Evita criar a regra duas vezes se salvar for clicado de novo antes de o endereço trocar
  const idSalvo = useRef(regra.id)
  const [ativa, setAtiva] = useState(regra.ativa)

  async function salvar(editada: RegraEditada, ativar = false) {
    const resultado = await salvarRegra({
      id: idSalvo.current,
      nome: editada.nome,
      fluxo: editada.fluxo,
      repeticao: editada.repeticao,
    })
    if (resultado.erro) return { erro: resultado.erro }
    const nova = !idSalvo.current
    if (nova && resultado.id) idSalvo.current = resultado.id

    let ligou = false
    if (ativar && idSalvo.current) {
      const ligar = await alternarRegra(idSalvo.current, true)
      if (ligar.erro) {
        if (nova) router.replace(`/configuracoes/automacoes/${idSalvo.current}?salva=1`)
        return { erro: `A automação foi salva, mas continua desligada. ${ligar.erro}` }
      }
      ligou = true
      setAtiva(true)
    }

    if (nova && idSalvo.current) {
      router.replace(`/configuracoes/automacoes/${idSalvo.current}?salva=${ligou ? "ativa" : "1"}`)
    }
    if (ligou) return { aviso: AVISO_SALVA_LIGADA }
    return { aviso: ativa ? AVISO_SALVA : AVISO_SALVA_DESLIGADA }
  }

  return (
    <EditorFluxo
      regraInicial={{ nome: regra.nome, repeticao: regra.repeticao, fluxo: regra.fluxo }}
      opcoes={opcoes}
      avisoInicial={avisoInicial}
      ativa={ativa}
      buscarContatos={buscarContatosTeste}
      salvar={salvar}
      simular={simularRegra}
      guardarArquivo={guardarArquivoDaAutomacao}
      onVoltar={() => router.push("/configuracoes/automacoes")}
      chaveRascunho={chaveDoRascunho(usuarioId, regra.id)}
      regraNova={regra.id === null}
      // B28-04: regra ainda não salva não tem ninguém esperando
      contarEsperasQueSaem={async (fluxo) => (idSalvo.current ? contarEsperasQueSaem(idSalvo.current, fluxo) : 0)}
    />
  )
}
