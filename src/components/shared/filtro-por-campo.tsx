"use client"

import { campoPersonalizado, type CampoParaFiltro } from "@/lib/filtro-contatos"
import { comparacaoDoFiltroPorCampo, tipoDoFiltroPorCampo, type FiltroPorCampo } from "@/lib/filtro-por-campo"

// B38-07: o filtro por um campo personalizado, ao lado do filtro de atendente nos
// Relatórios e no Dashboard. O valor usa o controle do tipo (SUP-B38-13); quem usa o
// componente só filtra quando o filtro está completo (`filtroPorCampoCompleto`).

const CLASSE =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface Props {
  campos: CampoParaFiltro[]
  valor: FiltroPorCampo | null
  onChange: (valor: FiltroPorCampo | null) => void
}

export function FiltroPorCampoControle({ campos, valor, onChange }: Props) {
  if (campos.length === 0) return null
  const campo = valor ? campos.find((c) => campoPersonalizado(c) === valor.campo) : undefined
  const tipo = valor ? tipoDoFiltroPorCampo(valor) : null
  const valores = valor?.valores ?? []
  const mudar = (novos: string[]) => valor && onChange({ ...valor, valores: novos })

  let controle: React.ReactNode = null
  if (campo && tipo) {
    if (tipo === "lista" || tipo === "multipla") {
      controle = (
        <fieldset aria-label="Valores do campo" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {campo.opcoes.map((o) => (
            <label key={o.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={valores.includes(o.id)}
                onChange={(e) => mudar(e.target.checked ? [...valores, o.id] : valores.filter((v) => v !== o.id))}
              />
              {o.nome}
            </label>
          ))}
        </fieldset>
      )
    } else if (tipo === "sim_nao") {
      controle = (
        <select aria-label="Valor do campo" className={CLASSE} value={valores[0] ?? ""} onChange={(e) => mudar([e.target.value])}>
          <option value="">Escolha…</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      )
    } else if (comparacaoDoFiltroPorCampo(tipo) === "entre") {
      const tipoDoInput = tipo === "data" ? "date" : "number"
      controle = (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          entre
          <input aria-label="De" type={tipoDoInput} step={tipoDoInput === "number" ? "0.01" : undefined} className={CLASSE} value={valores[0] ?? ""} onChange={(e) => mudar([e.target.value, valores[1] ?? ""])} />
          e
          <input aria-label="Até" type={tipoDoInput} step={tipoDoInput === "number" ? "0.01" : undefined} className={CLASSE} value={valores[1] ?? ""} onChange={(e) => mudar([valores[0] ?? "", e.target.value])} />
        </span>
      )
    } else {
      controle = (
        <input aria-label="Valor do campo" placeholder="é igual a…" className={CLASSE} value={valores[0] ?? ""} onChange={(e) => mudar([e.target.value])} />
      )
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Campo personalizado"
        className={CLASSE}
        value={valor?.campo ?? ""}
        onChange={(e) => onChange(e.target.value ? { campo: e.target.value, valores: [] } : null)}
      >
        <option value="">Todos os contatos</option>
        {campos.map((c) => (
          <option key={c.id} value={campoPersonalizado(c)}>
            {c.nome}
          </option>
        ))}
      </select>
      {controle}
    </div>
  )
}
