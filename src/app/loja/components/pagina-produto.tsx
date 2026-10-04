"use client"

// Página do produto na vitrine. Só desenha: o estoque e as ações chegam por props.
// Produto com variação compra por grade (B17): todas as combinações de uma vez.

import { useState } from "react"
import { ArrowLeft, Check, ImageOff, Minus, Plus, X } from "lucide-react"
import { formatarPreco } from "@/app/(auth)/catalogo/components/lista-produtos"
import { chaveCombinacao, combinacoes } from "@/lib/catalogo/combinacoes"
import { blocosDaGrade, limitarQuantidade, totaisDaGrade } from "@/lib/catalogo/grade"
import { GradeQuantidades } from "./grade-quantidades"
import { coresDaVitrine, type TemaLoja } from "./tema"
import { familiaDaFonte } from "./fontes"
import { CabecalhoLoja } from "./vitrine"

export interface ProdutoDetalhe {
  id: string
  nome: string
  descricao: string
  preco: number
  precoDe: number | null
  fotos: string[]
  tipos: { id: string; nome: string; opcoes: string[] }[]
  /** Estoque por combinação (chave de `chaveCombinacao`). */
  estoque: Record<string, number>
}

interface PaginaProdutoProps {
  tema: TemaLoja
  produto: ProdutoDetalhe
  quantidadeNoCarrinho?: number
  /** Quantas peças desta combinação já estão no carrinho (limita o que dá para somar). */
  noCarrinho?: (combinacao: string) => number
  /** Texto do pedido mínimo da loja (ex.: "Pedido mínimo: 6 peças"); `null` quando não há. */
  avisoMinimo?: string | null
  /** Sem esta função, a página só mostra o produto (sem quantidade nem botão). */
  onAdicionar?: (itens: { combinacao: string; quantidade: number }[]) => void
  onVoltar: () => void
  onAbrirCarrinho?: () => void
}

