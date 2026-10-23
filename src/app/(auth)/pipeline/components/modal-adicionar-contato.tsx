"use client"

import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"
import { formatarNumero } from "@/lib/whatsapp"
import { buscarContatosParaFunil, adicionarContatoAoFunil } from "../actions"

interface ModalAdicionarContatoProps {
  funilId: string
  funilNome: string
  onSucesso: () => void
  onFechar: () => void
}

/** B41-01: escolhe um contato da empresa e cria o card dele na primeira etapa do funil. */
export function ModalAdicionarContato({ funilId, funilNome, onSucesso, onFechar }: ModalAdicionarContatoProps) {
  const [termo, setTermo] = useState("")
  const [contatos, setContatos] = useState<Array<{ id: string; nome: string; telefone: string }>>([])
  const [buscando, setBuscando] = useState(false)
  const [adicionando, setAdicionando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    const t = setTimeout(() => {
      setBuscando(true)
      buscarContatosParaFunil(termo)
        .then((r) => { if (ativo) setContatos(r) })
        .catch(() => { if (ativo) setContatos([]) })
        .finally(() => { if (ativo) setBuscando(false) })
    }, 250)
    return () => { ativo = false; clearTimeout(t) }
  }, [termo])

  function adicionar(contactId: string) {
    setErro(null)
    setAdicionando(contactId)
    adicionarContatoAoFunil(funilId, contactId)
      .then((r) => {
        if (r.erro) { setErro(r.erro); return }
        onSucesso()
      })
      .catch(() => setErro("Não foi possível adicionar o contato. Tente de novo."))
      .finally(() => setAdicionando(null))
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onFechar} />
      <div
        role="dialog"
        aria-label={`Adicionar contato a ${funilNome}`}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Adicionar contato a {funilNome}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            placeholder="Buscar por nome ou telefone..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto">
          {contatos.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={adicionando !== null}
                onClick={() => adicionar(c.id)}
                className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="truncate font-medium">{c.nome}</span>
                <span className="numero shrink-0 text-xs text-muted-foreground">{adicionando === c.id ? "Adicionando..." : formatarNumero(c.telefone)}</span>
              </button>
            </li>
          ))}
          {!buscando && contatos.length === 0 && (
            <li className="py-4 text-center text-xs text-muted-foreground">Nenhum contato encontrado</li>
          )}
        </ul>

        {erro && <p role="alert" className="mt-3 text-xs text-destructive">{erro}</p>}
      </div>
    </>
  )
}
