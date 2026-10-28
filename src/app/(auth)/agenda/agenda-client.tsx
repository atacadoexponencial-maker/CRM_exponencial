"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlarmClock, Check, MessageSquare, MoreHorizontal, Plus, Search } from "lucide-react"
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
import { diasAte, formatarDiaEHora, paraCamposDoFormulario } from "@/lib/datas"
import { cn } from "@/lib/utils"
import {
  adiarLembrete,
  apagarLembrete,
  buscarContatosParaFollowUp,
  criarFollowUp,
  desfazerFeito,
  editarLembrete,
  marcarLembreteFeito,
} from "./actions"
import type { ItemAgenda } from "./actions"
import { IconeDaOrigem, RegraDoLembrete } from "./origem-do-lembrete"

// B46-06: quanto tempo o "Feito. Desfazer" fica na tela
const TEMPO_PARA_DESFAZER_MS = 6000

type Grupo = "atrasados" | "hoje" | "amanha" | "semana" | "depois"

const GRUPO_LABEL: Record<Grupo, string> = {
  atrasados: "Atrasados",
  hoje: "Hoje",
  amanha: "Amanhã",
  semana: "Esta semana",
  depois: "Mais tarde",
}

export function grupoDoItem(item: ItemAgenda, agora: Date = new Date()): Grupo {
  // QA M5 (06/10): "atrasado" é a mesma regra do selo do menu e da agenda da equipe:
  // a hora já passou. Antes, aqui contava por dia, e as três telas discordavam.
  if (new Date(item.dueAt) < agora) return "atrasados"
  // B28 (20/10): o dia é contado no fuso da operação. Com o fuso da máquina, o
  // servidor (UTC) e o navegador discordavam entre 21h e meia-noite, e o React
  // descartava a página do servidor (erro #418).
  const diffDias = diasAte(item.dueAt, agora)
  if (diffDias < 0) return "atrasados"
  if (diffDias === 0) return "hoje"
  if (diffDias === 1) return "amanha"
  if (diffDias <= 7) return "semana"
  return "depois"
}

