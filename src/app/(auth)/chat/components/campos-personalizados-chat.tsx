"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { EntradaCampoPersonalizado } from "@/components/shared/entrada-campo-personalizado"
import { conferirValor, entradaDoValor, formatarValor, SEM_VALOR, type EntradaDoCampo } from "@/lib/campos-personalizados"
import { camposDoContato, salvarCamposDoContato, type CampoComValor } from "@/app/(auth)/contatos/campos-personalizados"

// B38-02: os campos personalizados no painel do contato do Chat. Lápis abre o controle
// do tipo; ✓ salva, × cancela, como tipo e cidade. Quem vê o contato edita (o servidor
// e o RLS conferem); sem acesso ou sem campos, a seção não aparece.

function CampoEditavel({ contactId, campo, onSalvo }: { contactId: string; campo: CampoComValor; onSalvo: () => Promise<void> }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<EntradaDoCampo>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const mostrado = formatarValor(campo, campo.valor)

  function abrir() {
    setRascunho(entradaDoValor(campo, campo.valor))
    setErro(null)
    setEditando(true)
  }

  async function salvar() {
    if (salvando) return
    const conferido = conferirValor(campo, rascunho)
    if ("erro" in conferido) {
      setErro(conferido.erro)
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const r = await salvarCamposDoContato(contactId, { [campo.id]: rascunho })
      if (r.erros?.[campo.id] || r.erro) {
        setErro(r.erros?.[campo.id] ?? r.erro ?? null)
        return
      }
      await onSalvo()
      setEditando(false)
    } catch {
      setErro("Não foi possível salvar")
    } finally {
      setSalvando(false)
    }
  }

  if (!editando) {
    return (
      <div data-campo={campo.nome} className="flex items-baseline justify-between gap-2 text-xs">
        <dt className="text-muted-foreground shrink-0">{campo.nome}</dt>
        <dd className="flex min-w-0 items-center gap-1">
          <span className={cn("truncate", mostrado === SEM_VALOR && "text-muted-foreground")}>{mostrado}</span>
          <button
            type="button"
            onClick={abrir}
            aria-label={`Editar ${campo.nome}`}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
          >
            <Pencil className="size-2.5" />
          </button>
        </dd>
      </div>
    )
  }

  return (
    <div data-campo={campo.nome} className="flex flex-col gap-1 text-xs">
      <dt>
        <label htmlFor={`chat-campo-${campo.id}`} className="text-muted-foreground">{campo.nome}</label>
      </dt>
      <dd className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <EntradaCampoPersonalizado
            id={`chat-campo-${campo.id}`}
            campo={campo}
            valor={rascunho}
            onChange={setRascunho}
            erro={erro ?? undefined}
            disabled={salvando}
          />
        </div>
        <button type="button" onClick={() => void salvar()} disabled={salvando} aria-label={`Salvar ${campo.nome}`} className="mt-2 flex h-5 w-5 items-center justify-center rounded-md text-sucesso hover:bg-muted disabled:opacity-40">
          {salvando ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        </button>
        <button type="button" onClick={() => setEditando(false)} disabled={salvando} aria-label={`Cancelar ${campo.nome}`} className="mt-2 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
          <X className="size-3" />
        </button>
      </dd>
    </div>
  )
}

export function CamposPersonalizadosChat({ contactId }: { contactId: string }) {
  const [campos, setCampos] = useState<CampoComValor[] | null>(null)

  async function carregar() {
    try {
      setCampos(await camposDoContato(contactId))
    } catch {
      setCampos(null)
    }
  }

  useEffect(() => {
    let ativo = true
    camposDoContato(contactId)
      .then((r) => { if (ativo) setCampos(r) })
      .catch(() => { if (ativo) setCampos(null) })
    return () => { ativo = false }
  }, [contactId])

  if (!campos || campos.length === 0) return null

  return (
    <section aria-labelledby="titulo-campos-chat" className="flex flex-col gap-2">
      <p id="titulo-campos-chat" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Campos personalizados</p>
      <dl className="flex flex-col gap-1">
        {campos.map((c) => (
          <CampoEditavel key={c.id} contactId={contactId} campo={c} onSalvo={carregar} />
        ))}
      </dl>
    </section>
  )
}
