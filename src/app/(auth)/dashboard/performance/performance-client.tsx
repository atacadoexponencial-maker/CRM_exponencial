"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { buscarMetricasDashboard, buscarPerformanceVendedores } from "../actions"
import type { MetricasDashboard, PerformanceVendedor } from "../actions"
import { FiltrosDashboard, type FiltrosState } from "../components/filtros-dashboard"
import { SecoesMetricas } from "../components/secoes-metricas"
import { formatarMoeda } from "../components/graficos"

type Coluna = keyof Omit<PerformanceVendedor, "atendenteId">

const COLUNAS: Array<{ id: Coluna; label: string }> = [
  { id: "nome", label: "Atendente" },
  { id: "leadsCriados", label: "Leads" },
  { id: "convertidos", label: "Convertidos" },
  { id: "taxaConversao", label: "Taxa" },
  { id: "clientesAtivos", label: "Clientes ativos" },
  { id: "emRisco", label: "Em risco" },
  { id: "recompras", label: "Recompras" },
  { id: "ticketMedio", label: "Ticket médio" },
]

export function PerformanceClient({ linhasIniciais }: { linhasIniciais: PerformanceVendedor[] }) {
  const [linhas, setLinhas] = useState<PerformanceVendedor[]>(linhasIniciais)
  const [filtros, setFiltros] = useState<FiltrosState>({ periodo: "30d", inicio: "", fim: "", atendenteId: "" })
  const [ordem, setOrdem] = useState<{ coluna: Coluna; asc: boolean }>({ coluna: "nome", asc: true })
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<MetricasDashboard | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  function aplicarFiltros(novos: FiltrosState) {
    setFiltros(novos)
    if (novos.periodo === "custom" && !novos.inicio) return
    setErro(false)
    setExpandidoId(null)
    setDetalhe(null)
    startTransition(async () => {
      try {
        const resultado = await buscarPerformanceVendedores({
          periodo: novos.periodo,
          inicio: novos.inicio || undefined,
          fim: novos.fim || undefined,
        })
        if (resultado) setLinhas(resultado)
        else setErro(true)
      } catch {
        setErro(true)
      }
    })
  }

  function ordenarPor(coluna: Coluna) {
    setOrdem((atual) => ({
      coluna,
      asc: atual.coluna === coluna ? !atual.asc : coluna === "nome",
    }))
  }

  async function alternarDetalhe(atendenteId: string) {
    if (expandidoId === atendenteId) {
      setExpandidoId(null)
      setDetalhe(null)
      return
    }
    setExpandidoId(atendenteId)
    setDetalhe(null)
    setCarregandoDetalhe(true)
    try {
      const resultado = await buscarMetricasDashboard({
        periodo: filtros.periodo,
        inicio: filtros.inicio || undefined,
        fim: filtros.fim || undefined,
        atendenteId,
      })
      setDetalhe(resultado)
    } catch {
      setDetalhe(null)
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  const linhasOrdenadas = [...linhas].sort((a, b) => {
    const va = a[ordem.coluna]
    const vb = b[ordem.coluna]
    let cmp: number
    if (typeof va === "string" && typeof vb === "string") {
      cmp = va.localeCompare(vb, "pt-BR")
    } else {
      cmp = (Number(va) || 0) - (Number(vb) || 0)
    }
    return ordem.asc ? cmp : -cmp
  })

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Performance por Vendedor</h1>
          {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-3">
          <FiltrosDashboard filtros={filtros} onChange={aplicarFiltros} mostrarAtendente={false} />
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {erro && (
        <p className="text-sm text-destructive mb-4">
          Não foi possível carregar os dados. Tente novamente.
        </p>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {COLUNAS.map((c) => (
                <th
                  key={c.id}
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
                  onClick={() => ordenarPor(c.id)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {ordem.coluna === c.id &&
                      (ordem.asc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasOrdenadas.length === 0 && (
              <tr>
                <td colSpan={COLUNAS.length} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum atendente encontrado
                </td>
              </tr>
            )}
            {linhasOrdenadas.map((linha) => (
              <FragmentLinha
                key={linha.atendenteId}
                linha={linha}
                expandido={expandidoId === linha.atendenteId}
                onClick={() => alternarDetalhe(linha.atendenteId)}
                detalhe={expandidoId === linha.atendenteId ? detalhe : null}
                carregando={expandidoId === linha.atendenteId && carregandoDetalhe}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FragmentLinha({
  linha,
  expandido,
  onClick,
  detalhe,
  carregando,
}: {
  linha: PerformanceVendedor
  expandido: boolean
  onClick: () => void
  detalhe: MetricasDashboard | null
  carregando: boolean
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
          expandido && "bg-muted/30"
        )}
        onClick={onClick}
      >
        <td className="px-3 py-3 font-medium whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5">
            {expandido ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {linha.nome}
          </span>
        </td>
        <td className="px-3 py-3">{linha.leadsCriados}</td>
        <td className="px-3 py-3">{linha.convertidos}</td>
        <td className="px-3 py-3">{linha.taxaConversao !== null ? `${linha.taxaConversao}%` : "—"}</td>
        <td className="px-3 py-3">{linha.clientesAtivos}</td>
        <td className="px-3 py-3">{linha.emRisco}</td>
        <td className="px-3 py-3">{linha.recompras}</td>
        <td className="px-3 py-3 whitespace-nowrap">{formatarMoeda(linha.ticketMedio) ?? "—"}</td>
      </tr>
      {expandido && (
        <tr className="border-b last:border-0 bg-muted/10">
          <td colSpan={8} className="px-4 py-4">
            {carregando && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="size-4 animate-spin" /> Carregando métricas…
              </div>
            )}
            {!carregando && detalhe && <SecoesMetricas metricas={detalhe} />}
            {!carregando && !detalhe && (
              <p className="text-sm text-muted-foreground py-2">Não foi possível carregar o detalhe.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
