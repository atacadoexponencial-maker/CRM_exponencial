"use client"

// Página do produto na vitrine. Só desenha: o estoque e as ações chegam por props.

import { useState } from "react"
import { ArrowLeft, Check, ImageOff, Minus, Plus, X } from "lucide-react"
import { formatarPreco } from "@/app/(auth)/catalogo/components/lista-produtos"
import { chaveCombinacao, combinacoes } from "@/lib/catalogo/combinacoes"
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
  quantidadeNoCarrinho: number
  /** Quantas peças desta combinação já estão no carrinho (limita o que dá para somar). */
  noCarrinho: (combinacao: string) => number
  onAdicionar: (combinacao: string, quantidade: number) => void
  onVoltar: () => void
  onAbrirCarrinho: () => void
}

export function PaginaProduto({ tema, produto, quantidadeNoCarrinho, noCarrinho, onAdicionar, onVoltar, onAbrirCarrinho }: PaginaProdutoProps) {
  const cores = coresDaVitrine(tema)
  const tipos = produto.tipos.filter((t) => t.opcoes.length > 0)
  const [escolhas, setEscolhas] = useState<(string | null)[]>(tipos.map(() => null))
  const [quantidade, setQuantidade] = useState(1)
  const [fotoAtiva, setFotoAtiva] = useState(0)
  const [ampliada, setAmpliada] = useState(false)
  const [adicionado, setAdicionado] = useState(false)

  const estoqueDe = (opcoes: string[]) => produto.estoque[chaveCombinacao(opcoes)] ?? 0
  const todas = combinacoes(tipos)
  const escolhaCompleta = escolhas.every((e) => e !== null)
  const combinacao = escolhaCompleta ? chaveCombinacao(escolhas as string[]) : null
  const disponivel = combinacao !== null ? Math.max(0, estoqueDe(escolhas as string[]) - noCarrinho(combinacao)) : 0
  const esgotado = todas.every((c) => estoqueDe(c) === 0)

  /** Opção sem estoque em nenhuma combinação compatível com as outras escolhas. */
  function opcaoIndisponivel(indice: number, opcao: string): boolean {
    return !todas.some((c) => c[indice] === opcao && escolhas.every((e, i) => i === indice || e === null || c[i] === e) && estoqueDe(c) > 0)
  }

  function escolher(indice: number, opcao: string) {
    setEscolhas((atual) => atual.map((e, i) => (i === indice ? (e === opcao ? null : opcao) : e)))
    setQuantidade(1)
    setAdicionado(false)
  }

  function adicionar() {
    if (combinacao === null || disponivel === 0) return
    onAdicionar(combinacao, Math.min(quantidade, disponivel))
    setAdicionado(true)
    setQuantidade(1)
  }

  const fotos = produto.fotos

  return (
    <div className="@container min-h-full [&_:is(h1,h2,h3)]:[font-family:inherit]" style={{ background: cores.fundo, color: cores.texto, fontFamily: familiaDaFonte(tema.fonteId) }}>
      <CabecalhoLoja tema={tema} quantidadeNoCarrinho={quantidadeNoCarrinho} onAbrirCarrinho={onAbrirCarrinho} onAbrirLoja={onVoltar} />

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
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

            {tipos.map((tipo, indice) => (
              <div key={tipo.id} className="space-y-2">
                <p className="text-sm font-medium">
                  {tipo.nome}
                  {escolhas[indice] && <span style={{ color: cores.suave }}>: {escolhas[indice]}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tipo.opcoes.map((opcao) => {
                    const indisponivel = opcaoIndisponivel(indice, opcao)
                    const ativa = escolhas[indice] === opcao
                    return (
                      <button
                        key={opcao}
                        type="button"
                        disabled={indisponivel}
                        onClick={() => escolher(indice, opcao)}
                        className={`min-w-11 h-10 px-3 rounded-lg border text-sm ${indisponivel ? "line-through opacity-40 cursor-not-allowed" : ""}`}
                        style={ativa ? { background: cores.principal, color: cores.sobrePrincipal, borderColor: cores.principal } : { borderColor: cores.borda }}
                        aria-pressed={ativa}
                        aria-label={indisponivel ? `${opcao} (indisponível)` : opcao}
                      >
                        {opcao}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {esgotado ? (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: cores.superficie }}>Produto esgotado no momento.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border" style={{ borderColor: cores.borda }}>
                    <button type="button" onClick={() => setQuantidade((q) => Math.max(1, q - 1))} className="size-10 flex items-center justify-center" aria-label="Diminuir quantidade"><Minus className="size-4" /></button>
                    <span className="w-10 text-center tabular-nums" aria-live="polite">{quantidade}</span>
                    <button
                      type="button"
                      onClick={() => setQuantidade((q) => Math.min(Math.max(1, disponivel), q + 1))}
                      disabled={combinacao !== null && quantidade >= disponivel}
                      className="size-10 flex items-center justify-center disabled:opacity-30"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {combinacao !== null && (
                    <span className="text-xs" style={{ color: cores.suave }}>
                      {disponivel > 0 ? `${disponivel} disponíveis` : "Você já tem todas as peças disponíveis no carrinho"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={adicionar}
                  disabled={combinacao === null || disponivel === 0}
                  className="w-full h-12 rounded-full font-semibold disabled:opacity-40"
                  style={{ background: cores.principal, color: cores.sobrePrincipal }}
                >
                  {combinacao === null ? `Escolha ${tipos.filter((_, i) => escolhas[i] === null).map((t) => t.nome.toLowerCase()).join(" e ")}` : "Adicionar ao carrinho"}
                </button>
                {adicionado && (
                  <p className="flex items-center justify-center gap-1.5 text-sm" role="status">
                    <Check className="size-4" style={{ color: cores.principal }} />
                    Adicionado.{" "}
                    <button type="button" onClick={onAbrirCarrinho} className="underline">Ver carrinho</button>
                  </p>
                )}
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
