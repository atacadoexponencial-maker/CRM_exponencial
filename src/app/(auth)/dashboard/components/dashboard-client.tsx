"use client"

// B36-04: Dashboard no estilo Caderno — cabeçalho do dia, faixa de números com a
// variação sobre o período anterior, funil de Entrada em barras, "Para hoje",
// "Esperando resposta" e, embaixo, as seções e gráficos que o Dashboard já tinha.

import { useState, useTransition } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { buscarPainelDashboard } from "../actions"
import type { ConversaEsperando, PainelDashboard, TarefaDeHoje } from "../actions"
import { FiltrosDashboard, type FiltrosState } from "./filtros-dashboard"
import { SecoesMetricas } from "./secoes-metricas"
import { FaixaDeNumeros } from "@/components/shared/faixa-de-numeros"
import { BlocoEsperandoResposta, BlocoFunilEntrada, BlocoParaHoje } from "./blocos-do-dia"
import { formatarMoeda } from "./graficos"
import { FiltroPorCampoControle } from "@/components/shared/filtro-por-campo"
import { filtroPorCampoCompleto, type FiltroPorCampo } from "@/lib/filtro-por-campo"
import type { CampoParaFiltro } from "@/lib/filtro-contatos"
import { formatarIntervalo } from "@/lib/datas"
import { useFuso } from "@/components/shared/fuso-da-empresa"

interface DashboardClientProps {
  painelInicial: PainelDashboard
  atendentes: Array<{ id: string; nome: string }>
  papel: string
  cabecalho: { data: string; saudacao: string }
  paraHoje: TarefaDeHoje[]
  esperando: { conversas: ConversaEsperando[]; total: number }
  /** B38-07: campos personalizados da empresa, para o filtro por campo. */
  campos?: CampoParaFiltro[]
}

export function DashboardClient({ painelInicial, atendentes, papel, cabecalho, paraHoje, esperando, campos = [] }: DashboardClientProps) {
  const fuso = useFuso()
  const [painel, setPainel] = useState<PainelDashboard>(painelInicial)
  const [filtros, setFiltros] = useState<FiltrosState>({
    periodo: "30d",
    inicio: "",
    fim: "",
    atendenteId: "",
  })
  const [erro, setErro] = useState(false)
  // B38-07: o filtro por campo só vale completo (campo e valor)
  const [campo, setCampo] = useState<FiltroPorCampo | null>(null)
  const [isPending, startTransition] = useTransition()

  const podeFiltrarAtendente = papel === "admin" || papel === "gerente"
  const { metricas, variacoes } = painel

  function aplicarFiltros(novos: FiltrosState, novoCampo = campo) {
    setFiltros(novos)
    if (novos.periodo === "custom" && !novos.inicio) return
    setErro(false)
    startTransition(async () => {
      try {
        const resultado = await buscarPainelDashboard({
          periodo: novos.periodo,
          inicio: novos.inicio || undefined,
          fim: novos.fim || undefined,
          atendenteId: novos.atendenteId || null,
          ...(filtroPorCampoCompleto(novoCampo) ? { campo: novoCampo } : {}),
        })
        if (resultado) setPainel(resultado)
        else setErro(true)
      } catch {
        setErro(true)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{cabecalho.data}</span>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{cabecalho.saudacao}</h1>
            {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Atualizando" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FiltrosDashboard
            filtros={filtros}
            onChange={aplicarFiltros}
            atendentes={atendentes}
            mostrarAtendente={podeFiltrarAtendente}
          />
          <FiltroPorCampoControle
            campos={campos}
            valor={campo}
            onChange={(novo) => {
              setCampo(novo)
              if (!novo || filtroPorCampoCompleto(novo)) aplicarFiltros(filtros, novo)
            }}
          />
          {podeFiltrarAtendente && (
            <Link
              href="/dashboard/performance"
              className="whitespace-nowrap text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Performance por vendedor
            </Link>
          )}
        </div>
      </header>

      {erro && (
        <p role="alert" className="text-sm text-erro">
          Não foi possível carregar as métricas. Tente novamente.
        </p>
      )}

      <FaixaDeNumeros
        destaque
        itens={[
          // B48-10: o período escrito, para não confundir com o mês dos Relatórios
          { rotulo: `Faturado ${metricas.periodo ? `de ${formatarIntervalo(metricas.periodo.inicio, metricas.periodo.fim, fuso)}` : "no período"} (${metricas.receita.quantidadeCompras} compras)`, valor: formatarMoeda(metricas.receita.totalCompras), variacao: variacoes.totalCompras },
          { rotulo: "Ticket médio", valor: formatarMoeda(metricas.receita.ticketMedioGeral), variacao: variacoes.ticketMedioGeral },
          { rotulo: "Novos leads", valor: metricas.entrada.novosLeads, variacao: variacoes.novosLeads },
          { rotulo: "Taxa de recompra", valor: metricas.recompra.taxaRecompra, sufixo: "%", variacao: variacoes.taxaRecompra },
        ]}
      />

      <div className="flex flex-wrap gap-8">
        <div className="min-w-0 flex-[3_1_420px]">
          <BlocoFunilEntrada etapas={painel.funilEntrada} outros={painel.funisDaEmpresa} />
        </div>
        <div className="min-w-0 flex-[2_1_300px]">
          <BlocoParaHoje tarefasIniciais={paraHoje} />
        </div>
      </div>

      <BlocoEsperandoResposta conversas={esperando.conversas} total={esperando.total} />

      <div className="flex flex-col gap-6 border-t pt-8">
        <SecoesMetricas metricas={metricas} semResumo />
      </div>
    </div>
  )
}
