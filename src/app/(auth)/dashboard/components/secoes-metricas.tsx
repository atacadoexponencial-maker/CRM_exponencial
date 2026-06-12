"use client"

// Seções de métricas compartilhadas entre o Dashboard Geral e o detalhe
// expandido do atendente na página de Performance.

import type { MetricasDashboard } from "../actions"
import { CardMetrica, GraficoBarras, GraficoDonut, GraficoFunil, formatarMoeda } from "./graficos"

export function SecoesMetricas({ metricas }: { metricas: MetricasDashboard }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Entrada de Leads */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Entrada de Leads</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <CardMetrica titulo="Novos leads no período" valor={metricas.entrada.novosLeads} />
          <CardMetrica titulo="Leads ativos no funil agora" valor={metricas.entrada.leadsAtivos} />
        </div>
        <div className="rounded-lg border p-4">
          <span className="text-xs text-muted-foreground">Leads criados por semana</span>
          <GraficoBarras dados={metricas.entrada.leadsPorSemana} />
        </div>
      </section>

      {/* Conversão */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Conversão</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <CardMetrica titulo="Taxa de conversão (lead → primeira compra)" valor={metricas.conversao.taxaGeral} sufixo="%" />
        </div>
        <div className="rounded-lg border p-4">
          <span className="text-xs text-muted-foreground block mb-3">Funil de conversão (% sobre a etapa anterior)</span>
          <GraficoFunil etapas={metricas.conversao.funil} />
        </div>
      </section>

      {/* Retenção */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Retenção</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <CardMetrica titulo="Clientes ativos agora" valor={metricas.retencao.clientesAtivos} />
          <CardMetrica titulo="Taxa de recompra no período" valor={metricas.retencao.taxaRecompra} sufixo="%" />
          <CardMetrica titulo="Em risco" valor={metricas.retencao.emRisco} />
          <CardMetrica titulo="Inativos" valor={metricas.retencao.inativos} />
          <CardMetrica titulo="Perdidos" valor={metricas.retencao.perdidos} />
        </div>
        <div className="rounded-lg border p-4">
          <span className="text-xs text-muted-foreground block mb-3">Distribuição da base de clientes</span>
          <GraficoDonut dados={metricas.retencao.distribuicao} />
        </div>
      </section>

      {/* Receita */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Receita</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CardMetrica
            titulo={`Total de compras no período (${metricas.receita.quantidadeCompras})`}
            valor={formatarMoeda(metricas.receita.totalCompras)}
          />
          <CardMetrica
            titulo="Ticket médio de primeira compra"
            valor={formatarMoeda(metricas.receita.ticketMedioPrimeiraCompra)}
          />
          <CardMetrica
            titulo="Ticket médio geral"
            valor={formatarMoeda(metricas.receita.ticketMedioGeral)}
          />
          <CardMetrica
            titulo="Faturamento de clientes novos"
            valor={metricas.receita.percentualNovos}
            sufixo="%"
          />
        </div>
      </section>
    </div>
  )
}