export function AgendaClient({ itensIniciais, papel }: { itensIniciais: ItemAgenda[]; papel: string }) {
  const router = useRouter()
  const [itens, setItens] = useState<ItemAgenda[]>(itensIniciais)
  const [erro, setErro] = useState<string | null>(null)
  // QA A10 (06/10): depois de "Novo follow-up", o router.refresh() traz a agenda nova
  // nas props; sem isto, o estado ficava com a lista antiga até o F5.
  const [recebidos, setRecebidos] = useState(itensIniciais)
  if (itensIniciais !== recebidos) {
    setRecebidos(itensIniciais)
    setItens(itensIniciais)
  }

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
  // B46-06: o lembrete que o formulário edita (null: novo follow-up)
  const [editando, setEditando] = useState<ItemAgenda | null>(null)
  const [apagando, setApagando] = useState<ItemAgenda | null>(null)
  const [erroApagar, setErroApagar] = useState<string | null>(null)
  const [feitoRecente, setFeitoRecente] = useState<ItemAgenda | null>(null)
  const relogioDoDesfazer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const atrasados = itens.filter((i) => grupoDoItem(i) === "atrasados").length

  async function handleFeito(id: string) {
    const anterior = itens
    const item = itens.find((i) => i.id === id) ?? null
    setItens((prev) => prev.filter((i) => i.id !== id))
    const resultado = await marcarLembreteFeito(id)
    if (resultado.erro) {
      setItens(anterior)
      setErro(resultado.erro)
      return
    }
    if (relogioDoDesfazer.current) clearTimeout(relogioDoDesfazer.current)
    setFeitoRecente(item)
    relogioDoDesfazer.current = setTimeout(() => setFeitoRecente(null), TEMPO_PARA_DESFAZER_MS)
  }

  async function handleDesfazer() {
    const item = feitoRecente
    if (!item) return
    if (relogioDoDesfazer.current) clearTimeout(relogioDoDesfazer.current)
    setFeitoRecente(null)
    const resultado = await desfazerFeito(item.id)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setItens((prev) => [...prev, item].sort((a, b) => a.dueAt.localeCompare(b.dueAt)))
  }

  async function handleApagar() {
    if (!apagando) return
    setErroApagar(null)
    const resultado = await apagarLembrete(apagando.id)
    if (resultado.erro) {
      setErroApagar(resultado.erro)
      return
    }
    setItens((prev) => prev.filter((i) => i.id !== apagando.id))
    setApagando(null)
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

  // QA M6 (06/10): só a resposta da última busca vale; as anteriores podem chegar depois.
  const ultimaBusca = useRef(0)
  async function handleBuscarContato(termo: string) {
    setTermoBusca(termo)
    setContatoSel(null)
    const esta = ++ultimaBusca.current
    const lista = await buscarContatosParaFollowUp(termo)
    if (esta === ultimaBusca.current) setResultados(lista)
  }

  function abrirNovoFollowUp() {
    setEditando(null)
    setTermoBusca("")
    setResultados([])
    setContatoSel(null)
    setDataFU("")
    setHoraFU("")
    setNotaFU("")
    setErroFU(null)
    setDialogAberto(true)
  }

  function abrirEditar(item: ItemAgenda) {
    const { data, hora } = paraCamposDoFormulario(item.dueAt)
    setEditando(item)
    setTermoBusca("")
    setResultados([])
    setContatoSel({ id: item.contatoId, nome: item.contatoNome })
    setDataFU(data)
    setHoraFU(hora)
    setNotaFU(item.instrucao)
    setErroFU(null)
    setDialogAberto(true)
  }

  async function handleCriarFollowUp() {
    if (!contatoSel) {
      setErroFU("Escolha o contato")
      return
    }
    setSalvandoFU(true)
    setErroFU(null)
    const campos = { contactId: contatoSel.id, data: dataFU, hora: horaFU || undefined, nota: notaFU }
    const resultado = editando ? await editarLembrete(editando.id, campos) : await criarFollowUp(campos)
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
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Minha Agenda</h1>
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
        Lembretes das automações e follow-ups que você agendou.
      </p>

      {erro && <p className="text-sm text-erro mb-4">{erro}</p>}

      {feitoRecente && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm">
          <span>Feito.</span>
          <button type="button" className="font-medium underline underline-offset-2" onClick={handleDesfazer}>
            Desfazer
          </button>
        </div>
      )}

      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-card/60 py-16 text-muted-foreground">
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
                      <IconeDaOrigem item={item} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/contatos/${item.contatoId}`} className="font-medium text-sm hover:underline">
                            {item.contatoNome}
                          </Link>
                          <span className="text-xs text-muted-foreground">{formatarDiaEHora(item.dueAt)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.instrucao}</p>
                        <RegraDoLembrete item={item} />
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
                            <DropdownMenuItem onClick={() => handleAdiar(item.id, 1)}>1 dia</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdiar(item.id, 3)}>3 dias</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdiar(item.id, 7)}>1 semana</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" variant="outline" className="h-7" onClick={() => handleFeito(item.id)}>
                          <Check className="size-3 mr-1" />
                          Feito
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Abrir menu de {item.contatoNome}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirEditar(item)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setErroApagar(null)
                                setApagando(item)
                              }}
                            >
                              Apagar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          <DialogTitle className="mb-4">{editando ? "Editar follow-up" : "Novo follow-up"}</DialogTitle>
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
                  {/* B46-13: a lista só aparece quando se digita */}
                  {termoBusca.trim() !== "" && resultados.length > 0 && (
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

            {erroFU && <p className="text-sm text-erro">{erroFU}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              {/* B46-06 (B-14): o botão não fica cinza sem dizer o que falta; o servidor diz */}
              <Button onClick={handleCriarFollowUp} disabled={salvandoFU}>
                {editando ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* B46-06: apagar lembrete */}
      <Dialog open={apagando !== null} onOpenChange={(open) => !open && setApagando(null)}>
        <DialogPopup>
          <DialogTitle className="mb-4">Apagar lembrete</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Apagar o lembrete de <strong>{apagando?.contatoNome}</strong>? Ele sai da Agenda e não volta.
            </p>
            {erroApagar && <p className="text-sm text-erro">{erroApagar}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button variant="destructive" onClick={handleApagar}>
                Apagar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
