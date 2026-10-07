"use client"

// Grade de quantidades da página do produto (B17). Só desenha: quantidades, estoque e
// limites chegam por props; quem limita o valor é `limitarQuantidade`.

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { limitarQuantidade, type BlocoGrade } from "@/lib/catalogo/grade"
import type { coresDaVitrine } from "./tema"

/** A partir de quantas peças restantes a linha avisa "N disponíveis". */
const POUCAS_PECAS = 5

interface GradeQuantidadesProps {
  cores: ReturnType<typeof coresDaVitrine>
  blocos: BlocoGrade[]
  quantidades: Record<string, number>
  /** Estoque da combinação. */
  estoque: (combinacao: string) => number
  /** Quanto ainda dá para escolher: estoque menos o que já está no carrinho. */
  disponivel: (combinacao: string) => number
  onMudar: (combinacao: string, quantidade: number) => void
}

function pecas(n: number) {
  return `${n} ${n === 1 ? "peça" : "peças"}`
}

export function GradeQuantidades({ cores, blocos, quantidades, estoque, disponivel, onMudar }: GradeQuantidadesProps) {
  // Leitor de tela: anuncia a linha que mudou (ex.: "Areia, M: 2").
  const [anuncio, setAnuncio] = useState("")
  function mudar(combinacao: string, nome: string, quantidade: number) {
    onMudar(combinacao, quantidade)
    setAnuncio(`${nome}: ${quantidade}`)
  }

  return (
    <div className="grid gap-3">
      <p className="sr-only" aria-live="polite">{anuncio}</p>
      {blocos.map((bloco) => {
        const esgotado = bloco.linhas.every((l) => estoque(l.combinacao) === 0)
        const noBloco = bloco.linhas.reduce((s, l) => s + (quantidades[l.combinacao] ?? 0), 0)
        if (esgotado) {
          return (
            <p key={bloco.titulo} className="rounded-xl border px-3 py-3 text-sm" style={{ borderColor: cores.borda, color: cores.suave }}>
              <span className="line-through">{bloco.titulo}</span> · esgotado
            </p>
          )
        }
        return (
          <section key={bloco.titulo} className="rounded-xl border" style={{ borderColor: cores.borda }} aria-label={bloco.titulo}>
            <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-1">
              <h2 className="text-sm font-semibold">{bloco.titulo}</h2>
              {noBloco > 0 && <span className="text-xs font-medium" style={{ color: cores.principal }}>{pecas(noBloco)}</span>}
            </header>
            <ul className="divide-y" style={{ borderColor: cores.borda }}>
              {bloco.linhas.map((linha) => {
                const total = estoque(linha.combinacao)
                const livre = disponivel(linha.combinacao)
                const qtd = quantidades[linha.combinacao] ?? 0
                const travada = livre === 0
                const nome = bloco.nome ? `${bloco.nome}, ${linha.rotulo}` : linha.rotulo
                const aviso = total === 0 ? "esgotado" : livre === 0 ? "todas já no carrinho" : livre <= POUCAS_PECAS ? `${livre} ${livre === 1 ? "disponível" : "disponíveis"}` : null
                return (
                  <li key={linha.combinacao} className="flex items-center gap-2 pl-3 pr-1 py-1" style={{ borderColor: cores.borda }}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${total === 0 ? "line-through" : ""}`} style={total === 0 ? { color: cores.suave } : undefined}>{linha.rotulo}</p>
                      {aviso && <p className="text-xs" style={{ color: cores.suave }}>{aviso}</p>}
                    </div>
                    <div className="flex items-center" style={travada ? { opacity: 0.4 } : undefined}>
                      <button
                        type="button"
                        onClick={() => mudar(linha.combinacao, nome, limitarQuantidade(qtd - 1, livre))}
                        disabled={travada || qtd === 0}
                        className="size-11 flex items-center justify-center rounded-full disabled:opacity-30"
                        aria-label={`Diminuir ${nome}`}
                      >
                        <Minus className="size-4" />
                      </button>
                      <input
                        value={qtd === 0 ? "" : String(qtd)}
                        placeholder="0"
                        onChange={(e) => mudar(linha.combinacao, nome, limitarQuantidade(e.target.value, livre))}
                        onFocus={(e) => e.target.select()}
                        disabled={travada}
                        inputMode="numeric"
                        className="w-12 h-11 rounded-lg border text-center text-base tabular-nums outline-none focus-visible:ring-2"
                        style={{ background: cores.superficie, borderColor: qtd > 0 ? cores.principal : cores.borda, color: cores.texto, ["--tw-ring-color" as string]: cores.principal }}
                        aria-label={travada ? `${nome} (indisponível)` : `Quantidade de ${nome}`}
                      />
                      <button
                        type="button"
                        onClick={() => mudar(linha.combinacao, nome, limitarQuantidade(qtd + 1, livre))}
                        disabled={travada || qtd >= livre}
                        className="size-11 flex items-center justify-center rounded-full disabled:opacity-30"
                        aria-label={`Aumentar ${nome}`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
