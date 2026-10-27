"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { avisoDeSemReserva, inserirNoCursor } from "@/lib/variaveis-mensagem"

// B38-05: texto com variáveis (mensagem e lembrete das automações, campanha e mensagem
// rápida). Cada botão pede o texto reserva antes de inserir `{{chave|reserva}}` onde
// está o cursor; sem reserva, não insere. Variável escrita à mão sem reserva fica
// apontada embaixo do texto.
//
// B46-07: quem clica no botão e sai da caixa do reserva sem "Inserir" (por exemplo,
// direto no Salvar) não perde a variável: ela entra com o reserva digitado, ou
// "cliente". Só o Cancelar e o Esc desistem.

export type VariavelDoBotao = { chave: string; rotulo: string }

/** Reserva de quem saiu da caixa sem escrever um (B46-07). */
export const RESERVA_PADRAO = "cliente"

const CLASSE_TEXTO =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

interface Props {
  id: string
  valor: string
  placeholder?: string
  variaveis: VariavelDoBotao[]
  onMudar: (valor: string) => void
  className?: string
  /** Linhas da caixa de texto. */
  rows?: number
}

export function TextoComVariaveis({ id, valor, placeholder, variaveis, onMudar, className, rows }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  // A seleção de quando o botão foi clicado: o pedido do reserva tira o foco do texto
  const selecao = useRef({ inicio: valor.length, fim: valor.length })
  const [pedindo, setPedindo] = useState<VariavelDoBotao | null>(null)
  const [reserva, setReserva] = useState("")
  const aviso = avisoDeSemReserva(valor)

  function abrir(variavel: VariavelDoBotao) {
    const campo = ref.current
    selecao.current = { inicio: campo?.selectionStart ?? valor.length, fim: campo?.selectionEnd ?? valor.length }
    setReserva("")
    setPedindo(variavel)
  }

  function inserir(padrao?: string, focar = true) {
    // O reserva não pode ter chave nem barra: fecharia a variável antes da hora
    const limpo = reserva.replace(/[{}|]/g, "").trim() || padrao
    if (!pedindo || !limpo) return
    const { texto, cursor } = inserirNoCursor(valor, selecao.current.inicio, selecao.current.fim, `{{${pedindo.chave}|${limpo}}}`)
    onMudar(texto)
    setPedindo(null)
    if (!focar) return
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(cursor, cursor)
    })
  }

  // B46-07: o foco saiu da caixa do reserva para fora dela (Salvar, outro campo)
  function aoSairDaCaixa(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    inserir(RESERVA_PADRAO, false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={cn(CLASSE_TEXTO, className)}
        value={valor}
        placeholder={placeholder}
        aria-invalid={aviso ? true : undefined}
        onChange={(e) => onMudar(e.target.value)}
      />
      {aviso && <p className="text-xs text-erro">{aviso}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Inserir:</span>
        {variaveis.map((v) => (
          <Button key={v.chave} type="button" variant="outline" size="xs" title={`{{${v.chave}}}`} onClick={() => abrir(v)}>
            <Plus />
            {v.rotulo}
          </Button>
        ))}
      </div>
      {pedindo && (
        <div role="group" aria-label={`Texto reserva de ${pedindo.rotulo}`} className="flex flex-col gap-1.5 rounded-md border p-2" onBlur={aoSairDaCaixa}>
          <label htmlFor={`${id}-reserva`} className="text-xs text-muted-foreground">
            Texto reserva de &quot;{pedindo.rotulo}&quot;: vai no lugar quando o contato não tiver o dado
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              id={`${id}-reserva`}
              autoFocus
              value={reserva}
              placeholder="Ex.: cliente"
              onChange={(e) => setReserva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  inserir()
                }
                if (e.key === "Escape") setPedindo(null)
              }}
              className="max-w-56"
            />
            <Button type="button" size="xs" disabled={!reserva.replace(/[{}|]/g, "").trim()} onClick={() => inserir()}>
              Inserir
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={() => setPedindo(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
