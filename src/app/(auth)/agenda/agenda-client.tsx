"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlarmClock, Bell, Check, ListChecks, MessageSquare, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  adiarLembrete,
  buscarContatosParaFollowUp,
  criarFollowUp,
  marcarLembreteFeito,
} from "./actions"
import type { ItemAgenda } from "./actions"

type Grupo = "atrasados" | "hoje" | "amanha" | "semana" | "depois"

const GRUPO_LABEL: Record<Grupo, string> = {
  atrasados: "Atrasados",
  hoje: "Hoje",
  amanha: "Amanhã",
  semana: "Esta semana",
  depois: "Mais tarde",
}

function grupoDoItem(item: ItemAgenda): Grupo {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const due = new Date(item.dueAt)
  const dueDia = new Date(due)
  dueDia.setHours(0, 0, 0, 0)

  const diffDias = Math.round((dueDia.getTime() - hoje.getTime()) / 86400000)
  if (diffDias < 0) return "atrasados"
  if (diffDias === 0) return "hoje"
  if (diffDias === 1) return "amanha"
  if (diffDias <= 7) return "semana"
  return "depois"
}

function formatarHorario(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function AgendaClient({ itensIniciais, papel }: { itensIniciais: ItemAgenda[]; papel: string }) {
  const router = useRouter()
  const [itens, setItens] = useState<ItemAgenda[]>(itensIniciais)
  const [erro, setErro] = useState<string | null>(null)

  // Novo follow-up
  const [dialogAberto, setDialogAberto] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")
  const [resultados, setResultados] = useState<Array<{ id: string; nome: string }>>([])
  const [contatoSel, setContatoSel] = useState<{ id: string; nome: string } | null>(null)
  const [dataFU, setDataFU] = useState("")
  const [horaFU, setHoraFU] = useState("")
  const [notaFU, setNotaFU] = useState("")
  const [salvandoFU, setSalvandoFU] = useState(false)
  const [erroFU, setErroFU] = useState<string | null>(null)

  const atrasados = itens.filter((i) => grupoDoItem(i) === "atrasados").length

  async function handleFeito(id: string) {
    const anterior = itens
    setItens((prev) => prev.filter((i) => i.id !== id))
    const resultado = await marcarLembreteFeito(id)
    if (resultado.erro) {
      setItens(anterior)
      setErro(resultado.erro)
    }
  }

  async function handleAdiar(id: string, dias: number) {
    setErro(null)
    const resultado = await adiarLembrete(id, dias)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const nova = new Date()
        nova.setDate(nova.getDate() + dias)
        return { ...i, dueAt: nova.toISOString(), atrasado: false }
      })
    )
  }

  async function handleBuscarContato(termo: string) {
    setTermoBusca(termo)
    setContatoSel(null)
    const lista = await buscarContatosParaFollowUp(termo)
    setResultados(lista)
  }

  function abrirNovoFollowUp() {
    setTermoBusca("")
    setResultados([])
    setContatoSel(null)
    setDataFU("")
    setHoraFU("")
    setNotaFU("")
    setErroFU(null)
    setDialogAberto(true)
    void buscarContatosParaFollowUp("").then(setResultados)
  }

  async function handleCriarFollowUp() {
    if (!contatoSel) {
      setErroFU("Escolha o contato")
      return
    }
    setSalvandoFU(true)
    setErroFU(null)
    const resultado = await criarFollowUp({
      contactId: contatoSel.id,
      data: dataFU,
      hora: horaFU || undefined,
      nota: notaFU,
    })
    setSalvandoFU(false)
    if (resultado.erro) {
      setErroFU(resultado.erro)
      return
    }
    setDialogAberto(false)
    router.refresh()
  }

  const grupos: Grupo[] = ["atrasados", "hoje", "amanha", "semana", "depois"]

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Minha Agenda</h1>
          {atrasados > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
              <AlarmClock className="size-3" />
              {atrasados} {atrasados === 1 ? "atrasado" : "atrasados"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {["admin", "gerente"].includes(papel) && (
            <Link
              href="/agenda/equipe"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Agenda da equipe →
            </Link>
          )}
          <Button size="sm" onClick={abrirNovoFollowUp}>
            <Plus className="size-4 mr-1.5" />
            Novo follow-up
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Lembretes das sequências e follow-ups que você agendou.
      </p>

      {erro && <p className="text-sm text-destructive mb-4">{erro}</p>}

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Check className="size-8 opacity-40" />
          <p className="text-sm">Tudo em dia! Nenhum lembrete pendente.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => {
            const doGrupo = itens.filter((i) => grupoDoItem(i) === grupo)
            if (doGrupo.length === 0) return null
            return (
              <section key={grupo}>
                <h2
                  className={cn(
                    "text-sm font-semibold mb-2",
                    grupo === "atrasados" && "text-destructive"
                  )}
                >
                  {GRUPO_LABEL[grupo]} ({doGrupo.length})
                </h2>
                <div className="flex flex-col gap-2">
                  {doGrupo.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border p-3 flex items-start gap-3",
                        grupo === "atrasados" && "border-destructive/40 bg-destructive/5"
                      )}
                    >
                      <span
                        className="mt-0.5 shrink-0 text-muted-foreground"
                        title={item.origem === "sequencia" ? "Lembrete de sequência" : "Follow-up avulso"}
                      >
                        {item.origem === "sequencia" ? (
                          <ListChecks className="size-4" />
                        ) : (
                          <Bell className="size-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{item.contatoNome}</span>
                          <span className="text-xs text-muted-foreground">{formatarHorario(item.dueAt)}</span>
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
                            Adiar
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleAdiar(item.id, 1)}>1 dia</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAdiar(item.id, 3)}>3 dias</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAdiar(item.id, 7)}>1 semana</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleFeito(item.id)}>
                          <Check className="size-3 mr-1" />
                          Feito
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Dialog — Novo follow-up */}
      <Dialog
        open={dialogAberto}
        onOpenChange={(open) => {
          if (!open) setErroFU(null)
          setDialogAberto(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Novo follow-up</DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fu-contato">Contato</Label>
              {contatoSel ? (
                <div className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-sm">
                  <span>{contatoSel.nome}</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setContatoSel(null)}
                  >
                    trocar
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="fu-contato"
                      value={termoBusca}
                      onChange={(e) => handleBuscarContato(e.target.value)}
                      placeholder="Buscar contato por nome ou telefone…"
                      className="pl-8"
                    />
                  </div>
                  {resultados.length > 0 && (
                    <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                      {resultados.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
                          onClick={() => setContatoSel(c)}
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fu-data">Data</Label>
                <Input id="fu-data" type="date" value={dataFU} onChange={(e) => setDataFU(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fu-hora">Hora (opcional)</Label>
                <Input id="fu-hora" type="time" value={horaFU} onChange={(e) => setHoraFU(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fu-nota">Nota</Label>
              <Input
                id="fu-nota"
                value={notaFU}
                onChange={(e) => setNotaFU(e.target.value)}
                placeholder="Ex: Retomar negociação do pedido mínimo"
              />
            </div>

            {erroFU && <p className="text-sm text-destructive">{erroFU}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleCriarFollowUp} disabled={salvandoFU || !dataFU || !notaFU.trim()}>
                Agendar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
