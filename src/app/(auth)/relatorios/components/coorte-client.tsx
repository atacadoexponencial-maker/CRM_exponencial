"use client"

// B34-01: aba Coorte — tabelas de retenção e valor médio por coorte, com Excel.

import { useEffect, useState, useTransition } from "react"
import { Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MESES_DA_COORTE, rotuloDoMesK, type Coorte, type ResultadoCoorte } from "@/lib/relatorios/coorte"
import { urlDeExportacaoCoorte, type TabelaCoorte } from "@/lib/relatorios/exportar-coorte"
import { buscarCoorte } from "../actions"

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
    <td className="px-2 py-1.5 text-center tabular-nums text-white" style={{ backgroundColor: cor }} title={balao} data-testid={`celula-${coorte.mes}-${k}`}>
      {texto}
    </td>
  )
}

export function TabelasDeCoorte({ coortes, atendenteId }: { coortes: Coorte[]; atendenteId: string | null }) {
  const [tabela, setTabela] = useState<TabelaCoorte>("retencao")
  const valores = coortes.flatMap((c) => (tabela === "retencao" ? c.retencao.slice(1) : c.valorMedio)).filter((v): v is number => v !== null)
  const max = valores.length ? Math.max(...valores) : 0

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-1" role="tablist" aria-label="Tabela de coorte">
          {([["retencao", "Retenção de clientes"], ["valor", "Valor médio de venda"]] as Array<[TabelaCoorte, string]>).map(([id, nome]) => (
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
                <td className="py-1.5 pr-3 text-right tabular-nums">{c.clientes}</td>
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
      <TabelasDeCoorte coortes={resultado.coortes} atendenteId={atendenteId} />
    </div>
  )
}
