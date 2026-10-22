"use client"

// B39-02: botão "Exportar" da tela Pedidos. A pessoa escolhe entre os filtrados e todos
// (PER-B39-03) e o formato; o arquivo é gerado no servidor, pela rota de exportação.

import { useState } from "react"
import { Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { filtrosProntos, type FiltrosPedidos } from "@/lib/catalogo/filtros-pedidos"
import { urlDaExportacao, type EscopoExportacao, type FormatoExportacao } from "@/lib/catalogo/exportar-pedidos"

const FORMATOS: Array<{ formato: FormatoExportacao; rotulo: string; detalhe: string }> = [
  { formato: "xlsx", rotulo: "Excel", detalhe: "Abas Pedidos e Itens" },
  { formato: "csv-pedidos", rotulo: "CSV de pedidos", detalhe: "Uma linha por pedido" },
  { formato: "csv-itens", rotulo: "CSV de itens", detalhe: "Uma linha por produto" },
]

interface ExportarPedidosProps {
  filtros: FiltrosPedidos
  /** Quantos pedidos os filtros da tela trazem. */
  totalFiltrado: number
}

export function ExportarPedidos({ filtros, totalFiltrado }: ExportarPedidosProps) {
  const [aberto, setAberto] = useState(false)
  const [escopo, setEscopo] = useState<EscopoExportacao>("filtrados")
  const bloqueado = escopo === "filtrados" && !filtrosProntos(filtros)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-8 flex items-center gap-1.5 px-3 text-sm rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Download className="size-3.5" aria-hidden /> Exportar
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogPopup className="max-w-sm">
          <DialogTitle className="text-base">Exportar pedidos</DialogTitle>

          <fieldset className="mt-4 space-y-2">
            <legend className="mb-1 text-xs font-medium text-muted-foreground">Quais pedidos</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="escopo" checked={escopo === "filtrados"} onChange={() => setEscopo("filtrados")} />
              Só os filtrados (<span className="numero">{totalFiltrado}</span> {totalFiltrado === 1 ? "pedido" : "pedidos"})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="escopo" checked={escopo === "todos"} onChange={() => setEscopo("todos")} />
              Todos os pedidos
            </label>
          </fieldset>

          {bloqueado && <p className="mt-2 text-xs text-erro">Acerte o período personalizado para exportar os filtrados.</p>}

          <div className="mt-4 space-y-2">
            {FORMATOS.map((f) => (
              <a
                key={f.formato}
                href={bloqueado ? undefined : urlDaExportacao(f.formato, escopo, filtros)}
                download
                aria-disabled={bloqueado}
                onClick={(e) => { if (bloqueado) e.preventDefault(); else setAberto(false) }}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                  bloqueado ? "pointer-events-none opacity-50" : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{f.rotulo}</span>
                <span className="text-xs text-muted-foreground">{f.detalhe}</span>
              </a>
            ))}
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
