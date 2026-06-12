"use client"

import type { PeriodoKey } from "../actions"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const PERIODOS: Array<{ id: PeriodoKey; label: string }> = [
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "mes", label: "Este mês" },
  { id: "trimestre", label: "Este trimestre" },
  { id: "custom", label: "Personalizado" },
]

export interface FiltrosState {
  periodo: PeriodoKey
  inicio: string
  fim: string
  atendenteId: string
}

interface FiltrosDashboardProps {
  filtros: FiltrosState
  onChange: (filtros: FiltrosState) => void
  atendentes?: Array<{ id: string; nome: string }>
  mostrarAtendente: boolean
}

export function FiltrosDashboard({ filtros, onChange, atendentes = [], mostrarAtendente }: FiltrosDashboardProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Período"
        className={selectClass}
        value={filtros.periodo}
        onChange={(e) => onChange({ ...filtros, periodo: e.target.value as PeriodoKey })}
      >
        {PERIODOS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      {filtros.periodo === "custom" && (
        <>
          <input
            type="date"
            aria-label="Data inicial"
            className={selectClass}
            value={filtros.inicio}
            onChange={(e) => onChange({ ...filtros, inicio: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            aria-label="Data final"
            className={selectClass}
            value={filtros.fim}
            onChange={(e) => onChange({ ...filtros, fim: e.target.value })}
          />
        </>
      )}

      {mostrarAtendente && (
        <select
          aria-label="Atendente"
          className={selectClass}
          value={filtros.atendenteId}
          onChange={(e) => onChange({ ...filtros, atendenteId: e.target.value })}
        >
          <option value="">Todos os atendentes</option>
          {atendentes.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      )}
    </div>
  )
}
