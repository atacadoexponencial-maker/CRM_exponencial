"use client"

import { Copy } from "lucide-react"
import { Label } from "@/components/ui/label"
import { EntradaCampoPersonalizado } from "@/components/shared/entrada-campo-personalizado"
import { conferirValor, entradaDoValor, formatarValor, SEM_VALOR, type EntradaDoCampo } from "@/lib/campos-personalizados"
import type { CampoComValor } from "../../campos-personalizados"

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

/** O rascunho que abre o Editar: o valor de hoje de cada campo. */
export function rascunhoDosCampos(campos: CampoComValor[]): Record<string, EntradaDoCampo> {
  return Object.fromEntries(campos.map((c) => [c.id, entradaDoValor(c, c.valor)]))
}

/** Confere na tela para apontar o campo na hora; o servidor confere de novo. */
export function conferirCampos(campos: CampoComValor[], rascunho: Record<string, EntradaDoCampo>): Record<string, string> {
  const erros: Record<string, string> = {}
  for (const c of campos) {
    const conferido = conferirValor(c, rascunho[c.id] ?? null)
    if ("erro" in conferido) erros[c.id] = conferido.erro
  }
  return erros
}

// B48-19: o bloco não tem mais Editar nem Salvar próprios. O Editar da ficha abre os
// dados e estes campos juntos, e um Salvar só grava os dois (perfil-contato.tsx).
export function CamposPersonalizadosContato({
  campos,
  editando,
  rascunho,
  erros,
  onMudar,
  desabilitado = false,
}: {
  campos: CampoComValor[]
  editando: boolean
  rascunho: Record<string, EntradaDoCampo>
  erros: Record<string, string>
  onMudar: (campoId: string, valor: EntradaDoCampo) => void
  desabilitado?: boolean
}) {
  if (campos.length === 0) return null

  return (
    <section aria-labelledby="titulo-campos-personalizados" className="space-y-3">
      <h2 id="titulo-campos-personalizados" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Campos personalizados
      </h2>

      {editando ? (
        <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
          {campos.map((c) => (
            <div key={c.id} className={c.tipo === "texto_longo" || c.tipo === "multipla" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
              <Label htmlFor={`campo-${c.id}`}>{c.nome}</Label>
              <EntradaCampoPersonalizado
                id={`campo-${c.id}`}
                campo={c}
                valor={rascunho[c.id] ?? null}
                onChange={(v) => onMudar(c.id, v)}
                erro={erros[c.id]}
                disabled={desabilitado}
              />
            </div>
          ))}
        </div>
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
