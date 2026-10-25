"use client"

// B33-01: aba RFV — cabeçalho, matriz Recência × FV e indicadores por perfil.

import { useEffect, useRef, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatarDataBr } from "@/lib/relatorios/visao-geral"
import { PERFIL_POR_ID, type CelulaRfv, type IndicadorPerfil, type ResultadoRfv } from "@/lib/relatorios/rfv"
import { buscarRfv } from "../actions"
import { ListaClientesRfv } from "./lista-clientes-rfv"
import { EvolucaoPerfis } from "./evolucao-perfis"
import { Entenda } from "./entenda"

const ENTENDA_RFV = [
  ["O que é RFV?", "RFV dá a cada cliente três notas, de 1 a 5: Recência (há quanto tempo foi a última compra), Frequência (quantas compras nos últimos 12 meses) e Valor (quanto gastou nos últimos 12 meses). Quanto maior a nota, melhor."],
  ["Como as notas são dadas", "Recência: 5 até 30 dias sem comprar, 4 até 60, 3 até 90, 2 até 180 e 1 depois disso. Frequência e Valor comparam o cliente com a sua própria base: os 20% que mais compram ganham 5, os 20% seguintes ganham 4, e assim por diante."],
  ["Como ler a matriz", "As colunas são a Recência e as linhas são o FV, a média entre Frequência e Valor. Cada célula mostra quantos clientes estão nela e o perfil deles. Clique numa célula para ver a lista desses clientes."],
  ["Perfis e base saudável", "Cada célula da matriz leva a um perfil, de Campeão (comprou há pouco, compra muito e gasta bem) a Perdido (sumiu há muito tempo e comprou pouco). A base saudável soma Campeão, Clientes Fiéis, Potencial Fiel, Clientes Recentes e Clientes Promissores. Veja se ela cresce na evolução, no fim da página."],
] as const

const moeda = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
const decimal = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }))

export type CelulaSelecionada = { r: number; fv: number } | null

