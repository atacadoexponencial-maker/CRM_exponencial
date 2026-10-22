"use client"

// B35-03: Distribuir entre vendedores (rodízio) e Reprocessar pela última venda, com
// confirmação. A ação de verdade é no servidor.

import { useState } from "react"
import { RefreshCw, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { distribuirSemVendedor, reprocessarPelaUltimaVenda } from "../actions"
import type { Vendedor } from "@/lib/relatorios/carteiras"

export function DistribuirDialog({ vendedores, semVendedor, onFeito }: { vendedores: Vendedor[]; semVendedor: { total: number; comCompra: number; leads: number }; onFeito: () => void }) {
  const [open, setOpen] = useState(false)
  const [marcados, setMarcados] = useState<string[]>(vendedores.map((v) => v.id))
  const [soComCompra, setSoComCompra] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const quantos = soComCompra ? semVendedor.comCompra : semVendedor.total

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  }

  async function confirmar() {
    setSalvando(true)
    setErro(null)
    const r = await distribuirSemVendedor(marcados, soComCompra)
    setSalvando(false)
    if (r.erro) {
      setErro(r.erro)
      return
    }
    setOpen(false)
    onFeito()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErro(null) }}>
      <DialogTrigger render={<Button size="sm" />}>
        <Wand2 className="size-3.5" /> Distribuir entre vendedores
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-1">Distribuir entre vendedores</DialogTitle>
        <DialogDescription className="mb-4">Os contatos sem vendedor são divididos em rodízio, um para cada vendedor marcado, na ordem de cadastro. Quem já tem vendedor não muda.</DialogDescription>
        <fieldset className="mb-4">
          <legend className="text-sm font-medium mb-2">Quem recebe</legend>
          <div className="flex flex-col gap-1.5">
            {vendedores.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={marcados.includes(v.id)} onChange={() => alternar(v.id)} /> {v.nome}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mb-4">
          <legend className="text-sm font-medium mb-2">Quais contatos</legend>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="quais" checked={!soComCompra} onChange={() => setSoComCompra(false)} /> Todos os sem vendedor ({semVendedor.total})</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="quais" checked={soComCompra} onChange={() => setSoComCompra(true)} /> Só os com compra ({semVendedor.comCompra})</label>
        </fieldset>
        <p className="text-sm" data-testid="confirmacao-distribuir">Distribuir {quantos} contatos entre {marcados.length} {marcados.length === 1 ? "vendedor" : "vendedores"}?</p>
        {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro mt-3">{erro}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>Cancelar</DialogClose>
          <Button type="button" size="sm" disabled={salvando || marcados.length === 0 || quantos === 0} onClick={confirmar}>{salvando ? "Distribuindo..." : "Confirmar"}</Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

export function ReprocessarDialog({ semVendedor, onFeito }: { semVendedor: { total: number }; onFeito: () => void }) {
  const [open, setOpen] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    setErro(null)
    const r = await reprocessarPelaUltimaVenda()
    setSalvando(false)
    if (r.erro) {
      setErro(r.erro)
      return
    }
    setOpen(false)
    onFeito()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErro(null) }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <RefreshCw className="size-3.5" /> Reprocessar pela última venda
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-1">Reprocessar pela última venda</DialogTitle>
        <DialogDescription className="mb-4" data-testid="confirmacao-reprocessar">
          Cada um dos {semVendedor.total} contatos sem vendedor passa a ser do atendente da última venda dele, quando houver. Quem não tem venda com atendente continua sem vendedor.
        </DialogDescription>
        {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro mb-3">{erro}</p>}
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>Cancelar</DialogClose>
          <Button type="button" size="sm" disabled={salvando || semVendedor.total === 0} onClick={confirmar}>{salvando ? "Reprocessando..." : "Confirmar"}</Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
