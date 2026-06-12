"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Check, MessageSquare, Settings2, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { IniciarSequenciaDialog } from "@/components/shared/iniciar-sequencia-dialog"
import { dispensarAlerta, salvarConfigAlertas } from "./actions"
import type { AlertaComConversa, ConfigAlertas, TipoAlerta } from "./actions"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const TIPOS: Array<{ id: TipoAlerta | ""; label: string }> = [
  { id: "", label: "Todos os tipos" },
  { id: "lead_sem_resposta", label: "Lead sem resposta" },
  { id: "sem_recompra", label: "Cliente sem recompra" },
  { id: "em_risco", label: "Cliente em risco" },
  { id: "inativo", label: "Cliente inativo" },
]

const COR_TIPO: Record<TipoAlerta, string> = {
  lead_sem_resposta: "text-amber-600 bg-amber-500/10",
  sem_recompra: "text-orange-600 bg-orange-500/10",
  em_risco: "text-red-600 bg-red-500/10",
  inativo: "text-gray-600 bg-gray-500/10",
}

export function AlertasClient({
  alertasIniciais,
  configInicial,
  papel,
}: {
  alertasIniciais: AlertaComConversa[]
  configInicial: ConfigAlertas
  papel: string
}) {
  const [alertas, setAlertas] = useState<AlertaComConversa[]>(alertasIniciais)
  const [filtroTipo, setFiltroTipo] = useState<TipoAlerta | "">("")
  const [erro, setErro] = useState<string | null>(null)

  const [configAberta, setConfigAberta] = useState(false)
  const [config, setConfig] = useState<ConfigAlertas>(configInicial)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [erroConfig, setErroConfig] = useState<string | null>(null)

  const [sequenciaContato, setSequenciaContato] = useState<{ id: string; nome: string } | null>(null)

  const filtrados = filtroTipo ? alertas.filter((a) => a.tipo === filtroTipo) : alertas

  async function handleDispensar(alerta: AlertaComConversa) {
    const anterior = alertas
    setAlertas((prev) => prev.filter((a) => !(a.cardId === alerta.cardId && a.tipo === alerta.tipo)))
    const resultado = await dispensarAlerta(alerta.cardId, alerta.tipo, alerta.referencia)
    if (resultado.erro) {
      setAlertas(anterior)
      setErro(resultado.erro)
    }
  }

  async function handleSalvarConfig() {
    setSalvandoConfig(true)
    setErroConfig(null)
    const resultado = await salvarConfigAlertas(config)
    setSalvandoConfig(false)
    if (resultado.erro) {
      setErroConfig(resultado.erro)
      return
    }
    setConfigAberta(false)
    window.location.reload()
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold">Central de Alertas</h1>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filtrar por tipo"
            className={selectClass}
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoAlerta | "")}
          >
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {papel === "admin" && (
            <Button size="sm" variant="outline" onClick={() => setConfigAberta(true)}>
              <Settings2 className="size-4 mr-1.5" />
              Limiares
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Leads e clientes que atingiram o limite de dias sem atividade.
      </p>

      {erro && <p className="text-sm text-destructive mb-4">{erro}</p>}

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Check className="size-8 opacity-40" />
          <p className="text-sm">Nenhum alerta ativo</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((alerta) => (
            <div key={`${alerta.cardId}-${alerta.tipo}`} className="rounded-lg border p-3 flex items-start gap-3">
              <span className={cn("mt-0.5 shrink-0 rounded-full p-1.5", COR_TIPO[alerta.tipo])}>
                <AlertTriangle className="size-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{alerta.contatoNome}</span>
                  <span className={cn("text-xs rounded-full px-2 py-0.5", COR_TIPO[alerta.tipo])}>
                    {alerta.tipoLabel}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {alerta.etapaLabel} · {alerta.diasSemAtividade}{" "}
                  {alerta.diasSemAtividade === 1 ? "dia" : "dias"} sem atividade
                  {alerta.atendenteNome ? ` · ${alerta.atendenteNome}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {alerta.conversaId && (
                  <Link
                    href={`/chat?conversa=${alerta.conversaId}`}
                    className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MessageSquare className="size-3" />
                    Conversa
                  </Link>
                )}
                {alerta.contactId && (
                  <button
                    type="button"
                    onClick={() => setSequenciaContato({ id: alerta.contactId!, nome: alerta.contatoNome })}
                    className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Zap className="size-3" />
                    Sequência
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDispensar(alerta)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Dispensar alerta"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog — Configuração de limiares (Admin) */}
      <Dialog
        open={configAberta}
        onOpenChange={(open) => {
          if (!open) setErroConfig(null)
          setConfigAberta(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Limiares de alerta</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Número de dias sem atividade que dispara cada tipo de alerta.
            </p>
            {(
              [
                ["leadSemRespostaDias", "Lead sem resposta (dias)"],
                ["semRecompraDias", "Cliente sem recompra (dias)"],
                ["emRiscoDias", "Cliente em risco (dias)"],
                ["inativoDias", "Cliente inativo (dias)"],
              ] as Array<[keyof ConfigAlertas, string]>
            ).map(([campo, label]) => (
              <div key={campo} className="flex items-center justify-between gap-3">
                <Label htmlFor={`config-${campo}`}>{label}</Label>
                <Input
                  id={`config-${campo}`}
                  type="number"
                  min={1}
                  max={365}
                  className="w-24"
                  value={config[campo]}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [campo]: Number(e.target.value) }))
                  }
                />
              </div>
            ))}
            {erroConfig && <p className="text-sm text-destructive">{erroConfig}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvarConfig} disabled={salvandoConfig}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Dialog — Iniciar sequência a partir do alerta */}
      {sequenciaContato && (
        <IniciarSequenciaDialog
          contactId={sequenciaContato.id}
          contatoNome={sequenciaContato.nome}
          aberto
          onFechar={() => setSequenciaContato(null)}
        />
      )}
    </>
  )
}
