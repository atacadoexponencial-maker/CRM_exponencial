"use client"

// B36-04: os três blocos novos do Dashboard — funil de Entrada em barras, "Para hoje"
// (Agenda do dia e atrasados) e "Esperando resposta" (conversas sem resposta).

import { useState, useTransition } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatarHoraDoDia, formatarDataCurta } from "@/lib/datas"
import { textoDaEspera } from "@/lib/painel-dashboard"
import { marcarLembreteFeito } from "@/app/(auth)/agenda/actions"
import type { ConversaEsperando, EtapaComQuantidade, TarefaDeHoje } from "../actions"

function TituloDoBloco({ titulo, extra }: { titulo: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-3">
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {extra}
    </div>
  )
}

/**
 * B41-06: o gráfico abre no Funil de Entrada e, quando a empresa tem funis próprios,
 * ganha a escolha do funil. Cada funil mostra os cards por etapa, na ordem dele.
 */
export function BlocoFunilEntrada({
  etapas: etapasDaEntrada,
  outros = [],
}: {
  etapas: EtapaComQuantidade[]
  outros?: Array<{ id: string; nome: string; etapas: EtapaComQuantidade[] }>
}) {
  const [escolhido, setEscolhido] = useState("entrada")
  const outro = outros.find((f) => f.id === escolhido)
  const etapas = outro ? outro.etapas : etapasDaEntrada
  const titulo = outro ? outro.nome : "Funil de Entrada"
  const maior = Math.max(1, ...etapas.map((e) => e.quantidade))
  const vazio = etapas.every((e) => e.quantidade === 0)
  return (
    <section aria-label={titulo} className="flex flex-col">
      <TituloDoBloco
        titulo={titulo}
        extra={
          <span className="flex items-center gap-3">
            {outros.length > 0 && (
              <select
                aria-label="Funil do gráfico"
                value={escolhido}
                onChange={(e) => setEscolhido(e.target.value)}
                className="h-8 rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="entrada">Funil de Entrada</option>
                {outros.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            )}
            <Link href={outro ? `/pipeline/funil/${outro.id}` : "/pipeline"} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Abrir pipeline</Link>
          </span>
        }
      />
      {/* B46-13: funil sem nenhum card diz isso, em vez de mostrar barras zeradas */}
      {vazio ? (
        <p className="border-t py-4 text-sm text-muted-foreground">Nenhum card neste funil ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {etapas.map((e) => (
            <li key={e.id} data-etapa={e.id} className="grid grid-cols-[132px_minmax(0,1fr)_48px] items-center gap-3">
              <span className="truncate text-sm">{e.label}</span>
              <span className="h-[18px] rounded-[3px] bg-muted" aria-hidden="true">
                <span
                  data-largura={Math.round((e.quantidade / maior) * 100)}
                  className={cn("block h-full rounded-[3px]", !outro && e.id === "ganho" ? "bg-primary" : "bg-chart-5")}
                  style={{ width: `${(e.quantidade / maior) * 100}%` }}
                />
              </span>
              <span className="numero text-right text-sm" data-quantidade>{e.quantidade}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function horaDaTarefa(t: TarefaDeHoje): string {
  const hoje = new Date().toDateString() === new Date(t.dueAt).toDateString()
  if (t.atrasado && !hoje) return `Atrasada · ${formatarDataCurta(t.dueAt)} ${formatarHoraDoDia(t.dueAt)}`
  return `${t.atrasado ? "Atrasada · " : "Hoje · "}${formatarHoraDoDia(t.dueAt)}`
}

export function BlocoParaHoje({ tarefasIniciais }: { tarefasIniciais: TarefaDeHoje[] }) {
  const [tarefas, setTarefas] = useState(tarefasIniciais)
  const [erro, setErro] = useState("")
  const [, startTransition] = useTransition()
  const atrasadas = tarefas.filter((t) => t.atrasado).length

  function concluir(id: string) {
    const antes = tarefas
    setErro("")
    setTarefas((lista) => lista.filter((t) => t.id !== id))
    startTransition(async () => {
      const r = await marcarLembreteFeito(id)
      if (r.erro) {
        setTarefas(antes)
        setErro(r.erro)
      }
    })
  }

  return (
    <section aria-label="Para hoje" className="flex flex-col rounded-md border bg-card px-5 py-4">
      <TituloDoBloco
        titulo="Para hoje"
        extra={
          atrasadas > 0 ? (
            <span className="numero text-xs text-queda">{atrasadas === 1 ? "1 atrasada" : `${atrasadas} atrasadas`}</span>
          ) : (
            <Link href="/agenda" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Ver agenda</Link>
          )
        }
      />
      {erro && <p role="alert" className="pb-2 text-xs text-erro">{erro}</p>}
      {tarefas.length === 0 ? (
        <p className="border-t py-4 text-sm text-muted-foreground">Nada para hoje.</p>
      ) : (
        <ul className="flex flex-col">
          {tarefas.map((t) => (
            <li key={t.id} data-tarefa={t.id} className="flex items-start gap-3 border-t py-2.5">
              <input
                type="checkbox"
                aria-label={`Marcar como feita: ${t.contatoNome}`}
                onChange={() => concluir(t.id)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm">
                  <span className="font-medium">{t.contatoNome}</span>
                  {t.instrucao ? <span className="text-muted-foreground"> — {t.instrucao}</span> : null}
                </span>
                <span data-atrasada={t.atrasado || undefined} className={cn("numero text-xs", t.atrasado ? "text-queda" : "text-muted-foreground")}>
                  {horaDaTarefa(t)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function BlocoEsperandoResposta({ conversas, total }: { conversas: ConversaEsperando[]; total: number }) {
  return (
    <section aria-label="Esperando resposta" className="flex flex-col">
      <TituloDoBloco
        titulo="Esperando resposta"
        extra={
          <span className="flex items-baseline gap-3">
            {total > 0 && <span className="numero text-xs text-muted-foreground">{total >= 50 ? "50+" : total}</span>}
            <Link href="/chat" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Ir para o chat</Link>
          </span>
        }
      />
      {conversas.length === 0 ? (
        <p className="border-t py-4 text-sm text-muted-foreground">Ninguém esperando resposta.</p>
      ) : (
        <div className="overflow-x-auto">
          <ul className="min-w-[560px]">
            {conversas.map((c) => {
              const espera = textoDaEspera(c.minutosEsperando)
              const minutos = c.minutosEsperando
              return (
                <li key={c.conversaId}>
                  <Link
                    href={`/chat?conversa=${c.conversaId}`}
                    data-conversa={c.conversaId}
                    className="grid grid-cols-[180px_minmax(0,1fr)_92px_72px] items-center gap-4 border-t py-2.5 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm font-medium">{c.contatoNome}</span>
                    <span className="truncate text-sm text-muted-foreground">{c.trecho}</span>
                    <span>
                      {c.funil && (
                        <span className={cn("rounded px-2 py-0.5 text-xs", c.funil === "entrada" ? "bg-info-fundo text-info" : "bg-sucesso-fundo text-sucesso")}>
                          {c.funil === "entrada" ? "Entrada" : "Recompra"}
                        </span>
                      )}
                    </span>
                    <span data-espera className={cn("numero text-right text-xs", minutos >= 30 ? "text-queda" : "text-muted-foreground")}>{espera}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
