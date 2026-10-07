"use client"

import { useState } from "react"
import { Receipt, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatarDataCurta, formatarHoraDoDia } from "@/lib/datas"
import { formatarPreco } from "./lista-produtos"
import { COR_SITUACAO, ROTULO_SITUACAO, type SituacaoPedido } from "./situacao-pedido"

export interface PedidoResumo {
  id: string
  numero: number
  criadoEm: string
  cliente: { nome: string; whatsapp: string }
  pecas: number
  total: number
  situacao: SituacaoPedido
}

type Periodo = "hoje" | "7" | "30" | "tudo"

export function SeloSituacao({ situacao }: { situacao: SituacaoPedido }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", COR_SITUACAO[situacao])}>
      {ROTULO_SITUACAO[situacao]}
    </span>
  )
}

export function formatarWhatsapp(digitos: string): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digitos)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos
}

interface ListaPedidosProps {
  /** Do mais novo para o mais antigo. */
  pedidos: PedidoResumo[]
  selecionadoId: string | null
  onSelecionar: (id: string) => void
  agora?: Date
}

export function ListaPedidos({ pedidos, selecionadoId, onSelecionar, agora = new Date() }: ListaPedidosProps) {
  const [situacao, setSituacao] = useState<SituacaoPedido | "todas">("todas")
  const [periodo, setPeriodo] = useState<Periodo>("30")
  const [busca, setBusca] = useState("")

  const termo = busca.trim().toLowerCase()
  const termoDigitos = termo.replace(/\D/g, "")
  const limite = periodo === "tudo" ? null : periodo === "hoje" ? 1 : Number(periodo)
  const filtrados = pedidos.filter((p) => {
    if (situacao !== "todas" && p.situacao !== situacao) return false
    if (limite !== null && agora.getTime() - new Date(p.criadoEm).getTime() > limite * 86_400_000) return false
    if (termo && !p.cliente.nome.toLowerCase().includes(termo) && !(termoDigitos && p.cliente.whatsapp.includes(termoDigitos))) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou WhatsApp" className="pl-8" aria-label="Buscar pedido por nome ou WhatsApp" />
        </div>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoPedido | "todas")} className="h-8 rounded-lg border border-input bg-input/30 px-2 text-sm" aria-label="Filtrar por situação">
          <option value="todas">Todas as situações</option>
          {(Object.keys(ROTULO_SITUACAO) as SituacaoPedido[]).map((s) => <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>)}
        </select>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="h-8 rounded-lg border border-input bg-input/30 px-2 text-sm" aria-label="Filtrar por período">
          <option value="hoje">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
          <Receipt className="size-7 opacity-40" />
          {pedidos.length === 0 ? "Nenhum pedido ainda. Eles chegam aqui quando uma cliente faz o pedido pela loja." : "Nenhum pedido com esses filtros."}
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden">
          {filtrados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelecionar(p.id)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 border-b last:border-0 text-left hover:bg-muted/30 transition-colors", selecionadoId === p.id && "bg-muted/50")}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    <span className="text-muted-foreground font-normal">#{p.numero}</span> {p.cliente.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataCurta(p.criadoEm)}, {formatarHoraDoDia(p.criadoEm)} · {formatarWhatsapp(p.cliente.whatsapp)}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-semibold">{formatarPreco(p.total)}</p>
                  <p className="text-xs text-muted-foreground">{p.pecas} peças</p>
                </div>
                <SeloSituacao situacao={p.situacao} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
