"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { CampoPersonalizado, EntradaDoCampo } from "@/lib/campos-personalizados"

// B38-01: o controle de um campo personalizado, conforme o tipo. Mostra a mensagem de
// erro embaixo e marca o controle com aria-invalid.

const CLASSE_CAIXA =
  "w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface Props {
  campo: CampoPersonalizado
  valor: EntradaDoCampo
  onChange: (valor: EntradaDoCampo) => void
  erro?: string
  /** id do controle, para o <label>. */
  id: string
  disabled?: boolean
}

export function EntradaCampoPersonalizado({ campo, valor, onChange, erro, id, disabled }: Props) {
  const idErro = `${id}-erro`
  const comErro = { "aria-invalid": erro ? true : undefined, "aria-describedby": erro ? idErro : undefined }
  const texto = typeof valor === "string" ? valor : ""

  let controle: React.ReactNode
  switch (campo.tipo) {
    case "texto_longo":
      controle = (
        <textarea
          id={id}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(CLASSE_CAIXA, "min-h-20 resize-y py-2")}
          {...comErro}
        />
      )
      break
    case "data":
      controle = <Input id={id} type="date" value={texto} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...comErro} />
      break
    case "lista":
      controle = (
        <select id={id} value={texto} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={cn(CLASSE_CAIXA, "h-9")} {...comErro}>
          <option value="">Sem valor</option>
          {campo.opcoes.map((o) => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      )
      break
    case "multipla": {
      const marcadas = Array.isArray(valor) ? valor : []
      controle = (
        <div id={id} role="group" aria-label={campo.nome} className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1" {...comErro}>
          {campo.opcoes.map((o) => (
            <label key={o.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={marcadas.includes(o.id)}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked ? [...marcadas, o.id] : marcadas.filter((m) => m !== o.id))}
                className="size-4 accent-primary"
              />
              {o.nome}
            </label>
          ))}
        </div>
      )
      break
    }
    case "sim_nao":
      controle = (
        <select
          id={id}
          value={valor === true ? "sim" : valor === false ? "nao" : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "sim")}
          disabled={disabled}
          className={cn(CLASSE_CAIXA, "h-9")}
          {...comErro}
        >
          <option value="">Sem valor</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      )
      break
    default:
      controle = (
        <Input
          id={id}
          type={campo.tipo === "email" ? "email" : campo.tipo === "link" ? "url" : campo.tipo === "telefone" ? "tel" : "text"}
          inputMode={campo.tipo === "numero" || campo.tipo === "dinheiro" ? "decimal" : undefined}
          placeholder={campo.tipo === "dinheiro" ? "R$ 0,00" : campo.tipo === "link" ? "instagram.com/loja" : undefined}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          {...comErro}
        />
      )
  }

  return (
    <div className="space-y-1">
      {controle}
      {erro && (
        <p id={idErro} className="text-xs text-erro">
          {erro}
        </p>
      )}
    </div>
  )
}
