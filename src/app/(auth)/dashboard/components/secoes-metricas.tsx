"use client"

// Seções de métricas compartilhadas entre o Dashboard Geral e o detalhe
// expandido do atendente na página de Performance.
// B36-04: cada seção é uma faixa de números (linhas finas, sem cartões iguais) e o
// gráfico dela. No Dashboard, os números que já estão na faixa do topo não se repetem.

import type { MetricasDashboard } from "../actions"
import { GraficoBarras, GraficoDonut, GraficoFunil, formatarMoeda } from "./graficos"
import { FaixaDeNumeros, type NumeroDaFaixa } from "@/components/shared/faixa-de-numeros"

function Secao({ titulo, numeros, children }: { titulo: string; numeros: NumeroDaFaixa[]; children?: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {numeros.length > 0 && <FaixaDeNumeros itens={numeros} />}
      {children}
    </section>
  )
}

function CaixaDoGrafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <span className="mb-3 block text-xs text-muted-foreground">{titulo}</span>
      {children}
    </div>
  )
}

export function SecoesMetricas({ metricas, semResumo = false }: { metricas: MetricasDashboard; semResumo?: boolean }) {
  const entrada: NumeroDaFaixa[] = [
    ...(semResumo ? [] : [{ rotulo: "Novos leads no período", valor: metricas.entrada.novosLeads }]),
    { rotulo: "Leads ativos no funil agora", valor: metricas.entrada.leadsAtivos },
  ]
  const recompra: NumeroDaFaixa[] = [
    { rotulo: "Clientes ativos agora", valor: metricas.recompra.clientesAtivos },
    ...(semResumo ? [] : [{ rotulo: "Taxa de recompra no período", valor: metricas.recompra.taxaRecompra, sufixo: "%" }]),
    { rotulo: "Em risco", valor: metricas.recompra.emRisco },
    { rotulo: "Inativos", valor: metricas.recompra.inativos },
    { rotulo: "Perdidos", valor: metricas.recompra.perdidos },
  ]
  const receita: NumeroDaFaixa[] = [
    ...(semResumo
      ? []
      : [
          { rotulo: `Total de compras no período (${metricas.receita.quantidadeCompras})`, valor: formatarMoeda(metricas.receita.totalCompras) },
          { rotulo: "Ticket médio geral", valor: formatarMoeda(metricas.receita.ticketMedioGeral) },
        ]),
    { rotulo: "Ticket médio de primeira compra", valor: formatarMoeda(metricas.receita.ticketMedioPrimeiraCompra) },
    { rotulo: "Faturamento de clientes novos", valor: metricas.receita.percentualNovos, sufixo: "%" },
  ]

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-9 lg:grid-cols-2">
      <Secao titulo="Entrada de Leads" numeros={entrada}>
        <CaixaDoGrafico titulo="Leads criados por semana">
          <GraficoBarras dados={metricas.entrada.leadsPorSemana} />
        </CaixaDoGrafico>
      </Secao>

      <Secao titulo="Conversão" numeros={[{ rotulo: "Taxa de conversão (lead → ganho)", valor: metricas.conversao.taxaGeral, sufixo: "%" }]}>
        <CaixaDoGrafico titulo="Funil de conversão (% sobre a etapa anterior)">
          <GraficoFunil etapas={metricas.conversao.funil} />
        </CaixaDoGrafico>
      </Secao>

      <Secao titulo="Recompra" numeros={recompra}>
        <CaixaDoGrafico titulo="Distribuição da base de clientes">
          <GraficoDonut dados={metricas.recompra.distribuicao} />
        </CaixaDoGrafico>
      </Secao>

      <Secao titulo="Receita" numeros={receita} />
    </div>
  )
}
