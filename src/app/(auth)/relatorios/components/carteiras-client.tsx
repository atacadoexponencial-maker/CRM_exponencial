"use client"

// B35-01: aba Carteiras — visão geral da empresa, carteira por vendedor, quem está sem
// vendedor e o histórico de alterações. Os botões de ação chegam nas B35-02 e B35-03.

import { useEffect, useState, useTransition } from "react"
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { formatarDataCurta, formatarHoraDoDia } from "@/lib/datas"
import { HISTORICO_POR_PAGINA, type NumerosDaCarteira } from "@/lib/relatorios/carteiras"
import { ROTULO_MOTIVO } from "@/lib/carteira"
import { buscarCarteiras, buscarHistoricoDeCarteira, type LinhaDoHistoricoDeCarteira, type ResultadoCarteiras } from "../actions"
import { RemoverCarteiraDialog, TransferirCarteiraDialog } from "./acoes-carteira"
import { DistribuirDialog, ReprocessarDialog } from "./acoes-sem-vendedor"
import type { FiltroPorCampo } from "@/lib/filtro-por-campo"

const NUMEROS: Array<{ id: keyof NumerosDaCarteira; titulo: string; cor: string }> = [
  // B46-10 (PER-B46-02): "Sem compra", para não confundir com os leads do Pipeline
  { id: "leads", titulo: "Sem compra", cor: "text-violet-700 dark:text-violet-300" },
  { id: "base", titulo: "Base de clientes", cor: "text-orange-700 dark:text-orange-300" },
  { id: "ativos", titulo: "Ativos", cor: "text-sucesso" },
  { id: "inativos", titulo: "Inativos", cor: "text-erro" },
]

