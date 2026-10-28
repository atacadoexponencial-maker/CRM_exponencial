"use client"

// B35-02: botões Transferir carteira e Remover da carteira, cada um com o seu diálogo de
// confirmação. A ação de verdade é no servidor (transferirCarteira / removerCarteira).

import { useState } from "react"
import { ArrowLeftRight, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { removerCarteira, transferirCarteira } from "../actions"
import type { Vendedor } from "@/lib/relatorios/carteiras"

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function TransferirCarteiraDialog({ vendedor, total, vendedores, onFeito }: { vendedor: Vendedor; total: number; vendedores: Vendedor[]; onFeito: () => void }) {
  const [open, setOpen] = useState(false)
  const [destino, setDestino] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const outros = vendedores.filter((v) => v.id !== vendedor.id)
  const alvo = outros.find((v) => v.id === destino)

  async function confirmar() {
    if (!alvo) return
    setSalvando(true)
    setErro(null)
    const r = await transferirCarteira(vendedor.id, alvo.id)
    setSalvando(false)
    if (r.erro) {
      setErro(r.erro)
      return
    }
    setOpen(false)
    setDestino("")
    onFeito()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setErro(null); setDestino("") } }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <ArrowLeftRight className="size-3.5" /> Transferir carteira
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-1">Transferir carteira</DialogTitle>
        <DialogDescription className="mb-4">Os {total} contatos de {vendedor.nome} passam para outro vendedor, com os cards deles. As conversas abertas ficam com quem está atendendo.</DialogDescription>
        <label className="text-sm font-medium" htmlFor="destino-carteira">Para quem</label>
        <select id="destino-carteira" className={`${selectClass} mt-1.5`} value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Escolha o vendedor</option>
          {outros.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>
        {alvo && <p className="text-sm mt-3" data-testid="confirmacao-transferir">Transferir {total} contatos de {vendedor.nome} para {alvo.nome}?</p>}
        {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro mt-3">{erro}</p>}
        <div className="flex justify-end gap-2 pt-4">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>Cancelar</DialogClose>
          <Button type="button" size="sm" disabled={!alvo || salvando || total === 0} onClick={confirmar}>{salvando ? "Transferindo..." : "Confirmar"}</Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

export function RemoverCarteiraDialog({ vendedor, total, onFeito }: { vendedor: Vendedor; total: number; onFeito: () => void }) {
  const [open, setOpen] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    setErro(null)
    const r = await removerCarteira(vendedor.id)
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
      {/* B48-16: secundário vermelho; a confirmação é este diálogo */}
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>
        <UserMinus className="size-3.5" /> Remover da carteira
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-1">Remover da carteira</DialogTitle>
        <DialogDescription className="mb-4" data-testid="confirmacao-remover">Deixar {total} contatos de {vendedor.nome} sem vendedor? Os cards deles também ficam sem atendente.</DialogDescription>
        {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro mb-3">{erro}</p>}
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" size="sm" />}>Cancelar</DialogClose>
          <Button type="button" size="sm" variant="destructive" disabled={salvando || total === 0} onClick={confirmar}>{salvando ? "Removendo..." : "Confirmar"}</Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
