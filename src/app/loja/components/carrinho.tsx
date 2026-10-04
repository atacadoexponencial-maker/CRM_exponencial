"use client"

// Gaveta do carrinho da vitrine. Só desenha e coleta nome e WhatsApp; quem registra o
// pedido é quem passa `onFazerPedido` (o protótipo finge; a B16-09 chama o servidor).

import { useState } from "react"
import { CheckCircle2, ImageOff, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react"
import { formatarPreco } from "@/app/(auth)/catalogo/components/lista-produtos"
import { coresDaVitrine, type TemaLoja } from "./tema"
import { familiaDaFonte } from "./fontes"
import { faltaParaMinimo, normalizarWhatsapp, totaisDoPedido, type MinimoPedido } from "./pedido"

export interface LinhaCarrinho {
  produtoId: string
  combinacao: string
  nome: string
  fotoUrl: string | null
  preco: number
  quantidade: number
  /** Estoque disponível da combinação. */
  maximo: number
}

export type ResultadoPedido = { erro: string } | { numero: number | string; mensagem: string; link: string }

interface CarrinhoProps {
  tema: TemaLoja
  aberto: boolean
  linhas: LinhaCarrinho[]
  minimo: MinimoPedido
  onFechar: () => void
  onMudarQuantidade: (produtoId: string, combinacao: string, quantidade: number) => void
  onRemover: (produtoId: string, combinacao: string) => void
  onFazerPedido: (cliente: { nome: string; whatsapp: string }) => Promise<ResultadoPedido>
  /** Chamado depois que o pedido deu certo (para esvaziar o carrinho). */
  onPedidoFeito: () => void
}

export function Carrinho({ tema, aberto, linhas, minimo, onFechar, onMudarQuantidade, onRemover, onFazerPedido, onPedidoFeito }: CarrinhoProps) {
  const cores = coresDaVitrine(tema)
  const [nome, setNome] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [erros, setErros] = useState<{ nome?: string; whatsapp?: string; geral?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState<{ numero: number | string; mensagem: string; link: string } | null>(null)

  const itens = linhas.map((l) => ({ nome: l.nome, variacao: l.combinacao, quantidade: l.quantidade, precoUnitario: l.preco }))
  const { pecas, valor } = totaisDoPedido(itens)
  const falta = faltaParaMinimo(itens, minimo)
  const progresso =
    minimo.tipo === "nenhum" || !minimo.valor ? 1 : Math.min(1, (minimo.tipo === "pecas" ? pecas : valor) / minimo.valor)

  async function fazerPedido() {
    const novos: typeof erros = {}
    if (!nome.trim()) novos.nome = "Informe seu nome."
    const numero = normalizarWhatsapp(whatsapp)
    if (!numero) novos.whatsapp = "Informe o WhatsApp com DDD, ex.: (21) 99999-0000."
    setErros(novos)
    if (Object.keys(novos).length > 0 || falta) return
    setEnviando(true)
    const r = await onFazerPedido({ nome: nome.trim(), whatsapp: numero! })
    setEnviando(false)
    if ("erro" in r) {
      setErros({ geral: r.erro })
      return
    }
    setFeito(r)
    onPedidoFeito()
    window.open(r.link, "_blank", "noopener")
  }

  if (!aberto) return null

  const campo = "w-full h-11 rounded-xl border px-3 text-base outline-none"

  return (
    <div className="fixed inset-0 z-40 [&_:is(h1,h2,h3)]:[font-family:inherit]" style={{ fontFamily: familiaDaFonte(tema.fonteId) }}>
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onFechar} aria-label="Fechar carrinho" />
      <aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: cores.fundo, color: cores.texto }}
        role="dialog"
        aria-label="Carrinho"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: cores.borda }}>
          <h2 className="text-lg font-semibold">{feito ? "Pedido enviado" : "Seu carrinho"}</h2>
          <button type="button" onClick={onFechar} className="rounded-full p-2" style={{ background: cores.superficie }} aria-label="Fechar">
            <X className="size-4" />
          </button>
        </header>

        {feito ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <CheckCircle2 className="size-10" style={{ color: cores.principal }} />
              <p className="font-semibold">Pedido #{feito.numero} enviado</p>
              <p className="text-sm" style={{ color: cores.suave }}>
                O WhatsApp da loja abriu com o seu pedido. Se não abriu,{" "}
                <a href={feito.link} target="_blank" rel="noreferrer" className="underline">toque aqui</a>.
              </p>
            </div>
            <div className="rounded-xl p-3 text-sm whitespace-pre-line" style={{ background: cores.superficie }} data-testid="mensagem-pedido">
              {feito.mensagem}
            </div>
            <button type="button" onClick={() => { setFeito(null); onFechar() }} className="w-full h-11 rounded-full border font-medium" style={{ borderColor: cores.borda }}>
              Voltar para a loja
            </button>
          </div>
        ) : linhas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center" style={{ color: cores.suave }}>
            <ShoppingBag className="size-8" />
            <p className="text-sm">Seu carrinho está vazio.</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 divide-y" style={{ borderColor: cores.borda }}>
              {linhas.map((l) => (
                <li key={l.produtoId + l.combinacao} className="flex gap-3 py-3" style={{ borderColor: cores.borda }}>
                  <div className="size-16 shrink-0 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: cores.superficie }}>
                    {l.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.fotoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-4" style={{ color: cores.suave }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{l.nome}</p>
                    {l.combinacao && <p className="text-xs" style={{ color: cores.suave }}>{l.combinacao}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border" style={{ borderColor: cores.borda }}>
                        <button type="button" onClick={() => onMudarQuantidade(l.produtoId, l.combinacao, l.quantidade - 1)} className="size-8 flex items-center justify-center" aria-label={`Diminuir ${l.nome}`}><Minus className="size-3.5" /></button>
                        <span className="w-8 text-center text-sm tabular-nums">{l.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => onMudarQuantidade(l.produtoId, l.combinacao, l.quantidade + 1)}
                          disabled={l.quantidade >= l.maximo}
                          className="size-8 flex items-center justify-center disabled:opacity-30"
                          aria-label={`Aumentar ${l.nome}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatarPreco(l.preco * l.quantidade)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => onRemover(l.produtoId, l.combinacao)} className="self-start p-1" style={{ color: cores.suave }} aria-label={`Remover ${l.nome}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t p-4 space-y-3" style={{ borderColor: cores.borda }}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: cores.suave }}>{pecas} {pecas === 1 ? "peça" : "peças"}</span>
                <span className="text-lg font-semibold">{formatarPreco(valor)}</span>
              </div>
              {minimo.tipo !== "nenhum" && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: cores.superficie }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progresso * 100}%`, background: cores.principal }} />
                  </div>
                  <p className="text-xs" style={{ color: falta ? cores.texto : cores.suave }} role="status">
                    {falta ?? "Pedido mínimo atingido"}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" className={campo} style={{ background: cores.superficie, borderColor: erros.nome ? "#dc2626" : cores.borda, color: cores.texto }} aria-label="Seu nome" />
                {erros.nome && <p className="text-xs text-red-600">{erros.nome}</p>}
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Seu WhatsApp com DDD" inputMode="tel" autoComplete="tel" className={campo} style={{ background: cores.superficie, borderColor: erros.whatsapp ? "#dc2626" : cores.borda, color: cores.texto }} aria-label="Seu WhatsApp" />
                {erros.whatsapp && <p className="text-xs text-red-600">{erros.whatsapp}</p>}
              </div>
              {erros.geral && <p className="text-sm text-red-600" role="alert">{erros.geral}</p>}
              <button
                type="button"
                onClick={fazerPedido}
                disabled={!!falta || enviando}
                className="w-full h-12 rounded-full font-semibold disabled:opacity-40"
                style={{ background: cores.principal, color: cores.sobrePrincipal }}
              >
                {enviando ? "Enviando..." : "Fazer pedido pelo WhatsApp"}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