// B46-13: uma tabela só, com os quatro nomes uma vez, no cabeçalho
function TabelaDeNumeros({ linhas }: { linhas: Array<{ titulo: string; numeros: NumerosDaCarteira; testid: string }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium"><span className="sr-only">Contatos</span></th>
            {NUMEROS.map((n) => <th key={n.id} className="py-2 pr-3 text-right font-medium whitespace-nowrap">{n.titulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.testid} data-testid={l.testid} className="border-b last:border-0">
              <th scope="row" className="py-2.5 pr-3 text-left font-medium whitespace-nowrap">{l.titulo}</th>
              {NUMEROS.map((n) => (
                <td key={n.id} data-numero className={`py-2.5 pr-3 text-right text-xl font-semibold numero ${n.cor}`}>{l.numeros[n.id]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PainelDeCarteiras({ resultado, acoesDoVendedor, acoesDosSemVendedor }: {
  resultado: ResultadoCarteiras
  /** B35-02: botões de transferir e remover, por vendedor. */
  acoesDoVendedor?: (vendedorId: string, total: number) => React.ReactNode
  /** B35-03: botões de distribuir e reprocessar. */
  acoesDosSemVendedor?: React.ReactNode
}) {
  const { painel, papel, historico } = resultado
  const gestor = papel !== "atendente"
  return (
    <div className="flex flex-col gap-4">
      {gestor && (
        <section className="rounded-md border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Visão geral da empresa</h2>
          <TabelaDeNumeros
            linhas={[
              { titulo: "Total", numeros: painel.total, testid: "numeros-total" },
              { titulo: "Com carteira atribuída", numeros: painel.comCarteira, testid: "numeros-com" },
              { titulo: "Sem carteira atribuída", numeros: painel.semCarteira, testid: "numeros-sem" },
            ]}
          />
        </section>
      )}

      <section className="rounded-md border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">
          {gestor ? "Carteira por vendedor" : "Minha carteira"} <span className="ml-1 rounded-full border px-2 text-xs text-muted-foreground">{painel.vendedores.length}</span>
        </h2>
        <div className="flex flex-col gap-3">
          {painel.vendedores.map((v) => (
            <div key={v.id} className="rounded-md border bg-background p-4" data-testid={`vendedor-${v.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{v.nome}</p>
                  <p className="text-sm text-muted-foreground">{v.total} na carteira</p>
                </div>
                {gestor && acoesDoVendedor?.(v.id, v.total)}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                {NUMEROS.map((n) => (
                  <span key={n.id} className="rounded-full border px-2.5 py-1">
                    <span className="text-muted-foreground">{n.titulo === "Base de clientes" ? "Base" : n.titulo}</span> <strong className={n.cor}>{v[n.id]}</strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {gestor && (
        <section className="rounded-md border bg-card p-5">
          <h2 className="text-sm font-semibold mb-3">Sem vendedor</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p data-testid="sem-vendedor">
              <span className="text-3xl font-semibold text-erro numero mr-2">{painel.semVendedor.total}</span>
              <span className="text-sm">contatos sem vendedor</span>
              <span className="block text-xs text-muted-foreground">{painel.semVendedor.comCompra} com compra · {painel.semVendedor.leads} sem compra</span>
            </p>
            {acoesDosSemVendedor}
          </div>
        </section>
      )}

      {gestor && historico && <HistoricoDeCarteira inicial={historico} totalInicial={resultado.historicoTotal ?? historico.length} />}
    </div>
  )
}

/** Histórico de alterações, 10 por página; a primeira página chega com o painel. */
function HistoricoDeCarteira({ inicial, totalInicial }: { inicial: LinhaDoHistoricoDeCarteira[]; totalInicial: number }) {
  const [pagina, setPagina] = useState(0)
  const [historico, setHistorico] = useState(inicial)
  const [total, setTotal] = useState(totalInicial)
  const [isPending, startTransition] = useTransition()

  // O painel recarregou (transferência, distribuição, Atualizar): volta para a primeira página.
  const [origem, setOrigem] = useState(inicial)
  if (origem !== inicial) {
    setOrigem(inicial)
    setPagina(0)
    setHistorico(inicial)
    setTotal(totalInicial)
  }

  function irPara(nova: number) {
    startTransition(async () => {
      const r = await buscarHistoricoDeCarteira(nova)
      if (!r) return
      setPagina(nova)
      setHistorico(r.linhas)
      setTotal(r.total)
    })
  }

  const paginas = Math.max(1, Math.ceil(total / HISTORICO_POR_PAGINA))
  const de = total ? pagina * HISTORICO_POR_PAGINA + 1 : 0
  const ate = Math.min(total, pagina * HISTORICO_POR_PAGINA + historico.length)

  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="text-sm font-semibold mb-1">Histórico de alterações</h2>
      <p className="text-xs text-muted-foreground mb-3">Toda mudança de carteira fica registrada: quem alterou, quando e de quem para quem. A mais recente primeiro.</p>
      {historico.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="historico-carteira">
            <thead>
              <tr className="text-xs text-muted-foreground border-b text-left">
                <th className="py-2 pr-3 font-medium">Quando</th>
                <th className="py-2 pr-3 font-medium">Contato</th>
                <th className="py-2 pr-3 font-medium">De</th>
                <th className="py-2 pr-3 font-medium">Para</th>
                <th className="py-2 pr-3 font-medium">Motivo</th>
                <th className="py-2 font-medium">Quem fez</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 whitespace-nowrap numero">{formatarDataCurta(h.quando)} {formatarHoraDoDia(h.quando)}</td>
                  <td className="py-2 pr-3">{h.contato}</td>
                  <td className="py-2 pr-3">{h.de ?? "ninguém"}</td>
                  <td className="py-2 pr-3">{h.para ?? "ninguém"}</td>
                  <td className="py-2 pr-3">{ROTULO_MOTIVO[h.motivo]}</td>
                  <td className="py-2">{h.por ?? "automação"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {paginas > 1 && (
        <div className="flex items-center justify-between gap-3 mt-3 text-sm text-muted-foreground">
          <span data-testid="paginacao-historico" className="flex items-center gap-2">Mostrando {de}–{ate} de {total}{isPending && <Loader2 className="size-3.5 animate-spin" />}</span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label="Página anterior" disabled={pagina === 0 || isPending} onClick={() => irPara(pagina - 1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-input disabled:opacity-40 hover:bg-muted"><ChevronLeft className="size-4" /></button>
            <button type="button" aria-label="Próxima página" disabled={pagina >= paginas - 1 || isPending} onClick={() => irPara(pagina + 1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-input disabled:opacity-40 hover:bg-muted"><ChevronRight className="size-4" /></button>
          </span>
        </div>
      )}
    </section>
  )
}

export function CarteirasClient({ campo = null, inicial = null }: { campo?: FiltroPorCampo | null; inicial?: ResultadoCarteiras | null }) {
  // B38-07: recarrega quando o filtro por campo muda
  const chaveDoCampo = JSON.stringify(campo ?? null)
  const [resultado, setResultado] = useState<ResultadoCarteiras | null>(inicial)
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  function carregar() {
    startTransition(async () => {
      try {
        const r = await (campo ? buscarCarteiras({ campo }) : buscarCarteiras())
        if (r) {
          setResultado(r)
          setErro(false)
        } else setErro(true)
      } catch {
        setErro(true)
      }
    })
  }

  useEffect(() => {
    if (inicial) return
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDoCampo])

  if (erro) return <p className="text-sm text-destructive">Não foi possível carregar as carteiras. Tente novamente.</p>
  if (!resultado) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Carregando as carteiras…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Vendedores e carteiras</h2>
        <button type="button" onClick={carregar} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted">
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Atualizar
        </button>
      </div>
      <PainelDeCarteiras
        resultado={resultado}
        acoesDoVendedor={(id, total) => {
          const vendedor = resultado.painel.vendedores.find((v) => v.id === id)
          if (!vendedor) return null
          return (
            <div className="flex flex-wrap gap-2" data-testid={`acoes-${id}`}>
              <TransferirCarteiraDialog vendedor={vendedor} total={total} vendedores={resultado.painel.vendedores} onFeito={carregar} />
              <RemoverCarteiraDialog vendedor={vendedor} total={total} onFeito={carregar} />
            </div>
          )
        }}
        acoesDosSemVendedor={
          <div className="flex flex-wrap gap-2" data-testid="acoes-sem-vendedor">
            <DistribuirDialog vendedores={resultado.painel.vendedores} semVendedor={resultado.painel.semVendedor} onFeito={carregar} />
            <ReprocessarDialog semVendedor={resultado.painel.semVendedor} onFeito={carregar} />
          </div>
        }
      />
    </div>
  )
}
