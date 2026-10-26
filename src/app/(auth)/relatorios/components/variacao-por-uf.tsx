"use client"

// B32-06: variação em relação ao ano anterior, por UF do contato, com ordenação, total e Excel.

import { useState } from "react"
import { Download, ArrowUpDown } from "lucide-react"
import type { LinhaPorUf, VariacaoPorUf } from "@/lib/relatorios/visao-geral"

type Coluna = keyof LinhaPorUf

const COLUNAS: Array<{ id: Coluna; titulo: string; alinhar?: "right" }> = [
  { id: "uf", titulo: "UF" },
  { id: "clientes", titulo: "Clientes", alinhar: "right" },
  { id: "crescimentoClientes", titulo: "Cresc. clientes (ano ant.)", alinhar: "right" },
  { id: "vendas", titulo: "Vendas", alinhar: "right" },
  { id: "crescimentoVendas", titulo: "Cresc. vendas (ano ant.)", alinhar: "right" },
  { id: "ticketMedio", titulo: "Ticket médio", alinhar: "right" },
]

const moeda = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))

function Percentual({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-muted-foreground">—</span>
  const cor = valor > 0 ? "text-sucesso" : valor < 0 ? "text-erro" : "text-muted-foreground"
  const sinal = valor < 0 ? "−" : ""
  return <span className={cor}>{sinal}{Math.abs(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
}

function Celula({ coluna, linha }: { coluna: Coluna; linha: LinhaPorUf }) {
  const v = linha[coluna]
  if (coluna === "uf") return <>{linha.uf}</>
  if (coluna === "clientes") return <>{linha.clientes}</>
  if (coluna === "vendas" || coluna === "ticketMedio") return <>{moeda(v as number | null)}</>
  return <Percentual valor={v as number | null} />
}

export function VariacaoPorUfTabela({
  variacao,
  urlExportar,
  titulo = "Variação em relação ao ano anterior",
  rotuloDoGrupo = "UF",
}: {
  variacao: VariacaoPorUf
  urlExportar: string
  /** B38-08: a tabela "Vendas por campo" usa a mesma, com outro título e o nome do campo. */
  titulo?: string
  rotuloDoGrupo?: string
}) {
  const [ordem, setOrdem] = useState<{ coluna: Coluna; desc: boolean }>({ coluna: "vendas", desc: true })

  function ordenarPor(coluna: Coluna) {
    setOrdem((o) => (o.coluna === coluna ? { coluna, desc: !o.desc } : { coluna, desc: coluna !== "uf" }))
  }

  const linhas = [...variacao.linhas].sort((a, b) => {
    const x = a[ordem.coluna], y = b[ordem.coluna]
    const cmp = typeof x === "string" || typeof y === "string" ? String(x).localeCompare(String(y)) : (x ?? -Infinity) - (y ?? -Infinity)
    return ordem.desc ? -cmp : cmp
  })

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {variacao.aviso ? `${variacao.aviso} (comparado com ${variacao.rotuloBase}).` : variacao.rotuloBase ? `Comparado com ${variacao.rotuloBase}.` : "Sem comparativo: escolha um único mês."}
          </p>
        </div>
        <a href={urlExportar} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted">
          <Download className="size-3.5" /> Exportar Excel
        </a>
      </div>

      {variacao.linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                {COLUNAS.map((c) => (
                  <th key={c.id} className={`py-2 pr-3 font-medium ${c.alinhar === "right" ? "text-right" : "text-left"}`}>
                    <button type="button" onClick={() => ordenarPor(c.id)} className="inline-flex items-center gap-1 hover:text-foreground" aria-sort={ordem.coluna === c.id ? (ordem.desc ? "descending" : "ascending") : undefined}>
                      {c.id === "uf" ? rotuloDoGrupo : c.titulo} <ArrowUpDown className="size-3 opacity-60" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.uf} className="border-b">
                  {COLUNAS.map((c) => (
                    <td key={c.id} className={`py-2 pr-3 numero ${c.alinhar === "right" ? "text-right" : ""}`}><Celula coluna={c.id} linha={l} /></td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold" data-testid="linha-total">
                {COLUNAS.map((c) => (
                  <td key={c.id} className={`py-2 pr-3 numero ${c.alinhar === "right" ? "text-right" : ""}`}><Celula coluna={c.id} linha={variacao.total} /></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
