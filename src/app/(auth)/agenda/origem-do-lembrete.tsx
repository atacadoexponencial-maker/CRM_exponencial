// De onde veio cada item da Agenda: o ícone e o nome, iguais na Minha Agenda e
// na Agenda da equipe. O lembrete de automação (B28-01) diz de qual regra veio.

import { Bell, ListChecks, Zap } from "lucide-react"
import type { ItemAgenda } from "./actions"

export function rotuloDaOrigem(item: Pick<ItemAgenda, "origem" | "automacaoNome">): string {
  if (item.origem === "automacao") return "Lembrete de automação"
  return item.origem === "sequencia" ? "Lembrete de sequência" : "Follow-up avulso"
}

export function IconeDaOrigem({ item }: { item: Pick<ItemAgenda, "origem" | "automacaoNome"> }) {
  const Icone = item.origem === "automacao" ? Zap : item.origem === "sequencia" ? ListChecks : Bell
  return (
    <span className="mt-0.5 shrink-0 text-muted-foreground" title={rotuloDaOrigem(item)}>
      <Icone className="size-4" aria-label={rotuloDaOrigem(item)} />
    </span>
  )
}

/** "Automação: <regra>", embaixo do texto do lembrete de automação. */
export function RegraDoLembrete({ item }: { item: Pick<ItemAgenda, "origem" | "automacaoNome"> }) {
  if (item.origem !== "automacao") return null
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      {rotuloDaOrigem(item)}
      {item.automacaoNome ? `: ${item.automacaoNome}` : ""}
    </p>
  )
}
