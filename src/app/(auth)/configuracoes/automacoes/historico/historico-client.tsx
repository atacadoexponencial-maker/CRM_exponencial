"use client"

// Histórico de execuções das automações (B11-03): o que cada regra fez, quando,
// para quem e se deu certo. O detalhe mostra o caminho bloco a bloco, a partir
// da cópia gravada na execução, então continua legível mesmo se a regra mudou ou
// foi excluída.

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, History, X } from "lucide-react"
import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import type { PassoGravado, ResultadoExecucao } from "@/lib/automacoes/execucoes"
import { formatarDataCurta, formatarHoraDoDia } from "@/lib/datas"
import { cn } from "@/lib/utils"
import type { ExecucaoListada, FiltrosDoHistorico } from "../actions"
import { CampoSelecao } from "../components/campo-selecao"
import type { OpcoesEditor } from "../components/catalogo"
import { fraseBloco, fraseDoEvento } from "../components/frases-fluxo"

const RESULTADO: Record<ResultadoExecucao, { rotulo: string; classe: string }> = {
  concluida: { rotulo: "Concluída", classe: "bg-emerald-500/15 text-emerald-300" },
  falhou: { rotulo: "Falhou", classe: "bg-rose-500/15 text-rose-300" },
  ignorada: { rotulo: "Ignorada", classe: "bg-muted text-muted-foreground" },
}

const quando = (iso: string) => `${formatarDataCurta(iso)}, ${formatarHoraDoDia(iso)}`

/** "2 de 3": ações que deram certo sobre as ações percorridas. */
function acoesFeitas(caminho: PassoGravado[]): string {
  const acoes = caminho.filter((p) => p.bloco.tipo === "acao")
  if (acoes.length === 0) return "—"
  return `${acoes.filter((p) => p.ok).length} de ${acoes.length}`
}

function SeloResultado({ resultado }: { resultado: ResultadoExecucao }) {
  const { rotulo, classe } = RESULTADO[resultado]
  return <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium", classe)}>{rotulo}</span>
}

interface HistoricoClientProps {
  execucoes: ExecucaoListada[]
  regras: Array<{ id: string; nome: string }>
  filtros: FiltrosDoHistorico
  opcoes: OpcoesEditor
}

