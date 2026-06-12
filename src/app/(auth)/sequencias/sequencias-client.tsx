"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ListChecks, MoreHorizontal, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { alternarSequencia, excluirSequencia } from "./actions"
import type { SequenciaListada } from "./actions"

const GATILHO_LABEL: Record<string, string> = {
  manual: "Manual",
  card_lead: "Card criado em Lead",
  catalogo_enviado: "Movido para Catálogo Enviado",
  onboarding: "Card criado em Onboarding",
  inativo: "Movido para Inativo",
}

export function SequenciasClient({
  sequenciasIniciais,
  papel,
}: {
  sequenciasIniciais: SequenciaListada[]
  papel: string
}) {
  const router = useRouter()
  const [sequencias, setSequencias] = useState<SequenciaListada[]>(sequenciasIniciais)
  const [dialogExcluirAberto, setDialogExcluirAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  const ehAdmin = papel === "admin"
  const sequenciaExcluindo = sequencias.find((s) => s.id === excluindoId)

  async function handleAlternar(s: SequenciaListada) {
    if (!ehAdmin) return
    const novoEstado = !s.ativa
    setSequencias((prev) => prev.map((x) => (x.id === s.id ? { ...x, ativa: novoEstado } : x)))
    const resultado = await alternarSequencia(s.id, novoEstado)
    if (resultado.erro) {
      setSequencias((prev) => prev.map((x) => (x.id === s.id ? { ...x, ativa: s.ativa } : x)))
    }
  }

  async function handleExcluir() {
    if (!excluindoId) return
    setExcluindo(true)
    setErroExcluir(null)
    const resultado = await excluirSequencia(excluindoId)
    setExcluindo(false)
    if (resultado.erro) {
      setErroExcluir(resultado.erro)
      return
    }
    setSequencias((prev) => prev.filter((s) => s.id !== excluindoId))
    setDialogExcluirAberto(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold">Sequências</h1>
        {ehAdmin && (
          <Button size="sm" onClick={() => router.push("/sequencias/nova")}>
            <Plus className="size-4 mr-1.5" />
            Nova sequência
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Séries de mensagens automáticas e lembretes que mantêm o lead aquecido sem depender da
        memória do vendedor.
      </p>

      {sequencias.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <ListChecks className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma sequência cadastrada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sequência</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gatilho</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Em andamento</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sequencias.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.nome}</span>
                      <Badge variant={s.predefinida ? "secondary" : "outline"}>
                        {s.predefinida ? "Método" : "Personalizada"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{GATILHO_LABEL[s.gatilho] ?? s.gatilho}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.emAndamento} {s.emAndamento === 1 ? "contato" : "contatos"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.ativa}
                      disabled={!ehAdmin}
                      onClick={() => handleAlternar(s)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        s.ativa ? "bg-primary" : "bg-muted-foreground/30",
                        !ehAdmin && "opacity-50 cursor-not-allowed"
                      )}
                      title={s.ativa ? "Ativa" : "Inativa"}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          s.ativa ? "translate-x-[18px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sequencias/${s.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Editar
                      </Link>
                      {ehAdmin && !s.predefinida && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                setExcluindoId(s.id)
                                setErroExcluir(null)
                                setDialogExcluirAberto(true)
                              }}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialogExcluirAberto}
        onOpenChange={(open) => {
          if (!open) setErroExcluir(null)
          setDialogExcluirAberto(open)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Excluir sequência</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Tem certeza que deseja excluir <strong>{sequenciaExcluindo?.nome}</strong>?
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
