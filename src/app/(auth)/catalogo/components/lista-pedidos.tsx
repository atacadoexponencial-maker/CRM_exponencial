"use client"

import { Loader2, Receipt } from "lucide-react"
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
  /** Valor que a cliente paga (já com o desconto do pedido, B31-02). */
  total: number
  /** B31-02: desconto por total do pedido, quando valeu (a lista do contato não carrega). */
  desconto?: { percent: number; valor: number } | null
  situacao: SituacaoPedido
}

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
  /** Do mais novo para o mais antigo, já filtrados pelo servidor (B39-01). */
  pedidos: PedidoResumo[]
  /** B39-01: total do resultado no servidor, além dos já carregados. */
  total: number
  /** Algum filtro diferente do padrão: muda a mensagem da lista vazia. */
  comFiltros: boolean
  selecionadoId: string | null
  onSelecionar: (id: string) => void
  onCarregarMais?: () => void
  carregandoMais?: boolean
}

export function ListaPedidos({
  pedidos,
  total,
  comFiltros,
  selecionadoId,
  onSelecionar,
  onCarregarMais,
  carregandoMais = false,
}: ListaPedidosProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        <span className="numero">{total}</span> {total === 1 ? "pedido" : "pedidos"}
      </p>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-card/60 py-14 text-center text-sm text-muted-foreground">
          <Receipt className="size-7 opacity-40" />
          {comFiltros ? "Nenhum pedido com esses filtros." : "Nenhum pedido ainda. Eles chegam aqui quando uma cliente faz o pedido pela loja."}
        </div>
      ) : (
        <ul className="overflow-x-auto border-t-2 border-t-foreground">
          {pedidos.map((p) => (
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

      {onCarregarMais && pedidos.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCarregarMais}
            disabled={carregandoMais}
            className="h-8 flex items-center gap-2 px-4 text-sm rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {carregandoMais && <Loader2 className="size-3.5 animate-spin" />}
            {carregandoMais ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  )
}
