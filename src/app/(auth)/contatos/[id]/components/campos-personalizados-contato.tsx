"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { EntradaCampoPersonalizado } from "@/components/shared/entrada-campo-personalizado"
import { conferirValor, entradaDoValor, formatarValor, SEM_VALOR, type EntradaDoCampo } from "@/lib/campos-personalizados"
import { salvarCamposDoContato, type CampoComValor } from "../../campos-personalizados"

// B38-01: bloco "Campos personalizados" do perfil do contato. Quem abre o perfil vê o
// contato, e quem vê o contato preenche os campos dele (o servidor e o RLS conferem).

function ValorNaTela({ campo }: { campo: CampoComValor }) {
  const texto = formatarValor(campo, campo.valor)
  if (texto === SEM_VALOR || !campo.valor?.texto) return <span className={texto === SEM_VALOR ? "text-muted-foreground" : undefined}>{texto}</span>
  if (campo.tipo === "link") {
    return (
      <a href={campo.valor.texto} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-2 hover:underline">
        {texto}
      </a>
    )
  }
  if (campo.tipo === "email") {
    return (
      <a href={`mailto:${campo.valor.texto}`} className="break-all text-primary underline-offset-2 hover:underline">
        {texto}
      </a>
    )
  }
  if (campo.tipo === "telefone") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="numero">{texto}</span>
        <button
          type="button"
          aria-label={`Copiar ${campo.nome}`}
          onClick={() => void navigator.clipboard?.writeText(campo.valor?.texto ?? "")}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Copy className="size-3.5" />
        </button>
      </span>
    )
  }
  return <span className="whitespace-pre-wrap break-words">{texto}</span>
}

export function CamposPersonalizadosContato({ contactId, campos }: { contactId: string; campos: CampoComValor[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState<Record<string, EntradaDoCampo>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  if (campos.length === 0) return null

  function iniciar() {
    setRascunho(Object.fromEntries(campos.map((c) => [c.id, entradaDoValor(c, c.valor)])))
    setErros({})
    setErro(null)
    setEditando(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    // Confere na tela para apontar o campo na hora; o servidor confere de novo.
    const daTela: Record<string, string> = {}
    for (const c of campos) {
      const conferido = conferirValor(c, rascunho[c.id] ?? null)
      if ("erro" in conferido) daTela[c.id] = conferido.erro
    }
    setErros(daTela)
    if (Object.keys(daTela).length > 0) return

    setSalvando(true)
    setErro(null)
    try {
      const r = await salvarCamposDoContato(contactId, rascunho)
      if (r.erros) setErros(r.erros)
      else if (r.erro) setErro(r.erro)
      else {
        setEditando(false)
        router.refresh()
      }
    } catch {
      setErro("Não foi possível salvar")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-campos-personalizados" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="titulo-campos-personalizados" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Campos personalizados
        </h2>
        {!editando && (
          <Button size="sm" variant="outline" onClick={iniciar} aria-label="Editar campos personalizados">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      {editando ? (
        <form onSubmit={salvar} noValidate className="space-y-4 rounded-lg border p-4 text-sm">
          {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">{erro}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.id} className={c.tipo === "texto_longo" || c.tipo === "multipla" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <Label htmlFor={`campo-${c.id}`}>{c.nome}</Label>
                <EntradaCampoPersonalizado
                  id={`campo-${c.id}`}
                  campo={c}
                  valor={rascunho[c.id] ?? null}
                  onChange={(v) => setRascunho((r) => ({ ...r, [c.id]: v }))}
                  erro={erros[c.id]}
                  disabled={salvando}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      ) : (
        <dl className="divide-y rounded-lg border text-sm">
          {campos.map((c) => (
            <div key={c.id} data-campo={c.nome} className="flex items-start gap-4 px-4 py-3">
              <dt className="w-28 shrink-0 break-words text-muted-foreground">{c.nome}</dt>
              <dd className="min-w-0 text-foreground">
                <ValorNaTela campo={c} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