export function PaginaProduto({ tema, produto, quantidadeNoCarrinho = 0, noCarrinho = () => 0, avisoMinimo = null, onAdicionar, onVoltar, onAbrirCarrinho }: PaginaProdutoProps) {
  const cores = coresDaVitrine(tema)
  const tipos = produto.tipos.filter((t) => t.opcoes.length > 0)
  const semVariacao = tipos.length === 0
  const blocos = blocosDaGrade(tipos)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [quantidadeUnica, setQuantidadeUnica] = useState(1)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [ampliada, setAmpliada] = useState(false)
  const [adicionadas, setAdicionadas] = useState<number | null>(null)

  const estoqueDe = (combinacao: string) => produto.estoque[combinacao] ?? 0
  const disponivelDe = (combinacao: string) => Math.max(0, estoqueDe(combinacao) - noCarrinho(combinacao))
  const esgotado = combinacoes(tipos).every((c) => estoqueDe(chaveCombinacao(c)) === 0)
  const livreUnica = disponivelDe("")
  const escolhidas: Record<string, number> = semVariacao ? (livreUnica > 0 ? { "": Math.min(quantidadeUnica, livreUnica) } : {}) : quantidades
  const { pecas, valor } = totaisDaGrade(escolhidas, produto.preco)

  function mudar(combinacao: string, quantidade: number) {
    setQuantidades((atual) => ({ ...atual, [combinacao]: quantidade }))
    setAdicionadas(null)
  }

  function adicionar() {
    const itens = Object.entries(escolhidas)
      .filter(([, q]) => q > 0)
      .map(([combinacao, quantidade]) => ({ combinacao, quantidade }))
    if (itens.length === 0 || !onAdicionar) return
    onAdicionar(itens)
    setAdicionadas(pecas)
    setQuantidades({})
    setQuantidadeUnica(1)
  }

  const fotos = produto.fotos

  return (
    <div className="@container min-h-full [&_:is(h1,h2,h3)]:[font-family:inherit]" style={{ background: cores.fundo, color: cores.texto, fontFamily: familiaDaFonte(tema.fonteId) }}>
      <CabecalhoLoja tema={tema} quantidadeNoCarrinho={quantidadeNoCarrinho} onAbrirCarrinho={onAbrirCarrinho} onAbrirLoja={onVoltar} />

      <div className={`max-w-5xl mx-auto px-4 py-4 space-y-4 ${onAdicionar && !esgotado ? "pb-24 @3xl:pb-4" : ""}`}>
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 text-sm" style={{ color: cores.suave }}>
          <ArrowLeft className="size-4" />
          Voltar
        </button>

        <div className="grid gap-6 @3xl:grid-cols-2">
          <div className="space-y-2">
            {fotos.length > 0 ? (
              <div className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl @3xl:block" style={{ background: cores.superficie }}>
                {fotos.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => { setFotoAtiva(i); setAmpliada(true) }}
                    className={`w-full shrink-0 snap-center aspect-square ${i === fotoAtiva ? "" : "@3xl:hidden"}`}
                    aria-label={`Ampliar foto ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${produto.nome}, foto ${i + 1}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="aspect-square rounded-2xl flex items-center justify-center" style={{ background: cores.superficie, color: cores.suave }}>
                <ImageOff className="size-8" />
              </div>
            )}
            {fotos.length > 1 && (
              <div className="hidden @3xl:flex gap-2">
                {fotos.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setFotoAtiva(i)}
                    className="size-16 rounded-lg overflow-hidden border-2"
                    style={{ borderColor: i === fotoAtiva ? cores.principal : "transparent" }}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {fotos.length > 1 && <p className="text-xs text-center @3xl:hidden" style={{ color: cores.suave }}>Deslize para ver as {fotos.length} fotos</p>}
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold leading-tight">{produto.nome}</h1>
              <p className="flex items-baseline gap-2">
                <span className="text-xl font-semibold" style={{ color: cores.principal }}>{formatarPreco(produto.preco)}</span>
                {produto.precoDe && <span className="text-sm line-through" style={{ color: cores.suave }}>{formatarPreco(produto.precoDe)}</span>}
              </p>
            </div>

            {esgotado ? (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: cores.superficie }}>Produto esgotado no momento.</p>
            ) : !onAdicionar ? null : (
              <div className="space-y-3">
                {avisoMinimo && <p className="text-xs font-medium" style={{ color: cores.principal }}>{avisoMinimo.replace("Pedido mínimo:", "Pedido mínimo da loja:")}</p>}
                {semVariacao ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border" style={{ borderColor: cores.borda }}>
                      <button type="button" onClick={() => { setQuantidadeUnica((q) => Math.max(1, q - 1)); setAdicionadas(null) }} disabled={quantidadeUnica <= 1} className="size-11 flex items-center justify-center disabled:opacity-30" aria-label="Diminuir quantidade"><Minus className="size-4" /></button>
                      <input
                        value={String(Math.min(quantidadeUnica, Math.max(1, livreUnica)))}
                        onChange={(e) => { setQuantidadeUnica(Math.max(1, limitarQuantidade(e.target.value, livreUnica))); setAdicionadas(null) }}
                        onFocus={(e) => e.target.select()}
                        disabled={livreUnica === 0}
                        inputMode="numeric"
                        className="w-12 h-11 bg-transparent text-center text-base tabular-nums outline-none"
                        aria-label="Quantidade"
                      />
                      <button
                        type="button"
                        onClick={() => { setQuantidadeUnica((q) => Math.min(Math.max(1, livreUnica), q + 1)); setAdicionadas(null) }}
                        disabled={quantidadeUnica >= livreUnica}
                        className="size-11 flex items-center justify-center disabled:opacity-30"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <span className="text-xs" style={{ color: cores.suave }}>
                      {livreUnica > 0 ? `${livreUnica} ${livreUnica === 1 ? "disponível" : "disponíveis"}` : "Você já tem todas as peças disponíveis no carrinho"}
                    </span>
                  </div>
                ) : (
                  <GradeQuantidades cores={cores} blocos={blocos} quantidades={quantidades} estoque={estoqueDe} disponivel={disponivelDe} onMudar={mudar} />
                )}
                {adicionadas !== null && (
                  <p className="flex items-center justify-center gap-1.5 text-sm" role="status">
                    <Check className="size-4" style={{ color: cores.principal }} />
                    {adicionadas} {adicionadas === 1 ? "peça adicionada" : "peças adicionadas"}.{" "}
                    <button type="button" onClick={onAbrirCarrinho} className="underline min-h-11">Ver carrinho</button>
                  </p>
                )}
                <div className="fixed inset-x-0 bottom-0 z-20 border-t p-3 @3xl:static @3xl:border-0 @3xl:p-0" style={{ background: cores.fundo, borderColor: cores.borda }}>
                  <button
                    type="button"
                    onClick={adicionar}
                    disabled={pecas === 0}
                    className="w-full h-12 rounded-full font-semibold disabled:opacity-40"
                    style={{ background: cores.principal, color: cores.sobrePrincipal }}
                    aria-live="polite"
                  >
                    {pecas === 0 ? "Escolha as quantidades" : `Adicionar ${pecas} ${pecas === 1 ? "peça" : "peças"} · ${formatarPreco(valor)}`}
                  </button>
                </div>
              </div>
            )}

            {produto.descricao && <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: cores.suave }}>{produto.descricao}</p>}
          </div>
        </div>
      </div>

      {ampliada && fotos[fotoAtiva] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setAmpliada(false)} role="dialog" aria-label="Foto ampliada">
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Fechar foto"><X className="size-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotos[fotoAtiva]} alt={produto.nome} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  )
}
