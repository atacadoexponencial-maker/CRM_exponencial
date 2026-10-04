"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ImageOff, MessageSquare, User, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { formatarDataCurta, formatarHoraDoDia } from "@/lib/datas"
import { formatarPreco } from "./lista-produtos"
import { SeloSituacao, formatarWhatsapp, type PedidoResumo } from "./lista-pedidos"
import { PROXIMAS_SITUACOES, ROTULO_SITUACAO, type SituacaoPedido } from "./situacao-pedido"

export interface ItemPedidoDetalhe {
  nome: string
  variacao: string
  quantidade: number
  precoUnitario: number
  fotoUrl: string | null
  /** Estoque atual da combinação; `null` quando o produto foi excluído. */
  estoqueAtual: number | null
}

export interface MudancaSituacao {
  de: SituacaoPedido | null
  para: SituacaoPedido
  por: string
  em: string
}

export interface PedidoDetalhe extends PedidoResumo {
  itens: ItemPedidoDetalhe[]
  historico: MudancaSituacao[]
  hrefContato: string | null
  hrefConversa: string | null
}

function rotuloBotao(de: SituacaoPedido, para: SituacaoPedido): string {
  if (para === "em_atendimento" && de === "fechado") return "Voltar para Em atendimento"
  return ROTULO_BOTAO[para]
}

const ROTULO_BOTAO: Record<SituacaoPedido, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  fechado: "Marcar como Fechado",
  cancelado: "Cancelar pedido",
}

interface DetalhePedidoProps {
  pedido: PedidoDetalhe
  onFechar: () => void
  /** Devolve `erro` para mostrar. */
  onMudarSituacao: (para: SituacaoPedido) => Promise<{ erro?: string }>
}

export function DetalhePedido({ pedido, onFechar, onMudarSituacao }: DetalhePedidoProps) {
  const [confirmar, setConfirmar] = useState<SituacaoPedido | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [mudando, setMudando] = useState(false)

  const faltando = pedido.itens.filter((i) => i.estoqueAtual !== null && i.quantidade > i.estoqueAtual)

  function pedir(para: SituacaoPedido) {
    setErro(null)
    if (para === "fechado" && faltando.length > 0) return setConfirmar("fechado")
    if (para === "cancelado") return setConfirmar("cancelado")
    mudar(para)
  }

  async function mudar(para: SituacaoPedido) {
    setConfirmar(null)
    setMudando(true)
    const r = await onMudarSituacao(para)
    setMudando(false)
    if (r.erro) setErro(r.erro)
  }

  return (
    <aside className="rounded-lg border bg-card overflow-hidden flex flex-col">
      <header className="flex items-start justify-between gap-2 px-4 py-3 border-b">
        <div>
          <h2 className="text-base font-semibold">Pedido #{pedido.numero}</h2>
          <p className="text-xs text-muted-foreground">{formatarDataCurta(pedido.criadoEm)}, {formatarHoraDoDia(pedido.criadoEm)}</p>
        </div>
        <div className="flex items-center gap-2">
          <SeloSituacao situacao={pedido.situacao} />
          <Button size="icon-sm" variant="ghost" onClick={onFechar} aria-label="Fechar pedido"><X /></Button>
        </div>
      </header>

      <div className="p-4 space-y-5 overflow-y-auto">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
          <p className="text-sm font-medium">{pedido.cliente.nome}</p>
          <p className="text-sm text-muted-foreground">{formatarWhatsapp(pedido.cliente.whatsapp)}</p>
          <div className="flex flex-wrap gap-2">
            {pedido.hrefContato && <Link href={pedido.hrefContato} data-slot="button" className={buttonVariants({ size: "sm", variant: "outline" })}><User className="size-3.5" />Perfil do contato</Link>}
            {pedido.hrefConversa && <Link href={pedido.hrefConversa} data-slot="button" className={buttonVariants({ size: "sm", variant: "outline" })}><MessageSquare className="size-3.5" />Abrir conversa</Link>}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens</h3>
          <ul className="divide-y rounded-lg border">
            {pedido.itens.map((i, n) => (
              <li key={n} className="flex items-center gap-3 p-2.5">
                <div className="size-11 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {i.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.fotoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff className="size-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{i.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.variacao ? `${i.variacao} · ` : ""}{i.quantidade} × {formatarPreco(i.precoUnitario)}
                    {i.estoqueAtual === null && " · produto excluído"}
                  </p>
                </div>
                <span className="text-sm font-medium">{formatarPreco(i.quantidade * i.precoUnitario)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{pedido.pecas} peças</span>
            <span className="font-semibold">{formatarPreco(pedido.total)}</span>
          </div>
        </section>

        {PROXIMAS_SITUACOES[pedido.situacao].length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situação</h3>
            <div className="flex flex-wrap gap-2">
              {PROXIMAS_SITUACOES[pedido.situacao].map((s) => (
                <Button key={s} size="sm" variant={s === "cancelado" ? "destructive" : s === "fechado" ? "default" : "outline"} className={s === "cancelado" ? "text-red-400" : undefined} onClick={() => pedir(s)} disabled={mudando}>
                  {rotuloBotao(pedido.situacao, s)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {pedido.situacao === "fechado"
                ? "O estoque deste pedido já foi baixado. Voltar para Em atendimento ou cancelar devolve as peças ao estoque."
                : "Ao marcar como Fechado, o estoque das peças do pedido baixa."}
            </p>
            {erro && <p className="text-xs text-destructive" role="alert">{erro}</p>}
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h3>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            {pedido.historico.map((h, n) => (
              <li key={n}>
                <span className="text-foreground">{h.de ? `${ROTULO_SITUACAO[h.de]} → ${ROTULO_SITUACAO[h.para]}` : "Pedido recebido pela loja"}</span>
                {" · "}{h.por} · {formatarDataCurta(h.em)}, {formatarHoraDoDia(h.em)}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Dialog open={confirmar !== null} onOpenChange={(aberto) => { if (!aberto) setConfirmar(null) }}>
        <DialogPopup className="max-w-md">
          {confirmar === "fechado" ? (
            <>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-400" />Estoque insuficiente</DialogTitle>
              <DialogDescription className="mt-2">Estas peças têm menos estoque do que o pedido. Ao fechar, o estoque delas vai a zero.</DialogDescription>
              <ul className="mt-3 space-y-1 text-sm">
                {faltando.map((i, n) => (
                  <li key={n}>{i.nome}{i.variacao ? ` (${i.variacao})` : ""}: pedido {i.quantidade}, estoque {i.estoqueAtual}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <DialogTitle>Cancelar o pedido #{pedido.numero}?</DialogTitle>
              <DialogDescription className="mt-2">
                {pedido.situacao === "fechado"
                  ? "As peças baixadas do estoque quando o pedido foi fechado voltam para o estoque."
                  : "O pedido fica cancelado e não pode mais mudar de situação."}
              </DialogDescription>
            </>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Voltar</DialogClose>
            <Button size="sm" variant={confirmar === "cancelado" ? "destructive" : "default"} className={confirmar === "cancelado" ? "text-red-400" : undefined} onClick={() => confirmar && mudar(confirmar)}>
              {confirmar === "fechado" ? "Fechar mesmo assim" : "Cancelar pedido"}
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </aside>
  )
}