export function HistoricoClient({ execucoes, regras, filtros, opcoes }: HistoricoClientProps) {
  const router = useRouter()
  const [aberta, setAberta] = useState<ExecucaoListada | null>(null)

  function filtrar(mudanca: Partial<Record<"regra" | "resultado" | "dias", string>>) {
    const atuais = { regra: filtros.regraId ?? "", resultado: filtros.resultado ?? "", dias: String(filtros.dias) }
    const params = new URLSearchParams()
    for (const [chave, valor] of Object.entries({ ...atuais, ...mudanca })) {
      if (valor && !(chave === "dias" && valor === "30")) params.set(chave, valor)
    }
    router.push(`/configuracoes/automacoes/historico${params.size ? `?${params}` : ""}`)
  }

  return (
    <>
      <Link
        href="/configuracoes/automacoes"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Automações
      </Link>
      <h1 className="text-xl font-semibold">Histórico das automações</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        O que cada automação fez, para quem e se deu certo. Clique numa linha para ver o caminho.
      </p>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <CampoSelecao
          aria-label="Filtrar por automação"
          valor={filtros.regraId ?? ""}
          vazio="Todas as automações"
          itens={regras.map((r) => ({ valor: r.id, rotulo: r.nome }))}
          onMudar={(regra) => filtrar({ regra })}
        />
        <CampoSelecao
          aria-label="Filtrar por resultado"
          valor={filtros.resultado ?? ""}
          vazio="Todos os resultados"
          itens={(Object.keys(RESULTADO) as ResultadoExecucao[]).map((r) => ({ valor: r, rotulo: RESULTADO[r].rotulo }))}
          onMudar={(resultado) => filtrar({ resultado })}
        />
        <CampoSelecao
          aria-label="Período"
          valor={String(filtros.dias)}
          itens={[
            { valor: "30", rotulo: "Últimos 30 dias" },
            { valor: "7", rotulo: "Últimos 7 dias" },
          ]}
          onMudar={(dias) => filtrar({ dias })}
        />
      </div>

      {execucoes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-12 text-center">
          <History className="size-8 text-muted-foreground/50" />
          <p className="font-medium">Nenhuma execução nos últimos {filtros.dias} dias</p>
          <p className="text-sm text-muted-foreground">
            Cada vez que um gatilho dispara uma automação, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Automação</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Contato</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Gatilho</th>
                <th className="px-4 py-3 font-medium">Resultado</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Ações</th>
              </tr>
            </thead>
            <tbody>
              {execucoes.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setAberta(e)}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{quando(e.quando)}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left font-medium hover:underline">
                      {e.regraNome}
                    </button>
                    {e.regraExcluida && <span className="ml-1.5 text-xs text-muted-foreground">(excluída)</span>}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{e.contato?.nome ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{fraseDoEvento(e.evento, opcoes)}</td>
                  <td className="px-4 py-3">
                    <SeloResultado resultado={e.resultado} />
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{acoesFeitas(e.caminho)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {execucoes.length >= 300 && (
        <p className="mt-2 text-xs text-muted-foreground">Mostrando as 300 mais recentes. Use os filtros para ver as outras.</p>
      )}

      <Dialog open={aberta !== null} onOpenChange={(open) => !open && setAberta(null)}>
        <DialogPopup className="max-h-[85dvh] max-w-lg overflow-y-auto">
          {aberta && <DetalheDaExecucao execucao={aberta} opcoes={opcoes} />}
        </DialogPopup>
      </Dialog>
    </>
  )
}

function DetalheDaExecucao({ execucao, opcoes }: { execucao: ExecucaoListada; opcoes: OpcoesEditor }) {
  return (
    <>
      <DialogTitle className="flex flex-wrap items-center gap-2">
        {execucao.regraNome}
        <SeloResultado resultado={execucao.resultado} />
      </DialogTitle>
      <DialogDescription className="mb-4">
        {quando(execucao.quando)} · {fraseDoEvento(execucao.evento, opcoes)}
      </DialogDescription>

      <p className="mb-3 text-sm">
        Contato:{" "}
        {execucao.contato ? (
          <Link href={`/contatos/${execucao.contato.id}`} className="font-medium underline-offset-2 hover:underline">
            {execucao.contato.nome}
          </Link>
        ) : (
          <span className="text-muted-foreground">sem contato (ou contato apagado)</span>
        )}
      </p>

      {execucao.motivo && (
        <p
          className={cn(
            "mb-3 rounded-lg px-3 py-2 text-sm",
            execucao.resultado === "ignorada" ? "bg-muted text-muted-foreground" : "bg-rose-500/10 text-rose-300"
          )}
        >
          {execucao.motivo}
        </p>
      )}

      {execucao.caminho.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {execucao.caminho.map((passo, i) => (
            <PassoDoCaminho key={`${passo.bloco.id}-${i}`} passo={passo} opcoes={opcoes} />
          ))}
        </ol>
      )}
    </>
  )
}

const TIPO_DO_BLOCO = { gatilho: "Gatilho", condicao: "Condição", acao: "Ação" } as const

function PassoDoCaminho({ passo, opcoes }: { passo: PassoGravado; opcoes: OpcoesEditor }) {
  const falhou = passo.ok === false
  return (
    <li className={cn("rounded-lg border px-3 py-2", falhou && "border-rose-500/40 bg-rose-500/5")}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-16 shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {TIPO_DO_BLOCO[passo.bloco.tipo]}
        </span>
        <span className="flex-1 text-sm">{fraseBloco(passo.bloco, opcoes)}</span>
        {passo.saida && (
          <span
            className={cn(
              "shrink-0 rounded px-1.5 text-xs font-medium",
              passo.saida === "sim" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
            )}
          >
            {passo.saida === "sim" ? "sim" : "não"}
          </span>
        )}
        {passo.bloco.tipo === "acao" &&
          (falhou ? (
            <X className="size-4 shrink-0 text-rose-400" aria-label="Falhou" />
          ) : (
            <Check className="size-4 shrink-0 text-emerald-400" aria-label="Feita" />
          ))}
      </div>
      {passo.motivo && <p className="mt-1 pl-[4.5rem] text-xs text-rose-300">{passo.motivo}</p>}
    </li>
  )
}