export function MatrizRfv({ celulas, selecionada, onSelecionar }: { celulas: CelulaRfv[]; selecionada: CelulaSelecionada; onSelecionar: (c: CelulaSelecionada) => void }) {
  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="text-sm font-semibold">Matriz RFV: Recência × FV</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">Clique numa célula para filtrar (FV = Frequência + Valor)</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "2.5rem repeat(5, minmax(0, 1fr))" }} role="group" aria-label="Matriz RFV">
        <div className="text-[10px] text-muted-foreground self-end text-center">FV \ R</div>
        {[1, 2, 3, 4, 5].map((r) => (
          <div key={r} className="text-xs text-muted-foreground text-center">{r}</div>
        ))}
        {[5, 4, 3, 2, 1].map((fv) => (
          <div key={fv} className="contents">
            <div className="text-xs text-muted-foreground self-center text-center">{fv}</div>
            {celulas.filter((c) => c.fv === fv).map((c) => {
              const perfil = PERFIL_POR_ID[c.perfil]
              const ativa = selecionada?.r === c.r && selecionada?.fv === c.fv
              return (
                <button
                  key={`${c.fv}-${c.r}`}
                  type="button"
                  aria-pressed={ativa}
                  aria-label={`R ${c.r} FV ${c.fv}: ${c.clientes} ${perfil.nome}`}
                  data-testid={`celula-${c.r}-${c.fv}`}
                  onClick={() => onSelecionar(ativa ? null : { r: c.r, fv: c.fv })}
                  className={cn("rounded-md px-1 py-2 text-center text-white transition-opacity hover:opacity-90", ativa ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "", c.clientes === 0 && "opacity-60")}
                  style={{ backgroundColor: perfil.cor }}
                >
                  <div className="text-lg font-semibold leading-tight">{c.clientes}</div>
                  <div className="text-[11px] leading-tight truncate">{perfil.nome}</div>
                  <div className="text-[10px] italic opacity-90">{c.percentualAtivos === null ? "—" : `${c.percentualAtivos}% ativos`}</div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

export function IndicadoresPorPerfil({ indicadores }: { indicadores: IndicadorPerfil[] }) {
  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="text-sm font-semibold">Indicadores por perfil</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">Média de dias sem compra, vendas e valor por cliente nos últimos 12 meses</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b text-left">
              <th className="py-2 pr-3 font-medium">Perfil</th>
              <th className="py-2 pr-3 font-medium text-right">Clientes</th>
              <th className="py-2 pr-3 font-medium text-right">Sem lembrete 15d+</th>
              <th className="py-2 pr-3 font-medium text-right">Dias s/ compra</th>
              <th className="py-2 pr-3 font-medium text-right">Méd. vendas</th>
              <th className="py-2 font-medium text-right">Valor médio</th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map((i) => {
              const perfil = PERFIL_POR_ID[i.perfil]
              return (
                <tr key={i.perfil} className="border-b last:border-0" data-testid={`indicador-${i.perfil}`}>
                  <td className="py-2 pr-3 whitespace-nowrap"><span className="mr-1.5">{perfil.icone}</span>{perfil.nome}</td>
                  <td className="py-2 pr-3 text-right numero">{i.clientes}</td>
                  <td className="py-2 pr-3 text-right numero">{i.clientes ? `${i.semLembrete} (${i.percentualSemLembrete}%)` : "—"}</td>
                  <td className="py-2 pr-3 text-right numero">{i.diasSemCompraMedio === null ? "—" : `${i.diasSemCompraMedio} dias`}</td>
                  <td className="py-2 pr-3 text-right numero">{decimal(i.vendasMedias)}</td>
                  <td className="py-2 text-right numero">{moeda(i.valorMedioPorCliente)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface RfvClientProps {
  atendenteId: string | null
  /** Resultado já carregado (testes e primeira carga); sem ele, busca ao montar. */
  inicial?: ResultadoRfv | null
}

export function RfvClient({ atendenteId, inicial = null }: RfvClientProps) {
  const [resultado, setResultado] = useState<ResultadoRfv | null>(inicial)
  const [erro, setErro] = useState(false)
  const [celula, setCelula] = useState<CelulaSelecionada>(null)
  const [destaque, setDestaque] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  // Clicar numa célula leva a tela até a lista e destaca o cartão por um instante,
  // para ficar claro que o filtro foi aplicado. Limpar o filtro não mexe na tela.
  function selecionarCelula(c: CelulaSelecionada) {
    setCelula(c)
    if (!c) return
    listaRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" })
    setDestaque(true)
    setTimeout(() => setDestaque(false), 1500)
  }

  useEffect(() => {
    if (inicial) return
    startTransition(async () => {
      try {
        const r = await buscarRfv({ atendenteId })
        if (r) {
          setResultado(r)
          setErro(false)
        } else setErro(true)
      } catch {
        setErro(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendenteId])

  if (erro) return <p className="text-sm text-destructive">Não foi possível carregar o RFV. Tente novamente.</p>
  if (!resultado) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Calculando os perfis…</p>

  return (
    <div className="flex flex-col gap-4">
      <Entenda titulo="Entenda o RFV" itens={ENTENDA_RFV} />
      <div className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">Perfis em</span> <span data-testid="rfv-referencia">{formatarDataBr(resultado.referencia)}</span>
          <span className="text-muted-foreground"> · </span>
          <span data-testid="rfv-base">{resultado.base} {resultado.base === 1 ? "cliente" : "clientes"} com compra</span>
        </p>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <MatrizRfv celulas={resultado.matriz} selecionada={celula} onSelecionar={selecionarCelula} />
      <IndicadoresPorPerfil indicadores={resultado.indicadores} />
      {/* B33-02: a lista segue a célula clicada na matriz. */}
      <div ref={listaRef} data-testid="lista-rfv-destaque" data-destaque={destaque || undefined} className={cn("scroll-mt-4 rounded-md transition-shadow duration-500", destaque && "ring-2 ring-primary")}>
        <ListaClientesRfv clientes={resultado.clientes} celula={celula} onLimparCelula={() => setCelula(null)} atendenteId={atendenteId} />
      </div>
      {/* B33-03: evolução semanal e mensal, com a base saudável. */}
      <EvolucaoPerfis evolucao={resultado.evolucao} />
    </div>
  )
}
