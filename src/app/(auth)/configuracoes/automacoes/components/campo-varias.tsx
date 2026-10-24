// B43-02: lista de caixas de marcar, para escolher várias opções (ex.: os perfis RFV
// da condição). O valor é a lista de ids separados por vírgula, na ordem das opções.
// B43-03: `desabilitadas` não dá para marcar (a origem do gatilho que já é destino).

import { itensDaLista } from "@/lib/fluxo-automacao"
import { cn } from "@/lib/utils"
import type { Opcao } from "./catalogo"

export function CampoVarias({
  rotulo,
  valor,
  opcoes,
  desabilitadas = [],
  onMudar,
}: {
  rotulo: string
  valor: string
  opcoes: Opcao[]
  desabilitadas?: string[]
  onMudar: (valor: string) => void
}) {
  const marcados = new Set(itensDaLista(valor).filter((id) => !desabilitadas.includes(id)))
  function alternar(id: string, marcar: boolean) {
    const novos = new Set(marcados)
    if (marcar) novos.add(id)
    else novos.delete(id)
    onMudar(opcoes.filter((o) => novos.has(o.id)).map((o) => o.id).join(","))
  }
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="sr-only">{rotulo}</legend>
      {opcoes.map((o) => {
        const desabilitada = desabilitadas.includes(o.id)
        return (
          <label key={o.id} className={cn("flex items-center gap-2 text-xs", desabilitada && "opacity-50")}>
            <input
              type="checkbox"
              className="accent-primary"
              checked={marcados.has(o.id)}
              disabled={desabilitada}
              onChange={(e) => alternar(o.id, e.target.checked)}
            />
            {o.nome}
          </label>
        )
      })}
    </fieldset>
  )
}
