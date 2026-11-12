"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ORIGEM_FIXO,
  ORIGENS_FIXAS,
  type OrigemDaVariavel,
  type PartesDoTemplate,
  type VariaveisDoTemplate,
} from "@/lib/templates-da-meta"

// B54-05: para cada variável `{{n}}` do template (corpo, cabeçalho de texto e link de
// botão), de onde vem o valor: um dado do contato, um campo personalizado ou um texto
// fixo. Quem vem do contato pede o texto reserva (SUP-B54-07).

export type OpcaoDeOrigem = { valor: string; rotulo: string }

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type Props = {
  partes: PartesDoTemplate
  variaveis: VariaveisDoTemplate
  /** Campos personalizados da empresa, já como opção (`campo:<chave>`). */
  campos: OpcaoDeOrigem[]
  onMudar: (variaveis: VariaveisDoTemplate) => void
}

export function OrigensDoTemplate({ partes, variaveis, campos, onMudar }: Props) {
  const opcoes: OpcaoDeOrigem[] = [...ORIGENS_FIXAS, ...campos, { valor: ORIGEM_FIXO, rotulo: "Texto fixo" }]

  function grupo(titulo: string | null, lista: OrigemDaVariavel[], sufixo: string, mudar: (nova: OrigemDaVariavel[]) => void) {
    if (lista.length === 0) return null
    return (
      <div className="flex flex-col gap-2" key={titulo ?? "corpo"}>
        {titulo && <p className="text-xs font-medium text-muted-foreground">{titulo}</p>}
        {lista.map((v, i) => {
          const n = i + 1
          const nome = `variável {{${n}}}${sufixo}`
          const trocar = (mudanca: Partial<OrigemDaVariavel>) => mudar(lista.map((x, j) => (j === i ? { ...x, ...mudanca } : x)))
          return (
            <div key={i} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr] sm:items-center" data-testid={`origem-${n}${sufixo.replace(/\s+/g, "-")}`}>
              <span className="font-mono text-xs text-muted-foreground">{`{{${n}}}`}</span>
              <select
                aria-label={`Origem da ${nome}`}
                className={selectClass}
                value={v.origem}
                onChange={(e) => trocar({ origem: e.target.value, reserva: e.target.value === ORIGEM_FIXO ? undefined : (v.reserva ?? ""), fixo: e.target.value === ORIGEM_FIXO ? (v.fixo ?? "") : undefined })}
              >
                {opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                ))}
              </select>
              {v.origem === ORIGEM_FIXO ? (
                <Input
                  aria-label={`Texto fixo da ${nome}`}
                  placeholder="Texto que vai no lugar da variável"
                  value={v.fixo ?? ""}
                  onChange={(e) => trocar({ fixo: e.target.value })}
                />
              ) : (
                <Input
                  aria-label={`Texto reserva da ${nome}`}
                  placeholder="Reserva, se o contato não tiver (ex.: cliente)"
                  value={v.reserva ?? ""}
                  onChange={(e) => trocar({ reserva: e.target.value })}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const temAlguma =
    variaveis.corpo.length > 0 || variaveis.cabecalho.length > 0 || Object.keys(variaveis.botoes).length > 0
  if (!temAlguma) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <Label>De onde vem cada variável</Label>
      {grupo(variaveis.cabecalho.length > 0 || Object.keys(variaveis.botoes).length > 0 ? "Corpo" : null, variaveis.corpo, "", (nova) => onMudar({ ...variaveis, corpo: nova }))}
      {grupo("Cabeçalho", variaveis.cabecalho, " do cabeçalho", (nova) => onMudar({ ...variaveis, cabecalho: nova }))}
      {Object.entries(variaveis.botoes).map(([i, lista]) =>
        grupo(
          `Link do botão ${Number(i) + 1} (${partes.botoes[Number(i)]?.texto ?? ""})`,
          lista,
          ` do botão ${Number(i) + 1}`,
          (nova) => onMudar({ ...variaveis, botoes: { ...variaveis.botoes, [Number(i)]: nova } })
        )
      )}
    </div>
  )
}
