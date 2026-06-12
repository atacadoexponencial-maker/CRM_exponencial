"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AlarmClock, Bell, ListChecks, Loader2, MessageSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { listarAgendaEquipe, reatribuirLembrete } from "../actions"
import type { ItemAgenda, SequenciaEmAndamento } from "../actions"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

function formatarHorario(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function AgendaEquipeClient({
  itensIniciais,
  sequenciasIniciais,
  atendentes,
}: {
  itensIniciais: ItemAgenda[]
  sequenciasIniciais: SequenciaEmAndamento[]
  atendentes: Array<{ id: string; nome: string }>
}) {
  const [itens, setItens] = useState<ItemAgenda[]>(itensIniciais)
  const [sequencias, setSequencias] = useState<SequenciaEmAndamento[]>(sequenciasIniciais)
  const [filtroAtendente, setFiltroAtendente] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const agora = new Date()
  const atrasadosPorAtendente = new Map<string, number>()
  for (const item of itens) {
    if (new Date(item.dueAt) < agora && item.atendenteNome) {
      atrasadosPorAtendente.set(
        item.atendenteNome,
        (atrasadosPorAtendente.get(item.atendenteNome) ?? 0) + 1
      )
    }
  }

  function aplicarFiltro(atendenteId: string) {
    setFiltroAtendente(atendenteId)
    setErro(null)
    startTransition(async () => {
      const dados = await listarAgendaEquipe(atendenteId || null)
      if (dados) {
        setItens(dados.itens)
        setSequencias(dados.sequencias)
      }
    })
  }

  async function handleReatribuir(itemId: string, atendenteId: string) {
    setErro(null)
    const resultado = await reatribuirLembrete(itemId, atendenteId)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    const nome = atendentes.find((a) => a.id === atendenteId)?.nome
    setItens((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, atendenteId, atendenteNome: nome } : i))
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Agenda da Equipe</h1>
          {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Filtrar por atendente"
            className={selectClass}
            value={filtroAtendente}
            onChange={(e) => aplicarFiltro(e.target.value)}
          >
            <option value="">Todos os atendentes</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
          <Link
            href="/agenda"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Minha agenda
          </Link>
        </div>
      </div>

      {atrasadosPorAtendente.size > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from(atrasadosPorAtendente.entries()).map(([nome, qtd]) => (
            <span
              key={nome}
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium"
            >
              <AlarmClock className="size-3" />
              {nome}: {qtd} {qtd === 1 ? "atrasado" : "atrasados"}
            </span>
          ))}
        </div>
      )}

      {erro && <p className="text-sm text-destructive mb-4">{erro}</p>}

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-2">Lembretes e follow-ups pendentes ({itens.length})</h2>
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed py-8 text-center">
            Nenhum item pendente
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {itens.map((item) => {
              const atrasado = new Date(item.dueAt) < agora
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-3 flex items-start gap-3",
                    atrasado && "border-destructive/40 bg-destructive/5"
                  )}
                >
                  <span className="mt-0.5 shrink-0 text-muted-foreground">
                    {item.origem === "sequencia" ? <ListChecks className="size-4" /> : <Bell className="size-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.contatoNome}</span>
                      <span className="text-xs text-muted-foreground">{formatarHorario(item.dueAt)}</span>
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5">{item.atendenteNome}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.instrucao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.conversaId && (
                      <Link
                        href={`/chat?conversa=${item.conversaId}`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <MessageSquare className="size-3" />
                        Conversa
                      </Link>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 items-center rounded-md border px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        Reatribuir
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {atendentes
                          .filter((a) => a.id !== item.atendenteId)
                          .map((a) => (
                            <DropdownMenuItem key={a.id} onSelect={() => handleReatribuir(item.id, a.id)}>
                              {a.nome}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">Sequências em andamento ({sequencias.length})</h2>
        {sequencias.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed py-8 text-center">
            Nenhuma sequência em andamento
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sequência</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Atendente</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Etapa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Próxima etapa</th>
                </tr>
              </thead>
              <tbody>
                {sequencias.map((s) => (
                  <tr key={s.runId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.sequenciaNome}</td>
                    <td className="px-4 py-3">{s.contatoNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.atendenteNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.etapaAtual} de {s.totalEtapas}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.proximaExecucao
                        ? formatarHorario(s.proximaExecucao)
                        : "Aguardando lembrete ser concluído"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
