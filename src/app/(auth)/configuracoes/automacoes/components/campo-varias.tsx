// B43-02: lista de caixas de marcar, para escolher várias opções (ex.: os perfis RFV
// da condição). O valor é a lista de ids separados por vírgula, na ordem das opções.

import { itensDaLista } from "@/lib/fluxo-automacao"
import type { Opcao } from "./catalogo"

export function CampoVarias({
  rotulo,
  valor,
  opcoes,
  onMudar,
}: {
  rotulo: string
  valor: string
  opcoes: Opcao[]
  onMudar: (valor: string) => void
}) {
  const marcados = new Set(itensDaLista(valor))
  function alternar(id: string, marcar: boolean) {
    const novos = new Set(marcados)
    if (marcar) novos.add(id)
    else novos.delete(id)
    onMudar(opcoes.filter((o) => novos.has(o.id)).map((o) => o.id).join(","))
  }
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="sr-only">{rotulo}</legend>
      {opcoes.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-primary"
            checked={marcados.has(o.id)}
            onChange={(e) => alternar(o.id, e.target.checked)}
          />
          {o.nome}
        </label>
      ))}
    </fieldset>
  )
}
