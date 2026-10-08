"use client"

// Lista de escolha do editor de automações: o Select do Base UI
// (`@/components/ui/select`, gerado pelo shadcn) na forma que os campos do
// painel usam. O valor é texto, "" quando nada está escolhido, e o item vazio
// ("Qualquer etapa", "Escolha…") é opcional. Substitui o <select> nativo, cuja
// lista aberta o navegador desenha fora do tema do site.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface ItemSelecao {
  valor: string
  rotulo: string
  desabilitado?: boolean
}

interface CampoSelecaoProps {
  /** Vai no botão, para o <Label htmlFor> apontar para ele. */
  id?: string
  "aria-label"?: string
  valor: string
  itens: ItemSelecao[]
  /** Rótulo do item sem valor. Sem ele, a lista não tem como voltar a "nada escolhido". */
  vazio?: string
  desabilitado?: boolean
  className?: string
  onMudar: (valor: string) => void
}

export function CampoSelecao({
  id,
  "aria-label": rotuloAcessivel,
  valor,
  itens,
  vazio,
  desabilitado,
  className,
  onMudar,
}: CampoSelecaoProps) {
  // `items` deixa o botão mostrar o rótulo do escolhido, e não o valor cru
  const rotulos = [
    ...(vazio !== undefined ? [{ value: null, label: vazio }] : []),
    ...itens.map((item) => ({ value: item.valor, label: item.rotulo })),
  ]

  return (
    <Select
      items={rotulos}
      value={valor === "" ? null : valor}
      disabled={desabilitado}
      onValueChange={(novo) => onMudar((novo as string | null) ?? "")}
    >
      <SelectTrigger id={id} aria-label={rotuloAcessivel} className={cn("w-full", className)}>
        <SelectValue placeholder={vazio} />
      </SelectTrigger>
      {/* Abre embaixo do campo, em vez de cobri-lo; pelo menos da largura dele, e mais larga se um rótulo pedir */}
      <SelectContent alignItemWithTrigger={false} className="max-h-72 w-auto min-w-(--anchor-width)">
        {vazio !== undefined && (
          <SelectItem value={null} className="text-muted-foreground">
            {vazio}
          </SelectItem>
        )}
        {itens.map((item) => (
          <SelectItem key={item.valor} value={item.valor} disabled={item.desabilitado}>
            {item.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
