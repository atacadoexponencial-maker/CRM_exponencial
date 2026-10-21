"use client"

// Contador de pacotes da grade fechada (B31-03), na página do produto: um bloco por cor
// (ou um só, quando há um tipo de variação), e a cliente escolhe quantas grades leva.
// Só desenha: quem calcula o estoque é a página; o servidor confere de novo.

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import type { BlocoGrade } from "@/lib/catalogo/grade"
import { detalheDaGrade, pacotesQueCabem, pecasDaGrade, type GradeFechada } from "@/lib/catalogo/regras-de-venda"
import type { coresDaVitrine } from "./tema"

interface ContadorDeGradesProps {
  cores: ReturnType<typeof coresDaVitrine>
  grade: GradeFechada
  blocos: BlocoGrade[]
  /** Pacotes escolhidos por bloco (chave: `bloco.nome`, "" quando há um bloco só). */
  pacotes: Record<string, number>
  /** Quanto ainda dá para escolher da combinação: estoque menos o que já está no carrinho. */
  disponivel: (combinacao: string) => number
  onMudar: (bloco: string, pacotes: number) => void
}

export function ContadorDeGrades({ cores, grade, blocos, pacotes, disponivel, onMudar }: ContadorDeGradesProps) {
  const [anuncio, setAnuncio] = useState("")
  const porPacote = pecasDaGrade(grade)
  const detalhe = detalheDaGrade(grade)

  function mudar(bloco: BlocoGrade, n: number) {
    onMudar(bloco.nome, n)
    setAnuncio(`${bloco.titulo}: ${n} ${n === 1 ? "grade" : "grades"}`)
  }

  return (
    <div className="grid gap-3">
      <p className="sr-only" aria-live="polite">{anuncio}</p>
      <p className="text-sm" style={{ color: cores.suave }}>Cada grade tem {porPacote} {porPacote === 1 ? "peça" : "peças"}: {detalhe}</p>
      {blocos.map((bloco) => {
        const combinacaoDa = (opcao: string) => bloco.linhas.find((l) => l.rotulo === opcao)?.combinacao ?? ""
        const cabem = pacotesQueCabem(grade, (opcao) => disponivel(combinacaoDa(opcao)))
        const n = pacotes[bloco.nome] ?? 0
        if (cabem === 0) {
          return (
            <p key={bloco.titulo} className="rounded-xl border px-3 py-3 text-sm" style={{ borderColor: cores.borda, color: cores.suave }}>
              <span className="line-through">{bloco.titulo}</span> · indisponível (não há estoque para uma grade inteira)
            </p>
          )
        }
        return (
          <section key={bloco.titulo} className="rounded-xl border px-3 py-2 flex items-center gap-2" style={{ borderColor: cores.borda }} aria-label={bloco.titulo}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{bloco.titulo}</p>
              <p className="text-xs" style={{ color: cores.suave }}>
                {n > 0 ? `${n} ${n === 1 ? "grade" : "grades"} · ${n * porPacote} peças` : `até ${cabem} ${cabem === 1 ? "grade" : "grades"}`}
              </p>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => mudar(bloco, Math.max(0, n - 1))}
                disabled={n === 0}
                className="size-11 flex items-center justify-center rounded-full disabled:opacity-30"
                aria-label={`Menos uma grade de ${bloco.nome || bloco.titulo}`}
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center text-base tabular-nums" aria-label={`Grades de ${bloco.nome || bloco.titulo}`}>{n}</span>
              <button
                type="button"
                onClick={() => mudar(bloco, Math.min(cabem, n + 1))}
                disabled={n >= cabem}
                className="size-11 flex items-center justify-center rounded-full disabled:opacity-30"
                aria-label={`Mais uma grade de ${bloco.nome || bloco.titulo}`}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
