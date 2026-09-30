"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, Zap } from "lucide-react"
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
  execucoes7dias: number
  ultimaExecucao: string | null
}

interface ListaRegrasProps {
  regras: RegraListada[]
  opcoes: OpcoesEditor
  /** Enquanto o histórico não existe (B11-03), o item aparece desabilitado. */
  historicoDisponivel: boolean
  onNova: () => void
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Automações</h1>
        <Button onClick={onNova} size="sm">
          <Plus />
          Nova automação
        </Button>
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
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Execuções (7 dias)
                </th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                  Última execução
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ativa</th>
                <th className="px-2 py-3" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {regras.map((r) => (
                <tr key={r.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onEditar(r.id)} className="text-left">
                      <span className="block font-medium hover:underline">{r.nome}</span>
                      <span className="block text-muted-foreground">{resumoRegra(r.fluxo, opcoes)}</span>
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 tabular-nums sm:table-cell">{r.execucoes7dias}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {r.ultimaExecucao ? formatarHorarioDaLista(r.ultimaExecucao) : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.ativa}
                      aria-label={r.ativa ? `Pausar ${r.nome}` : `Ativar ${r.nome}`}
                      onClick={() => onAlternar(r.id, !r.ativa)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        r.ativa ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      title={r.ativa ? "Pausar" : "Ativar"}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          r.ativa ? "translate-x-[18px]" : "translate-x-0.5"
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
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setErroExcluir(null)
                            setExcluindo(r)
                          }}
                        >
                          Excluir
                        </DropdownMenuItem>
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
