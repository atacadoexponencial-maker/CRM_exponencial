"use client"

import { useState } from "react"
import { Clock, History, MoreHorizontal, Plus, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatarHorarioDaLista } from "@/lib/datas"
import type { Fluxo } from "@/lib/fluxo-automacao"
import { cn } from "@/lib/utils"
import type { OpcoesEditor } from "./catalogo"
import { resumoRegra } from "./frases-fluxo"

export interface RegraListada {
  id: string
  nome: string
  ativa: boolean
  fluxo: Fluxo
  /**
   * Regra da primeira versão (tabela `automations`), que a produção ainda usa.
   * Continua rodando; pausar e excluir não são oferecidos aqui (B11-10).
   */
  versaoAntiga?: boolean
  /** Versão em fluxo de uma regra antiga: excluí-la faz a antiga voltar a valer. */
  substituiAntiga?: boolean
  execucoes7dias: number
  ultimaExecucao: string | null
}

interface ListaRegrasProps {
  regras: RegraListada[]
  opcoes: OpcoesEditor
  /** Enquanto o histórico não existe (B11-03), as colunas de execução somem e o item do menu fica desabilitado. */
  historicoDisponivel: boolean
  onNova: () => void
  /** Botão "Histórico" no topo, com as execuções de todas as regras. */
  onAbrirHistorico?: () => void
  /** Botão "Horário comercial" no topo, que a condição de horário usa (B11-08). */
  onAbrirHorario?: () => void
  onEditar: (id: string) => void
  onAlternar: (id: string, ativa: boolean) => void
  onDuplicar: (id: string) => void
  onVerHistorico: (id: string) => void
  onExcluir: (id: string) => Promise<{ erro?: string }>
}

const EXEMPLOS = [
  { titulo: "Boas-vindas", texto: "Quando uma conversa for criada → enviar mensagem de boas-vindas" },
  {
    titulo: "Pedido de catálogo",
    texto: "Quando o cliente escrever \"catálogo\" → aplicar a etiqueta Interessado e enviar o PDF",
  },
  {
    titulo: "Fora do horário",
    texto: "Quando o cliente enviar mensagem fora do horário comercial → avisar quando o time volta",
  },
]

export function ListaRegras({
  regras,
  opcoes,
  historicoDisponivel,
  onNova,
  onAbrirHistorico,
  onAbrirHorario,
  onEditar,
  onAlternar,
  onDuplicar,
  onVerHistorico,
  onExcluir,
}: ListaRegrasProps) {
  const [excluindo, setExcluindo] = useState<RegraListada | null>(null)
  const [aguardando, setAguardando] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  async function confirmarExclusao() {
    if (!excluindo) return
    setAguardando(true)
    setErroExcluir(null)
    const resultado = await onExcluir(excluindo.id)
    setAguardando(false)
    if (resultado.erro) {
      setErroExcluir(resultado.erro)
      return
    }
    setExcluindo(null)
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Automações</h1>
        <div className="flex flex-wrap gap-2">
          {onAbrirHorario && (
            <Button onClick={onAbrirHorario} size="sm" variant="outline">
              <Clock />
              Horário comercial
            </Button>
          )}
          {historicoDisponivel && onAbrirHistorico && (
            <Button onClick={onAbrirHistorico} size="sm" variant="outline">
              <History />
              Histórico
            </Button>
          )}
          <Button onClick={onNova} size="sm">
            <Plus />
            Nova automação
          </Button>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Cada automação começa num gatilho e segue por condições e ações que você liga como quiser.
      </p>

      {regras.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-4 py-12 text-center">
          <Zap className="size-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Nenhuma automação ainda</p>
            <p className="text-sm text-muted-foreground">
              Automações respondem, organizam e distribuem as conversas sozinhas. Alguns exemplos comuns:
            </p>
          </div>
          <ul className="grid w-full max-w-2xl gap-2 text-left sm:grid-cols-3">
            {EXEMPLOS.map((e) => (
              <li key={e.titulo} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">{e.titulo}</p>
                <p className="text-xs text-muted-foreground">{e.texto}</p>
              </li>
            ))}
          </ul>
          <Button onClick={onNova}>
            <Plus />
            Criar a primeira automação
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Automação</th>
                {historicoDisponivel && (
                  <>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                      Execuções (7 dias)
                    </th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                      Última execução
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ativa</th>
                <th className="px-2 py-3" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onEditar(r.id)} className="text-left">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium hover:underline">{r.nome}</span>
                        {r.versaoAntiga && (
                          <Badge variant="outline" title="Abra e salve para trocar pela versão em fluxo">
                            Versão antiga · continua rodando
                          </Badge>
                        )}
                      </span>
                      <span className="block text-muted-foreground">{resumoRegra(r.fluxo, opcoes)}</span>
                    </button>
                  </td>
                  {historicoDisponivel && (
                    <>
                      <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{r.execucoes7dias}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {r.ultimaExecucao ? formatarHorarioDaLista(r.ultimaExecucao) : "Nunca"}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.ativa}
                      aria-label={r.ativa ? `Pausar ${r.nome}` : `Ativar ${r.nome}`}
                      onClick={() => onAlternar(r.id, !r.ativa)}
                      disabled={r.versaoAntiga}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        r.ativa ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      title={
                        r.versaoAntiga
                          ? "Versão antiga: para pausar, abra e salve a versão em fluxo"
                          : r.ativa
                            ? "Pausar"
                            : "Ativar"
                      }
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full transition-transform",
                          // No tema escuro o primary é branco: a bolinha ligada usa a cor de texto dele
                          r.ativa ? "translate-x-[18px] bg-primary-foreground" : "translate-x-0.5 bg-white"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu de {r.nome}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditar(r.id)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicar(r.id)}>Duplicar</DropdownMenuItem>
                        <DropdownMenuItem disabled={!historicoDisponivel} onClick={() => onVerHistorico(r.id)}>
                          Ver histórico{historicoDisponivel ? "" : " (em breve)"}
                        </DropdownMenuItem>
                        {!r.versaoAntiga && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setErroExcluir(null)
                              setExcluindo(r)
                            }}
                          >
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={excluindo !== null} onOpenChange={(open) => !open && setExcluindo(null)}>
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir automação</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Excluir <strong>{excluindo?.nome}</strong>? A regra para de rodar. O histórico do que ela já fez
              continua disponível.
            </p>
            {excluindo?.substituiAntiga && (
              <p className="text-sm text-muted-foreground">
                Esta é a versão nova de uma regra antiga. Excluída, a versão antiga volta a rodar no lugar dela.
              </p>
            )}
            {erroExcluir && <p className="text-sm text-destructive">{erroExcluir}</p>}
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button variant="destructive" onClick={confirmarExclusao} disabled={aguardando}>
                Excluir
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
