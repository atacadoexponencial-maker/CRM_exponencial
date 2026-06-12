"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, GripVertical, MessageSquare, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { salvarSequencia } from "../actions"
import type { EtapaSequencia, SequenciaDetalhe } from "../actions"

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full min-h-16 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

const GATILHOS: Array<{ id: string; label: string }> = [
  { id: "manual", label: "Manual (inicia quando o vendedor pedir)" },
  { id: "card_lead", label: "Automático — card criado em Lead (Expansão)" },
  { id: "catalogo_enviado", label: "Automático — card movido para Catálogo Enviado" },
  { id: "onboarding", label: "Automático — card criado em Onboarding (Retenção)" },
  { id: "inativo", label: "Automático — card movido para Inativo" },
]

const ETAPA_NOVA: EtapaSequencia = { tipo: "mensagem", prazoDias: 1, conteudo: "", instrucao: "" }

export function EditorSequenciaClient({ sequencia }: { sequencia: SequenciaDetalhe | null }) {
  const router = useRouter()
  const [nome, setNome] = useState(sequencia?.nome ?? "")
  const [gatilho, setGatilho] = useState(sequencia?.gatilho ?? "manual")
  const [etapas, setEtapas] = useState<EtapaSequencia[]>(sequencia?.etapas ?? [{ ...ETAPA_NOVA, prazoDias: 0 }])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastandoIdx, setArrastandoIdx] = useState<number | null>(null)

  function atualizarEtapa(idx: number, updates: Partial<EtapaSequencia>) {
    setEtapas((prev) => prev.map((e, i) => (i === idx ? { ...e, ...updates } : e)))
  }

  function removerEtapa(idx: number) {
    setEtapas((prev) => prev.filter((_, i) => i !== idx))
  }

  function moverEtapa(de: number, para: number) {
    if (de === para) return
    setEtapas((prev) => {
      const novas = [...prev]
      const [removida] = novas.splice(de, 1)
      novas.splice(para, 0, removida)
      return novas
    })
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    const resultado = await salvarSequencia({
      id: sequencia?.id ?? null,
      nome,
      gatilho,
      etapas,
    })
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.push("/sequencias")
  }

  return (
    <>
      <h1 className="text-xl font-semibold mb-6">
        {sequencia ? `Editar sequência — ${sequencia.nome}` : "Nova sequência"}
      </h1>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seq-nome">Nome da sequência</Label>
          <Input
            id="seq-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Reaquecimento de leads frios"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seq-gatilho">Gatilho</Label>
          <select
            id="seq-gatilho"
            className={selectClass}
            value={gatilho}
            onChange={(e) => setGatilho(e.target.value)}
          >
            {GATILHOS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Etapas</Label>
            <span className="text-xs text-muted-foreground">
              Variáveis disponíveis: {"{{nome_contato}}"} e {"{{nome_vendedor}}"}
            </span>
          </div>

          {etapas.map((etapa, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => setArrastandoIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (arrastandoIdx !== null) moverEtapa(arrastandoIdx, idx)
                setArrastandoIdx(null)
              }}
              onDragEnd={() => setArrastandoIdx(null)}
              className={cn(
                "rounded-lg border p-3 flex gap-3 bg-background",
                arrastandoIdx === idx && "opacity-50"
              )}
            >
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0 cursor-grab" title="Arrastar para reordenar">
                <GripVertical className="size-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{idx + 1}</span>
              </div>

              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Tipo da etapa"
                    className={selectClass}
                    value={etapa.tipo}
                    onChange={(e) =>
                      atualizarEtapa(idx, { tipo: e.target.value as "mensagem" | "lembrete" })
                    }
                  >
                    <option value="mensagem">Mensagem automática</option>
                    <option value="lembrete">Lembrete para o vendedor</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label="Prazo em dias"
                      type="number"
                      min={0}
                      value={etapa.prazoDias}
                      onChange={(e) => atualizarEtapa(idx, { prazoDias: Math.max(0, Number(e.target.value)) })}
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {idx === 0 ? "dias após o início" : "dias após a etapa anterior"}
                    </span>
                  </div>
                </div>

                {etapa.tipo === "mensagem" ? (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="size-4 text-muted-foreground mt-2 shrink-0" />
                    <textarea
                      aria-label="Conteúdo da mensagem"
                      className={textareaClass}
                      value={etapa.conteudo}
                      onChange={(e) => atualizarEtapa(idx, { conteudo: e.target.value })}
                      placeholder="Mensagem que será enviada automaticamente ao contato…"
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <Bell className="size-4 text-muted-foreground mt-2 shrink-0" />
                    <textarea
                      aria-label="Instrução para o vendedor"
                      className={textareaClass}
                      value={etapa.instrucao}
                      onChange={(e) => atualizarEtapa(idx, { instrucao: e.target.value })}
                      placeholder="O que o vendedor deve fazer? Ex: Perguntar se o cliente já analisou o catálogo"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removerEtapa(idx)}
                className="self-start p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Excluir etapa"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEtapas((prev) => [...prev, { ...ETAPA_NOVA }])}
            className="self-start"
          >
            <Plus className="size-4 mr-1.5" />
            Adicionar etapa
          </Button>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => router.push("/sequencias")}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            Salvar sequência
          </Button>
        </div>
      </div>
    </>
  )
}
