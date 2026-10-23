"use client"

// B13: confirmação de exclusão de contato. O mesmo diálogo serve o painel do
// card, a lista e o perfil do contato — excluir o card leva o contato junto.
// Só apresenta: quem chama decide o que fazer ao confirmar.

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"

/** "entrada", "recompra" ou o id do funil da empresa (B41-03). */
export type FunilDoCard = string

const NOME_FUNIL: Record<string, string> = {
  entrada: "Funil de Entrada",
  recompra: "Funil de Recompra",
}

/** Nome do funil para o aviso: os fixos pelo nome de sempre; os da empresa, pelo nome dado. */
export function nomeDoFunil(funil: FunilDoCard, nomes?: Record<string, string>): string {
  return NOME_FUNIL[funil] ?? nomes?.[funil] ?? "funil"
}

interface DialogoExcluirContatoProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  nome: string | null
  telefone: string
  /** Funis em que o contato tem card. */
  funis: FunilDoCard[]
  /** B41-03: nomes dos funis da empresa, pelo id. */
  nomesDosFunis?: Record<string, string>
  /** Funil do card de onde a exclusão partiu, quando vem do pipeline. */
  funilDeOrigem?: FunilDoCard
  conversas: number
  mensagens: number
  erro?: string | null
  excluindo?: boolean
  onConfirmar: () => void
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

export function DialogoExcluirContato({
  aberto,
  onAbertoChange,
  nome,
  telefone,
  funis,
  nomesDosFunis,
  funilDeOrigem,
  conversas,
  mensagens,
  erro,
  excluindo = false,
  onConfirmar,
}: DialogoExcluirContatoProps) {
  const outrosFunis = funilDeOrigem ? funis.filter((f) => f !== funilDeOrigem) : []

  const vaiJunto: string[] = []
  for (const f of funis) vaiJunto.push(`O card no ${nomeDoFunil(f, nomesDosFunis)}`)
  if (conversas > 0) {
    vaiJunto.push(
      `${plural(conversas, "conversa", "conversas")} do WhatsApp, com ${plural(mensagens, "mensagem", "mensagens")}`
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogPopup>
        <DialogTitle className="mb-1 break-words">Excluir {nome ?? telefone}?</DialogTitle>
        <DialogDescription className="mb-4">
          O contato vai para a lixeira e some de todas as telas. Fica lá por 30 dias e
          pode ser restaurado nesse prazo.
        </DialogDescription>

        {outrosFunis.length > 0 && (
          <p className="mb-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
            {outrosFunis.length === 1
              ? `O card no ${nomeDoFunil(outrosFunis[0], nomesDosFunis)} também vai para a lixeira.`
              : `Os cards em ${outrosFunis.map((f) => nomeDoFunil(f, nomesDosFunis)).join(", ")} também vão para a lixeira.`}
          </p>
        )}

        {vaiJunto.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium">Vai junto:</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {vaiJunto.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {erro && (
          <p className="mb-4 rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirmar} disabled={excluindo}>
            <Trash2 className="size-3.5" aria-hidden />
            {excluindo ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}
