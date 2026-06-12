"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { buscarMetricasDashboard } from "../actions"
import type { MetricasDashboard } from "../actions"
import { FiltrosDashboard, type FiltrosState } from "./filtros-dashboard"
import { SecoesMetricas } from "./secoes-metricas"

interface DashboardClientProps {
  metricasIniciais: MetricasDashboard
  atendentes: Array<{ id: string; nome: string }>
  papel: string
}

export function DashboardClient({ metricasIniciais, atendentes, papel }: DashboardClientProps) {
  const [metricas, setMetricas] = useState<MetricasDashboard>(metricasIniciais)
  const [filtros, setFiltros] = useState<FiltrosState>({
    periodo: "30d",
    inicio: "",
    fim: "",
    atendenteId: "",
  })
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  const podeFiltrarAtendente = papel === "admin" || papel === "gerente"

  function aplicarFiltros(novos: FiltrosState) {
    setFiltros(novos)
    if (novos.periodo === "custom" && !novos.inicio) return
    setErro(false)
    startTransition(async () => {
      try {
        const resultado = await buscarMetricasDashboard({
          periodo: novos.periodo,
          inicio: novos.inicio || undefined,
          fim: novos.fim || undefined,
          atendenteId: novos.atendenteId || null,
        })
        if (resultado) setMetricas(resultado)
        else setErro(true)
      } catch {
        setErro(true)
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-3">
          <FiltrosDashboard
            filtros={filtros}
            onChange={aplicarFiltros}
            atendentes={atendentes}
            mostrarAtendente={podeFiltrarAtendente}
          />
          {podeFiltrarAtendente && (
            <Link
              href="/dashboard/performance"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Performance por vendedor →
            </Link>
          )}
        </div>
      </div>

      {erro && (
        <p className="text-sm text-destructive mb-4">
          Não foi possível carregar as métricas. Tente novamente.
        </p>
      )}

      <SecoesMetricas metricas={metricas} />
    </>
  )
}
