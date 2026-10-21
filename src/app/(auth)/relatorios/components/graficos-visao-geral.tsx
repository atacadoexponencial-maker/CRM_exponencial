"use client"

// B32-04: vendas diárias, projeção do mês atual e forma de pagamento, com Recharts
// (padrão da B30-05) e o balão do tema escuro do Dashboard.

import { Bar, BarChart, ComposedChart, LabelList, Line, Tooltip, XAxis, YAxis } from "recharts"
import { Balao } from "@/app/(auth)/dashboard/components/graficos"
import type { DiaDaProjecao, DiaDeVendas, FaturamentoPorForma, ProjecaoDoMes } from "@/lib/relatorios/visao-geral"

const moeda = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
const inteiro = (v: number) => v.toLocaleString("pt-BR")
const eixoMoeda = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))

const TICK = { fill: "var(--muted-foreground)", fontSize: 11 }
const COR_VALOR = "var(--primary)"
const COR_PECAS = "#f59e0b"
const COR_TICKET = "#22d3ee"
const COR_PROJECAO = "#f97316"

function Cartao({ titulo, children, lado }: { titulo: string; children: React.ReactNode; lado?: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {lado}
      </div>
      {children}
    </section>
  )
}

function formatarDataDoDia(data: string) {
  const [a, m, d] = data.split("-")
  return `${d}/${m}/${a}`
}

export function GraficoVendasDiarias({ dias }: { dias: DiaDeVendas[] }) {
  const semVenda = dias.every((d) => d.valor === 0)
  return (
    <Cartao titulo="Vendas diárias">
      {semVenda ? (
        <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
      ) : (
        <ComposedChart data={dias} width={900} height={260} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} responsive style={{ width: "100%", maxWidth: "100%" }}>
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
          <YAxis yAxisId="valor" tickLine={false} axisLine={false} tick={TICK} tickFormatter={eixoMoeda} width={48} />
          <YAxis yAxisId="outro" orientation="right" tickLine={false} axisLine={false} tick={TICK} width={44} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as DiaDeVendas | undefined
              if (!active || !d) return null
              return (
                <Balao
                  linhas={[
                    { rotulo: "Dia", valor: formatarDataDoDia(d.data) },
                    { rotulo: "Valor vendido", valor: moeda(d.valor) },
                    { rotulo: "Peças", valor: inteiro(d.pecas) },
                    { rotulo: "Ticket médio por venda", valor: moeda(d.ticket) },
                  ]}
                />
              )
            }}
          />
          <Bar yAxisId="valor" dataKey="valor" name="Valor vendido" fill={COR_VALOR} fillOpacity={0.8} radius={3} isAnimationActive={false} activeBar={{ fillOpacity: 1 }} />
          <Line yAxisId="outro" type="monotone" dataKey="pecas" name="Peças" stroke={COR_PECAS} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="outro" type="monotone" dataKey="ticket" name="Ticket médio por venda" stroke={COR_TICKET} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        </ComposedChart>
      )}
      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
        <Legenda cor={COR_VALOR} texto="Valor vendido" />
        <Legenda cor={COR_PECAS} texto="Peças" />
        <Legenda cor={COR_TICKET} texto="Ticket médio por venda" />
      </div>
    </Cartao>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor }} />
      {texto}
    </span>
  )
}

export function GraficoProjecao({ projecao }: { projecao: ProjecaoDoMes }) {
  const semVenda = projecao.realizadoAteOntem === 0
  return (
    <Cartao
      titulo="Projeção de vendas — mês atual"
      lado={
        !semVenda && (
          <div className="rounded-md border px-3 py-1.5 text-right">
            <p className="text-[11px] text-muted-foreground">Projeção total do mês</p>
            <p className="text-lg font-semibold" data-testid="total-projetado">{moeda(projecao.totalProjetado)}</p>
            <p className="text-[11px] text-muted-foreground">
              {moeda(projecao.realizadoAteOntem)} até ontem · média {moeda(projecao.mediaDiaria)}/dia · {projecao.diasRestantes} dias restantes
            </p>
          </div>
        )
      }
    >
      {semVenda ? (
        <p className="text-sm text-muted-foreground">Sem vendas ainda este mês.</p>
      ) : (
        <ComposedChart data={projecao.dias} width={900} height={220} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} responsive style={{ width: "100%", maxWidth: "100%" }}>
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={TICK} tickFormatter={eixoMoeda} width={48} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as DiaDaProjecao | undefined
              if (!active || !d) return null
              return (
                <Balao
                  linhas={[
                    { rotulo: "Dia", valor: formatarDataDoDia(d.data) },
                    d.realizado !== null ? { rotulo: "Vendido", valor: moeda(d.realizado) } : { rotulo: "Projetado", valor: moeda(d.projetado) },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="realizado" name="Vendido" fill={COR_VALOR} fillOpacity={0.8} radius={3} isAnimationActive={false} />
          <Line type="monotone" dataKey="projetado" name="Projeção" stroke={COR_PROJECAO} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        </ComposedChart>
      )}
    </Cartao>
  )
}

const ALTURA_LINHA = 28

export function GraficoFormaPagamento({ formas }: { formas: FaturamentoPorForma[] }) {
  return (
    <Cartao titulo="Forma de pagamento">
      {formas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
      ) : (
        <BarChart
          data={formas.map((f) => ({ ...f, rotuloBarra: `${moeda(f.valor)} (${f.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%)` }))}
          layout="vertical"
          width={900}
          height={formas.length * ALTURA_LINHA + 8}
          margin={{ top: 4, right: 120, bottom: 4, left: 0 }}
          barCategoryGap={6}
          responsive
          style={{ width: "100%", maxWidth: "100%" }}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="rotulo" width={150} interval={0} tickLine={false} axisLine={false} tick={{ ...TICK, fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload }) => {
              const f = payload?.[0]?.payload as FaturamentoPorForma | undefined
              if (!active || !f) return null
              return <Balao linhas={[{ rotulo: f.rotulo, valor: `${moeda(f.valor)} (${f.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%)` }]} />
            }}
          />
          <Bar dataKey="valor" fill={COR_VALOR} fillOpacity={0.8} radius={4} minPointSize={4} isAnimationActive={false} activeBar={{ fillOpacity: 1 }}>
            <LabelList dataKey="rotuloBarra" position="right" fill="var(--foreground)" fontSize={11} />
          </Bar>
        </BarChart>
      )}
    </Cartao>
  )
}
