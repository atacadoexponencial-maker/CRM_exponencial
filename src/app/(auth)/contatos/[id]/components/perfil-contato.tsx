"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageSquare, ArrowLeft, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  type ContatoPerfil,
  CLASSIFICACAO_LABEL,
  TIPO_LABEL,
  ICP_LABEL,
} from "../../mock-contatos"
import { TimelineContato } from "./timeline-contato"

const CLASSIFICACAO_BADGE: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  ativo: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  em_risco: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  inativo: "bg-secondary text-muted-foreground border-border",
  perdido: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  sem_historico: "bg-secondary text-muted-foreground border-border",
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type Aba = "dados" | "timeline"

interface PerfilContatoProps {
  contato: ContatoPerfil | null
  papel: string
}

export function PerfilContato({ contato, papel }: PerfilContatoProps) {
  const [aba, setAba] = useState<Aba>("dados")

  if (!contato) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-16 text-center text-muted-foreground">
        Contato não encontrado.
      </div>
    )
  }

  const totalCompras = contato.compras.reduce((acc, c) => acc + c.valor, 0)
  const ticketMedio = contato.compras.length > 0 ? totalCompras / contato.compras.length : 0

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      {/* Voltar */}
      <Link
        href="/contatos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Contatos
      </Link>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{contato.nome}</h1>
          <p className="text-sm text-muted-foreground">{contato.telefone}</p>
          <span className={cn(
            "inline-flex items-center self-start px-2 py-0.5 text-xs rounded-md border font-medium mt-1",
            CLASSIFICACAO_BADGE[contato.classificacao]
          )}>
            {CLASSIFICACAO_LABEL[contato.classificacao]}
          </span>
        </div>
        <Button size="sm" variant="outline">
          <MessageSquare className="size-3.5" />
          Abrir conversa
        </Button>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 self-start w-fit">
        <button
          onClick={() => setAba("dados")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-colors",
            aba === "dados"
              ? "bg-background text-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dados
        </button>
        <button
          onClick={() => setAba("timeline")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-colors",
            aba === "timeline"
              ? "bg-background text-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Timeline
        </button>
      </div>

      {/* Conteúdo da aba */}
      {aba === "timeline" ? (
        <TimelineContato eventos={contato.timeline} />
      ) : (
        <div className="space-y-6">
          {/* Dados do contato */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do contato</h2>
            <div className="rounded-lg border divide-y text-sm">
              <Row label="Nome" value={contato.nome} />
              <Row label="WhatsApp" value={contato.telefone} />
              <Row label="Tipo" value={contato.tipo ? TIPO_LABEL[contato.tipo] : "—"} />
              <Row label="Nicho" value={contato.nicho ?? "—"} />
              <Row label="Cidade" value={contato.cidade ?? "—"} />
              <Row label="ICP" value={contato.icp ? ICP_LABEL[contato.icp] : "—"} />
            </div>
          </section>

          {/* Tags */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h2>
            {contato.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {contato.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs rounded-md bg-secondary text-muted-foreground border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h2>
            {contato.observacoes ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">{contato.observacoes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem observações</p>
            )}
          </section>

          {/* Pipeline */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline</h2>
            {contato.cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem card no pipeline</p>
            ) : (
              <div className="flex flex-col gap-2">
                {contato.cards.map((card, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Funil de {card.funil === "expansao" ? "Expansão" : "Retenção"}:
                    </span>
                    <span className="font-medium">{card.etapaLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Histórico de compras */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico de compras</h2>
              {papel !== "atendente" && (
                <Button size="sm" variant="outline">
                  <ShoppingBag className="size-3.5" />
                  Registrar compra
                </Button>
              )}
            </div>

            {contato.compras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma compra registrada</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contato.compras.map((compra) => (
                      <tr key={compra.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground">{compra.data}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatarMoeda(compra.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-6 text-sm pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{formatarMoeda(totalCompras)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Ticket médio:</span>
                <span className="font-semibold">{formatarMoeda(ticketMedio)}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
