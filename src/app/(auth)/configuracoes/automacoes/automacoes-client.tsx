"use client"

import { useState } from "react"
import { MoreHorizontal, Plus, Zap } from "lucide-react"
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
import { ETAPAS_EXPANSAO, ETAPAS_RETENCAO } from "../../pipeline/mock-pipeline"
import {
  criarAutomacao,
  editarAutomacao,
  alternarAutomacao,
  excluirAutomacao,
} from "./actions"
import type { AutomacaoListada, DadosAutomacao, GatilhoTipo, AcaoTipo } from "./actions"

const GATILHO_LABEL: Record<GatilhoTipo, string> = {
  card_movido: "Card entrar numa etapa do funil",
  conversa_criada: "Nova conversa recebida no WhatsApp",
}

const ACAO_LABEL: Record<AcaoTipo, string> = {
  enviar_mensagem: "Enviar mensagem WhatsApp",
  aplicar_etiqueta: "Aplicar etiqueta na conversa",
  atribuir_atendente: "Atribuir atendente",
  mover_card: "Mover card para outra etapa",
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

const textareaClass =
  "w-full min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

type Opcao = { id: string; nome: string }

interface AutomacoesClientProps {
  automacoesIniciais: AutomacaoListada[]
  etiquetas: Array<{ id: string; nome: string; cor: string }>
  atendentes: Opcao[]
}

function etapasDoFunil(funil: string | undefined) {
  return funil === "retencao" ? ETAPAS_RETENCAO : ETAPAS_EXPANSAO
}

function etapaLabel(funil: string | undefined, etapa: string | undefined): string {
  if (!etapa) return ""
  const todas = [...ETAPAS_EXPANSAO, ...ETAPAS_RETENCAO] as Array<{ id: string; label: string }>
  void funil
  return todas.find((e) => e.id === etapa)?.label ?? etapa
}

function resumoGatilho(a: AutomacaoListada): string {
  if (a.gatilhoTipo === "card_movido") {
    const funil = a.gatilhoConfig.funil === "retencao" ? "Retenção" : "Expansão"
    return `Quando o card entrar em "${etapaLabel(a.gatilhoConfig.funil, a.gatilhoConfig.etapa)}" (${funil})`
  }
  return "Quando uma nova conversa for recebida"
}

function resumoAcao(
  a: AutomacaoListada,
  etiquetas: Array<{ id: string; nome: string }>,
  atendentes: Opcao[]
): string {
  switch (a.acaoTipo) {
    case "enviar_mensagem":
      return `enviar mensagem: "${(a.acaoConfig.texto ?? "").slice(0, 60)}${(a.acaoConfig.texto ?? "").length > 60 ? "…" : ""}"`
    case "aplicar_etiqueta":
      return `aplicar etiqueta "${etiquetas.find((e) => e.id === a.acaoConfig.label_id)?.nome ?? "—"}"`
    case "atribuir_atendente":
      return `atribuir a ${atendentes.find((p) => p.id === a.acaoConfig.atendente_id)?.nome ?? "—"}`
    case "mover_card": {
      const funil = a.acaoConfig.funil === "retencao" ? "Retenção" : "Expansão"
      return `mover card para "${etapaLabel(a.acaoConfig.funil, a.acaoConfig.etapa)}" (${funil})`
    }
  }
}

const FORM_VAZIO: DadosAutomacao = {
  nome: "",
  gatilhoTipo: "card_movido",
  gatilhoConfig: { funil: "expansao", etapa: "" },
  acaoTipo: "enviar_mensagem",
  acaoConfig: {},
}

export function AutomacoesClient({ automacoesIniciais, etiquetas, atendentes }: AutomacoesClientProps) {
  const [automacoes, setAutomacoes] = useState<AutomacaoListada[]>(automacoesIniciais)

  const [dialogAberto, setDialogAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<DadosAutomacao>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const automacaoExcluindo = automacoes.find((a) => a.id === excluindoId)

  function abrirCriar() {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro(null)
    setDialogAberto(true)
  }

  function abrirEditar(a: AutomacaoListada) {
    setEditandoId(a.id)
    setForm({
      nome: a.nome,
      gatilhoTipo: a.gatilhoTipo,
      gatilhoConfig: { ...a.gatilhoConfig },
      acaoTipo: a.acaoTipo,
      acaoConfig: { ...a.acaoConfig },
    })
    setErro(null)
    setDialogAberto(true)
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    const resultado = editandoId
      ? await editarAutomacao(editandoId, form)
      : await criarAutomacao(form)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    if (editandoId) {
      setAutomacoes((prev) =>
        prev.map((a) => (a.id === editandoId ? { ...a, ...form } : a))
      )
    } else {
      // Recarrega via reload simples — o id novo vem do servidor
      window.location.reload()
      return
    }
    setDialogAberto(false)
  }

  async function handleAlternar(a: AutomacaoListada) {
    const novoEstado = !a.ativa
    setAutomacoes((prev) => prev.map((x) => (x.id === a.id ? { ...x, ativa: novoEstado } : x)))
    const resultado = await alternarAutomacao(a.id, novoEstado)
    if (resultado.erro) {
      setAutomacoes((prev) => prev.map((x) => (x.id === a.id ? { ...x, ativa: a.ativa } : x)))
    }
  }

  async function handleExcluir() {
    if (!excluindoId) return
    setExcluindo(true)
    setErroExcluir(null)
    const resultado = await excluirAutomacao(excluindoId)
    setExcluindo(false)
    if (resultado.erro) {
      setErroExcluir(resultado.erro)
      return
    }
    setAutomacoes((prev) => prev.filter((a) => a.id !== excluindoId))
    setDialogExcluirAberto(false)
  }

  function setGatilhoTipo(tipo: GatilhoTipo) {
    setForm((f) => ({
      ...f,
      gatilhoTipo: tipo,
      gatilhoConfig: tipo === "card_movido" ? { funil: "expansao", etapa: "" } : {},
    }))
  }

  function setAcaoTipo(tipo: AcaoTipo) {
    setForm((f) => ({
      ...f,
      acaoTipo: tipo,
      acaoConfig: tipo === "mover_card" ? { funil: "expansao", etapa: "" } : {},
    }))
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Automações</h1>
        <Button onClick={abrirCriar} size="sm">
          <Plus className="size-4 mr-1.5" />
          Nova automação
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure regras do tipo &quot;quando acontecer X, faça Y&quot; — elas rodam
        automaticamente para todo o workspace.
      </p>

      {automacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Zap className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma automação configurada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Automação</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Regra</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {automacoes.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{a.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {resumoGatilho(a)} → {resumoAcao(a, etiquetas, atendentes)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={a.ativa}
                      onClick={() => handleAlternar(a)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        a.ativa ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      title={a.ativa ? "Desativar" : "Ativar"}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          a.ativa ? "translate-x-[18px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => abrirEditar(a)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setExcluindoId(a.id)
                            setErroExcluir(null)
                            setDialogExcluirAberto(true)
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

      {/* Dialog — Criar/Editar automação */}
      <Dialog
        open={dialogAberto}
        onOpenChange={(open) => {
          if (!open) setErro(null)
          setDialogAberto(open)
        }}
      >
        <DialogPopup className="max-w-lg">
          <DialogTitle className="mb-4">
            {editandoId ? "Editar automação" : "Nova automação"}
          </DialogTitle>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="automacao-nome">Nome</Label>
              <Input
                id="automacao-nome"
                type="text"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Boas-vindas para novos leads"
              />
            </div>

            {/* Gatilho */}
            <div className="flex flex-col gap-1.5 rounded-lg border p-3">
              <Label htmlFor="automacao-gatilho" className="text-muted-foreground text-xs uppercase tracking-wide">
                Quando
              </Label>
              <select
                id="automacao-gatilho"
                className={selectClass}
                value={form.gatilhoTipo}
                onChange={(e) => setGatilhoTipo(e.target.value as GatilhoTipo)}
              >
                {(Object.keys(GATILHO_LABEL) as GatilhoTipo[]).map((tipo) => (
                  <option key={tipo} value={tipo}>{GATILHO_LABEL[tipo]}</option>
                ))}
              </select>

              {form.gatilhoTipo === "card_movido" && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <select
                    aria-label="Funil do gatilho"
                    className={selectClass}
                    value={form.gatilhoConfig.funil ?? "expansao"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gatilhoConfig: { funil: e.target.value, etapa: "" } }))
                    }
                  >
                    <option value="expansao">Funil de Expansão</option>
                    <option value="retencao">Funil de Retenção</option>
                  </select>
                  <select
                    aria-label="Etapa do gatilho"
                    className={selectClass}
                    value={form.gatilhoConfig.etapa ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gatilhoConfig: { ...f.gatilhoConfig, etapa: e.target.value } }))
                    }
                  >
                    <option value="">Escolha a etapa…</option>
                    {etapasDoFunil(form.gatilhoConfig.funil).map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Ação */}
            <div className="flex flex-col gap-1.5 rounded-lg border p-3">
              <Label htmlFor="automacao-acao" className="text-muted-foreground text-xs uppercase tracking-wide">
                Então
              </Label>
              <select
                id="automacao-acao"
                className={selectClass}
                value={form.acaoTipo}
                onChange={(e) => setAcaoTipo(e.target.value as AcaoTipo)}
              >
                {(Object.keys(ACAO_LABEL) as AcaoTipo[]).map((tipo) => (
                  <option key={tipo} value={tipo}>{ACAO_LABEL[tipo]}</option>
                ))}
              </select>

              {form.acaoTipo === "enviar_mensagem" && (
                <textarea
                  aria-label="Mensagem a enviar"
                  className={cn(textareaClass, "mt-1")}
                  value={form.acaoConfig.texto ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, acaoConfig: { texto: e.target.value } }))
                  }
                  placeholder="Escreva a mensagem que será enviada ao contato…"
                />
              )}

              {form.acaoTipo === "aplicar_etiqueta" && (
                <select
                  aria-label="Etiqueta a aplicar"
                  className={cn(selectClass, "mt-1")}
                  value={form.acaoConfig.label_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, acaoConfig: { label_id: e.target.value } }))
                  }
                >
                  <option value="">Escolha a etiqueta…</option>
                  {etiquetas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              )}

              {form.acaoTipo === "atribuir_atendente" && (
                <select
                  aria-label="Atendente"
                  className={cn(selectClass, "mt-1")}
                  value={form.acaoConfig.atendente_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, acaoConfig: { atendente_id: e.target.value } }))
                  }
                >
                  <option value="">Escolha o atendente…</option>
                  {atendentes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              )}

              {form.acaoTipo === "mover_card" && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <select
                    aria-label="Funil de destino"
                    className={selectClass}
                    value={form.acaoConfig.funil ?? "expansao"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, acaoConfig: { funil: e.target.value, etapa: "" } }))
                    }
                  >
                    <option value="expansao">Funil de Expansão</option>
                    <option value="retencao">Funil de Retenção</option>
                  </select>
                  <select
                    aria-label="Etapa de destino"
                    className={selectClass}
                    value={form.acaoConfig.etapa ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, acaoConfig: { ...f.acaoConfig, etapa: e.target.value } }))
                    }
                  >
                    <option value="">Escolha a etapa…</option>
                    {etapasDoFunil(form.acaoConfig.funil).map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvar} disabled={salvando}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Excluir automação */}
      <Dialog
        open={dialogExcluirAberto}
        onOpenChange={(open) => {
          if (!open) setErroExcluir(null)
          setDialogExcluirAberto(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir automação</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Tem certeza que deseja excluir <strong>{automacaoExcluindo?.nome}</strong>?
              Esta regra deixará de ser executada.
            </p>
            {erroExcluir && <p className="text-sm text-destructive">{erroExcluir}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button variant="destructive" onClick={handleExcluir} disabled={excluindo}>
                Excluir
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
