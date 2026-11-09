"use client"

// B60: enquanto um card é arrastado, aparece no rodapé uma faixa com as ações de
// fim de funil (Ganho, Perdido, Excluir lead), para não rolar o quadro até a ponta.
// Soltar numa etapa usa o mesmo mover do quadro. Soltar em "Excluir lead" não apaga
// direto: abre a mesma confirmação do "Excluir" do painel (lixeira de 30 dias), e o
// servidor decide se a pessoa pode.

import { useState } from "react"
import { CircleCheck, CircleX, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DialogoExcluirContato } from "../../contatos/components/dialogo-excluir-contato"
import { resumoExclusaoPorCard, excluirContatoPorCard, type ResumoExclusao } from "../../contatos/lixeira/actions"

type Tom = "sucesso" | "erro"

export interface ZonaDeEtapa {
  etapaId: string
  rotulo: string
  tom: Tom
}

interface ZonasDeAcaoRapidaProps {
  /** Card sendo arrastado agora; sem ele, a faixa some. */
  arrastando: boolean
  funil: "entrada" | "recompra"
  etapas: ZonaDeEtapa[]
  onMover: (cardId: string, deEtapa: string, paraEtapa: string) => void
  onExcluido: () => void
  onErro: (mensagem: string) => void
}

const ESTILO: Record<Tom | "excluir", { base: string; ativo: string }> = {
  sucesso: { base: "border-sucesso/50 text-sucesso", ativo: "bg-sucesso-fundo border-sucesso" },
  erro: { base: "border-aviso/60 text-aviso", ativo: "bg-muted border-aviso" },
  excluir: { base: "border-erro/50 text-erro", ativo: "bg-erro-fundo border-erro" },
}

function Zona({
  rotulo,
  tom,
  icone: Icone,
  onSoltar,
}: {
  rotulo: string
  tom: Tom | "excluir"
  icone: typeof Trash2
  onSoltar: (cardId: string, deEtapa: string) => void
}) {
  const [sobre, setSobre] = useState(false)
  return (
    <div
      role="region"
      aria-label={rotulo}
      data-zona={rotulo}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        setSobre(true)
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => {
        e.preventDefault()
        setSobre(false)
        const cardId = e.dataTransfer.getData("cardId")
        if (cardId) onSoltar(cardId, e.dataTransfer.getData("deEtapa"))
      }}
      className={cn(
        "flex h-16 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-card text-sm font-medium transition-colors sm:w-48 sm:flex-none",
        ESTILO[tom].base,
        sobre && ESTILO[tom].ativo
      )}
    >
      <Icone className="size-4 shrink-0" aria-hidden />
      {rotulo}
    </div>
  )
}

export function ZonasDeAcaoRapida({ arrastando, funil, etapas, onMover, onExcluido, onErro }: ZonasDeAcaoRapidaProps) {
  const [cardAExcluir, setCardAExcluir] = useState<string | null>(null)
  const [resumo, setResumo] = useState<ResumoExclusao | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  function pedirExclusao(cardId: string) {
    setErroExclusao(null)
    resumoExclusaoPorCard(cardId)
      .then((r) => {
        if ("erro" in r) {
          onErro(r.erro)
          return
        }
        setCardAExcluir(cardId)
        setResumo(r.resumo)
      })
      .catch(() => onErro("Não foi possível excluir. Tente de novo."))
  }

  function fecharDialogo() {
    setResumo(null)
    setCardAExcluir(null)
    setErroExclusao(null)
  }

  return (
    <>
      {arrastando && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
          <div className="pointer-events-auto flex w-full max-w-2xl gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:w-auto">
            {etapas.map((z) => (
              <Zona
                key={z.etapaId}
                rotulo={z.rotulo}
                tom={z.tom}
                icone={z.tom === "sucesso" ? CircleCheck : CircleX}
                onSoltar={(cardId, deEtapa) => {
                  if (deEtapa !== z.etapaId) onMover(cardId, deEtapa, z.etapaId)
                }}
              />
            ))}
            <Zona rotulo="Excluir lead" tom="excluir" icone={Trash2} onSoltar={(cardId) => pedirExclusao(cardId)} />
          </div>
        </div>
      )}

      {resumo && cardAExcluir && (
        <DialogoExcluirContato
          aberto
          onAbertoChange={(aberto) => { if (!aberto) fecharDialogo() }}
          nome={resumo.nome}
          telefone={resumo.telefone}
          funis={resumo.funis}
          nomesDosFunis={resumo.nomesDosFunis}
          funilDeOrigem={funil}
          conversas={resumo.conversas}
          mensagens={resumo.mensagens}
          erro={erroExclusao}
          excluindo={excluindo}
          onConfirmar={() => {
            setExcluindo(true)
            setErroExclusao(null)
            excluirContatoPorCard(cardAExcluir)
              .then((r) => {
                if ("erro" in r) { setErroExclusao(r.erro); return }
                fecharDialogo()
                onExcluido()
              })
              .catch(() => setErroExclusao("Não foi possível excluir. Tente de novo."))
              .finally(() => setExcluindo(false))
          }}
        />
      )}
    </>
  )
}
