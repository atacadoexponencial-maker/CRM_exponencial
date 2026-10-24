"use client"

// B34-01: aba Coorte — tabelas de retenção e valor médio por coorte, com Excel.

import { useEffect, useState, useTransition } from "react"
import { Download, Loader2 } from "lucide-react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { MESES_DA_COORTE, rotuloDoMesK, type Coorte, type ResultadoCoorte, type ResumoCoortes } from "@/lib/relatorios/coorte"
import { urlDeExportacaoCoorte, type TabelaCoorte } from "@/lib/relatorios/exportar-coorte"
import { buscarCoorte } from "../actions"
import { Entenda } from "./entenda"

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const COLUNAS = Array.from({ length: MESES_DA_COORTE }, (_, k) => k)

function Celula({ coorte, k, tabela, max }: { coorte: Coorte; k: number; tabela: TabelaCoorte; max: number }) {
  const valor = tabela === "retencao" ? coorte.retencao[k] : coorte.valorMedio[k]
  if (valor === null) return <td className="px-2 py-1.5 text-center text-muted-foreground/60" title={rotuloDoMesK(coorte, k)}>—</td>
  const intensidade = max > 0 ? Math.min(1, valor / max) : 0
  const cor = tabela === "retencao" ? `rgba(91, 141, 239, ${0.15 + 0.7 * intensidade})` : `rgba(76, 175, 125, ${0.15 + 0.7 * intensidade})`
  const texto = tabela === "retencao" ? `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : moeda(valor)
  const balao = tabela === "retencao" ? `${rotuloDoMesK(coorte, k)}: ${coorte.clientesPorMes[k]} de ${coorte.clientes} clientes` : `${rotuloDoMesK(coorte, k)}: ${coorte.vendasPorMes[k]} vendas`
  return (
    // B36-02: célula clara (pouca intensidade) leva texto do tema; a forte, texto branco.
    <td className={`px-2 py-1.5 text-center numero ${intensidade > 0.5 ? "text-white" : "text-foreground"}`} style={{ backgroundColor: cor }} title={balao} data-testid={`celula-${coorte.mes}-${k}`}>
      {texto}
    </td>
  )
}

export function TabelasDeCoorte({ coortes, atendenteId }: { coortes: Coorte[]; atendenteId: string | null }) {
  const [tabela, setTabela] = useState<TabelaCoorte>("retencao")
  const valores = coortes.flatMap((c) => (tabela === "retencao" ? c.retencao.slice(1) : c.valorMedio)).filter((v): v is number => v !== null)
  const max = valores.length ? Math.max(...valores) : 0

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-1" role="tablist" aria-label="Tabela de coorte">
          {([["retencao", "Recompra por coorte"], ["valor", "Valor médio de venda"]] as Array<[TabelaCoorte, string]>).map(([id, nome]) => (
            <button key={id} type="button" role="tab" aria-selected={tabela === id} onClick={() => setTabela(id)} className={cn("h-8 rounded-lg border px-3 text-sm", tabela === id ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:bg-muted")}>
              {nome}
            </button>
          ))}
        </div>
        <a href={urlDeExportacaoCoorte(tabela, atendenteId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted">
          <Download className="size-3.5" /> Exportar
        </a>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {tabela === "retencao" ? "% de clientes de cada coorte que voltaram a comprar em cada mês depois da primeira compra" : "Valor médio por venda dos clientes de cada coorte, em cada mês depois da primeira compra"}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" data-testid={`tabela-${tabela}`}>
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="py-2 pr-3 text-left font-medium">Coorte</th>
              <th className="py-2 pr-3 text-right font-medium">Clientes</th>
              {COLUNAS.map((k) => (
                <th key={k} className="py-2 px-2 text-center font-medium whitespace-nowrap">Mês {k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coortes.map((c) => (
              <tr key={c.mes} className="border-b last:border-0" data-testid={`coorte-${c.mes}`}>
                <td className="py-1.5 pr-3 whitespace-nowrap">{c.rotulo}</td>
                <td className="py-1.5 pr-3 text-right numero">{c.clientes}</td>
                {COLUNAS.map((k) => (
                  <Celula key={k} coorte={c} k={k} tabela={tabela} max={max} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const ENTENDA: Array<[string, string]> = [
  ["O que são coortes?", "Coortes são grupos de clientes que fizeram a primeira compra no mesmo mês. A análise mostra como cada grupo se comporta ao longo do tempo."],
  ["Recompra por coorte", "Mostra a porcentagem de clientes de cada coorte que voltaram a comprar em cada mês depois da primeira compra. O Mês 0 é sempre 100%, porque é o mês em que todos fizeram a primeira compra."],
  ["Como ler os dados", "As linhas são os meses em que os clientes fizeram a primeira compra. As colunas mostram o comportamento desses clientes nos meses seguintes. Cores mais fortes indicam mais recompra ou maior valor médio."],
  ["Valor médio de venda", "Mostra o valor médio das vendas feitas pelos clientes de cada coorte em cada mês. Ajuda a ver se clientes mais antigos gastam mais que os novos, ou se há padrões sazonais."],
]

export function ResumoDasCoortes({ resumo }: { resumo: ResumoCoortes }) {
  const dados = resumo.recompraPorMes.map((m) => ({ rotulo: `Mês ${m.mes}`, valor: m.percentual, texto: m.percentual === null ? "" : `${m.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` }))
  const temBarra = dados.some((d) => d.valor !== null)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-md border bg-card p-5">
        <h2 className="text-sm font-semibold">Taxa de recompra</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Média ponderada pelo tamanho das coortes, dos meses 1 a 11 que já chegaram</p>
        <p className="text-4xl font-semibold" data-testid="retencao-media-geral">
          {resumo.retencaoMediaGeral === null ? "—" : `${resumo.retencaoMediaGeral.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
        </p>
        <p className="text-xs text-muted-foreground mt-2">Taxa média de clientes que voltam a comprar, considerando todas as coortes</p>
      </section>
      <section className="rounded-md border bg-card p-5">
        <h2 className="text-sm font-semibold">Recompra geral por mês</h2>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">% de clientes que fizeram ao menos uma nova compra em cada mês depois da primeira</p>
        {temBarra ? (
          <BarChart data={dados} width={520} height={180} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} responsive style={{ width: "100%", maxWidth: "100%" }}>
            <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} interval={0} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} width={36} domain={[0, 100]} />
            <Bar dataKey="valor" fill="var(--chart-2)" fillOpacity={0.85} radius={3} isAnimationActive={false}>
              <LabelList dataKey="texto" position="top" fill="var(--foreground)" fontSize={10} />
            </Bar>
          </BarChart>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não há meses para comparar.</p>
        )}
        <ul className="sr-only" data-testid="recompra-por-mes">
          {resumo.recompraPorMes.map((m) => (
            <li key={m.mes}>Mês {m.mes}: {m.percentual === null ? "—" : `${m.percentual}%`}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function EntendaCoortes() {
  return <Entenda titulo="Entenda a análise de coortes" itens={ENTENDA} />
}

export function CoorteClient({ atendenteId, inicial = null }: { atendenteId: string | null; inicial?: ResultadoCoorte | null }) {
  const [resultado, setResultado] = useState<ResultadoCoorte | null>(inicial)
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (inicial) return
    startTransition(async () => {
      try {
        const r = await buscarCoorte({ atendenteId })
        if (r) {
          setResultado(r)
          setErro(false)
        } else setErro(true)
      } catch {
        setErro(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendenteId])

  if (erro) return <p className="text-sm text-destructive">Não foi possível carregar as coortes. Tente novamente.</p>
  if (!resultado) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Calculando as coortes…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Análise de coortes</h2>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      {/* Entenda no topo (preview da B36, 22/10), depois o resumo e as tabelas. */}
      <EntendaCoortes />
      <ResumoDasCoortes resumo={resultado.resumo} />
      <TabelasDeCoorte coortes={resultado.coortes} atendenteId={atendenteId} />
    </div>
  )
}
