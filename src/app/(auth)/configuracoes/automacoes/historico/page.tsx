import { redirect } from "next/navigation"
import type { ResultadoExecucao } from "@/lib/automacoes/execucoes"
import { sessaoAtual } from "@/lib/sessao"
import { listarExecucoes, listarRegras, type FiltrosDoHistorico } from "../actions"
import { carregarOpcoesEditor } from "../opcoes-editor"
import { HistoricoClient } from "./historico-client"

const RESULTADOS: readonly ResultadoExecucao[] = ["concluida", "falhou", "ignorada"]

// Histórico de execuções (B11-03). Os filtros ficam no endereço (?regra, ?resultado,
// ?dias), para o "Ver histórico" da lista abrir já filtrado e o link ser compartilhável.
export default async function HistoricoAutomacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ regra?: string; resultado?: string; dias?: string }>
}) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const { regra, resultado, dias } = await searchParams
  const filtros: FiltrosDoHistorico = {
    regraId: regra || undefined,
    resultado: RESULTADOS.find((r) => r === resultado),
    dias: dias === "7" ? 7 : 30,
  }

  const [execucoes, regras, opcoes] = await Promise.all([
    listarExecucoes(filtros),
    listarRegras(),
    carregarOpcoesEditor(supabase, perfil.workspace_id),
  ])

  // No filtro de regra: as regras de agora e as que só existem mais no histórico
  const regrasDoFiltro = regras.map((r) => ({ id: r.id, nome: r.nome }))
  for (const e of execucoes) {
    if (e.regraExcluida && !regrasDoFiltro.some((r) => r.id === e.regraId)) {
      regrasDoFiltro.push({ id: e.regraId, nome: `${e.regraNome} (excluída)` })
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <HistoricoClient execucoes={execucoes} regras={regrasDoFiltro} filtros={filtros} opcoes={opcoes} />
    </div>
  )
}
