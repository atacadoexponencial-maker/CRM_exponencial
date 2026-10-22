"use client"

// B37-03: faixa "Salvos" na lista de contatos. Um clique liga ou desliga o filtro
// salvo; Admin e Gerente têm o menu (⋯) com renomear, mover e apagar. Quem confere
// o papel e grava é o servidor; aqui só se escondem os botões de quem não pode.

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPopup, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  apagarFiltroSalvo,
  moverFiltroSalvo,
  renomearFiltroSalvo,
  type FiltroSalvo,
} from "../filtros-salvos"

const inputClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface FaixaFiltrosSalvosProps {
  filtros: FiltroSalvo[]
  /** Filtro salvo que está ligado agora, se algum. */
  ativoId: string | null
  podeGerir: boolean
  onAlternar: (filtro: FiltroSalvo) => void
  /** A lista nova que o servidor devolveu depois de renomear, mover ou apagar. */
  onMudou: (filtros: FiltroSalvo[], apagadoId?: string) => void
}

export function FaixaFiltrosSalvos({ filtros, ativoId, podeGerir, onAlternar, onMudou }: FaixaFiltrosSalvosProps) {
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [renomeando, setRenomeando] = useState<FiltroSalvo | null>(null)
  const [novoNome, setNovoNome] = useState("")
  const [apagando, setApagando] = useState<FiltroSalvo | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (filtros.length === 0) return null

  async function executar(acao: () => Promise<{ erro?: string; filtros?: FiltroSalvo[] }>, apagadoId?: string) {
    setOcupado(true)
    setErro(null)
    try {
      const r = await acao()
      if (r.erro) { setErro(r.erro); return false }
      if (r.filtros) onMudou(r.filtros, apagadoId)
      return true
    } catch {
      setErro("Não foi possível concluir. Tente de novo.")
      return false
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtros salvos">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Salvos</span>
      {filtros.map((f, i) => (
        <div key={f.id} className="relative flex items-center">
          <button
            type="button"
            aria-pressed={ativoId === f.id}
            onClick={() => onAlternar(f)}
            className={cn(
              "px-2.5 py-1 text-xs border transition-colors",
              podeGerir ? "rounded-l-md" : "rounded-md",
              ativoId === f.id
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {f.nome}
          </button>
          {podeGerir && (
            <button
              type="button"
              aria-label={`Opções do filtro ${f.nome}`}
              aria-expanded={menuAberto === f.id}
              onClick={() => setMenuAberto((m) => (m === f.id ? null : f.id))}
              className={cn(
                "flex h-[26px] items-center rounded-r-md border border-l-0 px-1 transition-colors",
                ativoId === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          )}
          {menuAberto === f.id && (
            <div role="menu" className="absolute left-0 top-8 z-10 w-48 rounded-lg border bg-card py-1 text-sm shadow-md">
              <ItemMenu onClick={() => { setMenuAberto(null); setNovoNome(f.nome); setErro(null); setRenomeando(f) }}>
                Renomear
              </ItemMenu>
              {i > 0 && (
                <ItemMenu onClick={() => { setMenuAberto(null); executar(() => moverFiltroSalvo(f.id, "esquerda")) }}>
                  Mover para a esquerda
                </ItemMenu>
              )}
              {i < filtros.length - 1 && (
                <ItemMenu onClick={() => { setMenuAberto(null); executar(() => moverFiltroSalvo(f.id, "direita")) }}>
                  Mover para a direita
                </ItemMenu>
              )}
              <ItemMenu perigo onClick={() => { setMenuAberto(null); setErro(null); setApagando(f) }}>
                Apagar
              </ItemMenu>
            </div>
          )}
        </div>
      ))}

      {erro && !renomeando && !apagando && <span className="ml-2 text-xs text-erro">{erro}</span>}

      <Dialog open={!!renomeando} onOpenChange={(aberto) => { if (!aberto) setRenomeando(null) }}>
        <DialogPopup className="max-w-sm">
          <DialogTitle className="text-base">Renomear filtro</DialogTitle>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!renomeando) return
              if (await executar(() => renomearFiltroSalvo(renomeando.id, novoNome))) setRenomeando(null)
            }}
          >
            <input aria-label="Nome do filtro" className={inputClass} value={novoNome} maxLength={60} onChange={(e) => setNovoNome(e.target.value)} />
            {erro && <p className="text-xs text-erro">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRenomeando(null)}>Cancelar</Button>
              <Button type="submit" disabled={ocupado}>Salvar nome</Button>
            </div>
          </form>
        </DialogPopup>
      </Dialog>

      <Dialog open={!!apagando} onOpenChange={(aberto) => { if (!aberto) setApagando(null) }}>
        <DialogPopup className="max-w-sm">
          <DialogTitle className="text-base">Apagar filtro?</DialogTitle>
          <DialogDescription className="mt-2">
            O filtro &ldquo;{apagando?.nome}&rdquo; sai da lista de contatos de todos da empresa.
          </DialogDescription>
          {erro && <p className="mt-2 text-xs text-erro">{erro}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setApagando(null)}>Cancelar</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={ocupado}
              onClick={async () => {
                if (!apagando) return
                if (await executar(() => apagarFiltroSalvo(apagando.id), apagando.id)) setApagando(null)
              }}
            >
              Apagar
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}

function ItemMenu({ children, onClick, perigo = false }: { children: React.ReactNode; onClick: () => void; perigo?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn("w-full px-3 py-1.5 text-left transition-colors hover:bg-muted", perigo && "text-erro")}
    >
      {children}
    </button>
  )
}
