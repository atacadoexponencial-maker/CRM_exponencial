"use client"

// Liga a lista de automações às actions. A lista vem do servidor; depois de cada
// mudança, `router.refresh()` busca de novo.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { alternarRegra, duplicarRegra, excluirRegra } from "./actions"
import type { OpcoesEditor } from "./components/catalogo"
import { ListaRegras, type RegraListada } from "./components/lista-regras"

export function ListaClient({ regras, opcoes }: { regras: RegraListada[]; opcoes: OpcoesEditor }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)

  const porId = (id: string) => regras.find((r) => r.id === id)

  async function executar(acao: Promise<{ erro?: string }>) {
    setErro(null)
    const resultado = await acao
    if (resultado.erro) setErro(resultado.erro)
    router.refresh()
    return resultado
  }

  return (
    <>
      {erro && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}
      <ListaRegras
        regras={regras}
        opcoes={opcoes}
        historicoDisponivel={false}
        onNova={() => router.push("/configuracoes/automacoes/nova")}
        onEditar={(id) =>
          router.push(
            porId(id)?.versaoAntiga ? `/configuracoes/automacoes/nova?antiga=${id}` : `/configuracoes/automacoes/${id}`
          )
        }
        onAlternar={(id, ativa) => executar(alternarRegra(id, ativa))}
        onDuplicar={(id) => executar(duplicarRegra(id, porId(id)?.versaoAntiga ?? false))}
        onVerHistorico={() => {}}
        onExcluir={(id) => executar(excluirRegra(id))}
      />
    </>
  )
}
