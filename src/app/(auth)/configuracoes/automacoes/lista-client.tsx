"use client"

// Liga a lista de automações às actions. A lista vem do servidor; depois de cada
// mudança, `router.refresh()` busca de novo.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { alternarRegra, duplicarRegra, excluirRegra, salvarHorarioComercial } from "./actions"
import type { OpcoesEditor } from "./components/catalogo"
import { DialogoHorarioComercial } from "./components/dialogo-horario-comercial"
import { ListaRegras, type RegraListada } from "./components/lista-regras"

export function ListaClient({ regras, opcoes }: { regras: RegraListada[]; opcoes: OpcoesEditor }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [horarioAberto, setHorarioAberto] = useState(false)

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
        historicoDisponivel
        onNova={() => router.push("/configuracoes/automacoes/nova")}
        onAbrirHistorico={() => router.push("/configuracoes/automacoes/historico")}
        onAbrirHorario={() => setHorarioAberto(true)}
        onEditar={(id) => router.push(`/configuracoes/automacoes/${id}`)}
        onAlternar={(id, ativa) => executar(alternarRegra(id, ativa))}
        onDuplicar={(id) => executar(duplicarRegra(id))}
        onVerHistorico={(id) => router.push(`/configuracoes/automacoes/historico?regra=${id}`)}
        onExcluir={(id) => executar(excluirRegra(id))}
      />
      <DialogoHorarioComercial
        aberto={horarioAberto}
        horario={opcoes.horarioComercial}
        onFechar={() => setHorarioAberto(false)}
        onSalvar={async (horario) => {
          const resultado = await salvarHorarioComercial(horario)
          if (!resultado.erro) router.refresh()
          return resultado
        }}
      />
    </>
  )
}
