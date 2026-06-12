"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Megaphone, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { cancelarCampanha } from "./actions"
import type { CampanhaListada } from "./actions"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  agendada: "Agendada",
  enviando: "Enviando",
  enviada: "Enviada",
  cancelada: "Cancelada",
}

const STATUS_CLASS: Record<string, string> = {
  rascunho: "bg-secondary text-muted-foreground",
  agendada: "bg-blue-500/10 text-blue-600",
  enviando: "bg-amber-500/10 text-amber-600",
  enviada: "bg-green-500/10 text-green-600",
  cancelada: "bg-red-500/10 text-red-600",
}

const FILTROS: Array<{ id: string; label: string }> = [
  { id: "", label: "Todas" },
  { id: "rascunho", label: "Rascunho" },
  { id: "agendada", label: "Agendadas" },
  { id: "enviada", label: "Enviadas" },
  { id: "cancelada", label: "Canceladas" },
]

function destinoDaCampanha(c: CampanhaListada): string {
  if (c.status === "enviada" || c.status === "enviando") return `/campanhas/${c.id}/relatorio`
  if (c.status === "cancelada") return `/campanhas/${c.id}/relatorio`
  return `/campanhas/${c.id}`
}

export function CampanhasClient({ campanhasIniciais }: { campanhasIniciais: CampanhaListada[] }) {
  const router = useRouter()
  const [campanhas, setCampanhas] = useState<CampanhaListada[]>(campanhasIniciais)
  const [filtroStatus, setFiltroStatus] = useState("")
  const [busca, setBusca] = useState("")
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [erroCancelar, setErroCancelar] = useState<string | null>(null)

  const filtradas = campanhas.filter((c) => {
    if (filtroStatus && c.status !== filtroStatus) return false
    if (busca.trim() && !c.nome.toLowerCase().includes(busca.trim().toLowerCase())) return false
    return true
  })

  const campanhaCancelando = campanhas.find((c) => c.id === cancelandoId)

  async function handleCancelar() {
    if (!cancelandoId) return
    setCancelando(true)
    setErroCancelar(null)
    const resultado = await cancelarCampanha(cancelandoId)
    setCancelando(false)
    if (resultado.erro) {
      setErroCancelar(resultado.erro)
      return
    }
    setCampanhas((prev) =>
      prev.map((c) => (c.id === cancelandoId ? { ...c, status: "cancelada" } : c))
    )
    setCancelandoId(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold">Campanhas</h1>
        <Button size="sm" onClick={() => router.push("/campanhas/nova")}>
          <Plus className="size-4 mr-1.5" />
          Nova campanha
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Disparos em massa segmentados — cada contato recebe a mensagem individualmente.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Buscar campanha"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
            className="pl-8 w-64"
          />
        </div>
        <select
          aria-label="Filtrar por status"
          className={selectClass}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
          <Megaphone className="size-8 opacity-40" />
          <p className="text-sm">Nenhuma campanha encontrada</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campanha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destinatários</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Envio</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Criador</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={destinoDaCampanha(c)} className="font-medium hover:underline">
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium", STATUS_CLASS[c.status])}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.totalDestinatarios}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.dataEnvio
                      ? new Date(c.dataEnvio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.criador ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.status === "agendada" && (
                      <button
                        type="button"
                        onClick={() => {
                          setErroCancelar(null)
                          setCancelandoId(c.id)
                        }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={cancelandoId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelandoId(null)
        }}
      >
        <DialogPopup>
          <DialogTitle className="mb-4">Cancelar campanha</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              <strong>{campanhaCancelando?.nome}</strong> ainda não foi enviada. Ao cancelar,
              nenhuma mensagem será disparada.
            </p>
            {erroCancelar && <p className="text-sm text-destructive">{erroCancelar}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Voltar
              </DialogClose>
              <Button variant="destructive" onClick={handleCancelar} disabled={cancelando}>
                Cancelar campanha
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
