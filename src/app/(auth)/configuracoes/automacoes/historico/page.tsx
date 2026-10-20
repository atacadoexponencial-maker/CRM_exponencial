import { redirect } from "next/navigation"
import type { ResultadoExecucao } from "@/lib/automacoes/execucoes"
import { sessaoAtual } from "@/lib/sessao"
import { listarExecucoes, regrasDoFiltroDoHistorico, type FiltrosDoHistorico } from "../actions"
import { carregarOpcoesEditor } from "../opcoes-editor"
import { HistoricoClient } from "./historico-client"

const RESULTADOS: readonly ResultadoExecucao[] = ["concluida", "falhou", "ignorada"]

// Histórico de execuções (B11-03). Os filtros ficam no endereço (?regra, ?resultado,
// ?dias), para o "Ver histórico" da lista abrir já filtrado e o link ser compartilhável.
// Uma ?regra que não é de nenhuma automação conhecida é ignorada, com aviso (B22-19).
export default async function HistoricoAutomacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ regra?: string; resultado?: string; dias?: string }>
}) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const { regra, resultado, dias } = await searchParams
  const [regras, opcoes] = await Promise.all([regrasDoFiltroDoHistorico(), carregarOpcoesEditor(supabase, perfil.workspace_id)])

  const regraConhecida = !regra || regras.some((r) => r.id === regra)
  const filtros: FiltrosDoHistorico = {
    regraId: regra && regraConhecida ? regra : undefined,
    resultado: RESULTADOS.find((r) => r === resultado),
    dias: dias === "7" ? 7 : 30,
  }
  const { execucoes, erro } = await listarExecucoes(filtros)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <HistoricoClient
        execucoes={execucoes}
        regras={regras}
        filtros={filtros}
        opcoes={opcoes}
        aviso={erro ?? (regraConhecida ? undefined : "A automação do endereço não foi encontrada. Mostrando todas.")}
      />
    </div>
  )
}
