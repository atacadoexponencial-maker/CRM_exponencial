"use client"

// B33-03: evolução dos perfis (semanal ou mensal, mais recente primeiro) e a base saudável.

import { useState } from "react"
import { cn } from "@/lib/utils"
import { formatarDataBr } from "@/lib/relatorios/visao-geral"
import { PERFIL_POR_ID, PERFIS, type EvolucaoRfv, type PerfilRfv } from "@/lib/relatorios/rfv"

type Modo = "semanal" | "mensal"

function Delta({ valor, percentual }: { valor: number; percentual: number | null }) {
  const cor = valor > 0 ? "text-sucesso" : valor < 0 ? "text-erro" : "text-muted-foreground"
  const sinal = valor > 0 ? "+" : valor < 0 ? "−" : ""
  const pct = percentual === null ? (valor === 0 ? "0%" : "—") : `${sinal}${Math.abs(percentual)}%`
  return <span className={cn("text-[11px]", cor)}>{sinal}{Math.abs(valor)} ({pct})</span>
}

export function EvolucaoPerfis({ evolucao }: { evolucao: EvolucaoRfv }) {
  const [modo, setModo] = useState<Modo>("semanal")
  const colunas = evolucao[modo]
  const atual = colunas[0], anterior = colunas[1]
  const crescimento = atual && anterior ? atual.saudavel - anterior.saudavel : null
  const variacao = atual && anterior && anterior.saudavel > 0 && crescimento !== null ? Math.round((crescimento / anterior.saudavel) * 100) : null

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">Evolução dos perfis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {modo === "semanal" ? "Últimas 14 semanas, mais recente primeiro, cada uma contra a anterior" : "Últimos 13 meses, mais recente primeiro, cada um contra o anterior"}
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Modo">
          {(["semanal", "mensal"] as Modo[]).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)} className={cn("h-8 rounded-lg border px-3 text-sm", modo === m ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:bg-muted")}>
              {m === "semanal" ? "Semanal" : "Mensal"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm" data-testid={`evolucao-${modo}`}>
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="py-2 pr-4 font-medium text-left sticky left-0 bg-background">Perfil</th>
              {colunas.map((c) => (
                <th key={c.referencia} className="py-2 px-2 font-medium text-right whitespace-nowrap" title={`Perfis em ${formatarDataBr(c.referencia)}`}>
                  <div>{c.rotulo}</div>
                  <div className="font-normal">{c.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERFIS.map((p) => (
              <tr key={p.id} className="border-b last:border-0" data-testid={`evolucao-${p.id}`}>
                <td className="py-2 pr-4 whitespace-nowrap sticky left-0 bg-background">
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white" style={{ backgroundColor: p.cor }}>{p.icone} {p.nome}</span>
                </td>
                {colunas.map((c, i) => {
                  const n = c.porPerfil[p.id as PerfilRfv]
                  const base = colunas[i + 1]?.porPerfil[p.id as PerfilRfv]
                  return (
                    <td key={c.referencia} className="py-2 px-2 text-right tabular-nums align-top" title={`Perfis em ${formatarDataBr(c.referencia)}`}>
                      <div className="font-medium">{n}</div>
                      {base !== undefined && <Delta valor={n - base} percentual={base > 0 ? Math.round(((n - base) / base) * 100) : null} />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold mb-2">
          Base saudável <span className="font-normal text-muted-foreground text-xs">({PERFIS.filter((p) => p.saudavel).map((p) => `${p.icone} ${p.nome}`).join(", ")})</span>
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="base-saudavel">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{atual?.rotulo ?? "—"}</p><p className="text-lg font-semibold">{atual?.saudavel ?? "—"} <span className="text-sm font-normal text-muted-foreground">clientes</span></p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{anterior?.rotulo ?? "—"}</p><p className="text-lg font-semibold">{anterior?.saudavel ?? "—"} <span className="text-sm font-normal text-muted-foreground">clientes</span></p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Crescimento</p><p className={cn("text-lg font-semibold", crescimento === null ? "" : crescimento > 0 ? "text-sucesso" : crescimento < 0 ? "text-erro" : "")}>{crescimento === null ? "—" : `${crescimento > 0 ? "+" : crescimento < 0 ? "−" : ""}${Math.abs(crescimento)}`}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Variação</p><p className={cn("text-lg font-semibold", variacao === null ? "" : variacao > 0 ? "text-sucesso" : variacao < 0 ? "text-erro" : "")}>{variacao === null ? "—" : `${variacao > 0 ? "+" : variacao < 0 ? "−" : ""}${Math.abs(variacao)}%`}</p></div>
        </div>
      </div>
      <p className="sr-only">{PERFIL_POR_ID.campeao.nome}</p>
    </section>
  )
}
