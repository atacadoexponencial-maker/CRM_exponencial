"use client"

// B32-03: tela Relatórios — abas, cabeçalho do período, atalhos, filtros e os cartões.

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MESES, periodoMesAnterior, periodoPadrao, type PeriodoRelatorio } from "@/lib/relatorios/visao-geral"
import { buscarVisaoGeral, type VisaoGeral } from "../actions"
import { CartoesResumo } from "./cartoes-resumo"
import { GraficoFormaPagamento, GraficoProjecao, GraficoVendasDiarias } from "./graficos-visao-geral"
import { TabelaVendas } from "./tabela-vendas"
import { RfvClient } from "./rfv-client"
import { CoorteClient } from "./coorte-client"
import { FunilClientesClient } from "./funil-clientes-client"
import { CarteirasClient } from "./carteiras-client"
import { urlDeExportacao, urlDeExportacaoPorUf } from "@/lib/relatorios/exportar-vendas"
import { VariacaoPorUfTabela } from "./variacao-por-uf"
import { Grafico25Meses } from "./grafico-25-meses"
import { FiltroPorCampoControle } from "@/components/shared/filtro-por-campo"
import { VendasPorCampoTabela } from "./vendas-por-campo"
import { filtroPorCampoCompleto, type FiltroPorCampo } from "@/lib/filtro-por-campo"
import type { CampoParaFiltro } from "@/lib/filtro-contatos"
import { abaDoEndereco, type Aba } from "@/lib/relatorios/abas"


const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const botaoClass =
  "h-8 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-muted disabled:opacity-50"

interface RelatoriosClientProps {
  visaoInicial: VisaoGeral
  atendentes: Array<{ id: string; nome: string }>
  papel: string
  /** yyyy-mm-dd no fuso da operação, vindo do servidor. */
  hoje: string
  /** B38-07: campos personalizados da empresa, para o filtro por campo. */
  campos?: CampoParaFiltro[]
  /** B46-09: a aba que o endereço pediu. */
  abaInicial?: Aba
}

export function RelatoriosClient({ visaoInicial, atendentes, papel, hoje, campos = [], abaInicial = "visao-geral" }: RelatoriosClientProps) {
  const [visao, setVisao] = useState<VisaoGeral>(visaoInicial)
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>(periodoPadrao(hoje))
  const [atendenteId, setAtendenteId] = useState("")
  // B38-07: o filtro por campo só vale completo (campo e valor)
  const [campo, setCampo] = useState<FiltroPorCampo | null>(null)
  const campoAtivo = filtroPorCampoCompleto(campo) ? campo : null
  const [aba, setAba] = useState<Aba>(abaInicial)

  // B46-09: a aba vai para o endereço sem recarregar a página (os filtros ficam), e o
  // Voltar do navegador volta de aba
  function trocarAba(nova: Aba) {
    if (nova === aba) return
    setAba(nova)
    const url = new URL(window.location.href)
    if (nova === "visao-geral") url.searchParams.delete("aba")
    else url.searchParams.set("aba", nova)
    window.history.pushState(null, "", url)
  }
  useEffect(() => {
    const aoVoltar = () => setAba(abaDoEndereco(new URLSearchParams(window.location.search).get("aba")))
    window.addEventListener("popstate", aoVoltar)
    return () => window.removeEventListener("popstate", aoVoltar)
  }, [])
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  const podeFiltrarAtendente = papel === "admin" || papel === "gerente"
  const anoDeHoje = Number(hoje.slice(0, 4))
  const anos = [anoDeHoje, anoDeHoje - 1, anoDeHoje - 2]

  function aplicar(novoPeriodo: PeriodoRelatorio, novoAtendente = atendenteId, novoCampo = campoAtivo) {
    setPeriodo(novoPeriodo)
    setAtendenteId(novoAtendente)
    if (novoPeriodo.tipo === "meses" && novoPeriodo.meses.length === 0) return
    setErro(false)
    startTransition(async () => {
      try {
        const r = await buscarVisaoGeral({ periodo: novoPeriodo, atendenteId: novoAtendente || null, ...(novoCampo ? { campo: novoCampo } : {}) })
        if (r) setVisao(r)
        else setErro(true)
      } catch {
        setErro(true)
      }
    })
  }

  function alternarMes(mes: number) {
    const base = periodo.tipo === "meses" ? periodo : { tipo: "meses" as const, ano: anoDeHoje, meses: [] as number[] }
    const meses = base.meses.includes(mes) ? base.meses.filter((m) => m !== mes) : [...base.meses, mes]
    aplicar({ tipo: "meses", ano: base.ano, meses })
  }

  function trocarAno(ano: number) {
    const meses = periodo.tipo === "meses" ? periodo.meses : [Number(hoje.slice(5, 7))]
    aplicar({ tipo: "meses", ano, meses })
  }

  /** Muda o filtro por campo; na Visão Geral, recarrega quando ele fica completo ou sai. */
  function mudarCampo(novo: FiltroPorCampo | null) {
    setCampo(novo)
    if (aba === "visao-geral" && (!novo || filtroPorCampoCompleto(novo))) aplicar(periodo, atendenteId, novo)
  }

  const anoSelecionado = periodo.tipo === "meses" ? periodo.ano : anoDeHoje
  const mesesSelecionados = periodo.tipo === "meses" ? periodo.meses : []

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Relatórios</h1>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Abas: só a Visão Geral existe; as outras avisam "em breve" (SUP-B32-06 invalidada). */}
      <div role="tablist" aria-label="Relatórios" className="flex flex-wrap border-b mb-7">
        {([["visao-geral", "Visão Geral"], ["rfv", "RFV"], ["coorte", "Coorte"], ["funil", "Funil de clientes"], ["carteiras", "Carteiras"]] as Array<[Aba, string]>).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => trocarAba(id)}
            className={cn("mr-5 py-2.5 text-sm -mb-px", aba === id ? "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--foreground)]" : "text-muted-foreground hover:text-foreground")}
          >
            {nome}
          </button>
        ))}
      </div>

      {aba !== "visao-geral" && (
        <>
          {((podeFiltrarAtendente && aba !== "carteiras") || campos.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {podeFiltrarAtendente && aba !== "carteiras" && (
                <select aria-label="Atendente" className={selectClass} value={atendenteId} onChange={(e) => setAtendenteId(e.target.value)}>
                  <option value="">Todos os atendentes</option>
                  {atendentes.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              )}
              {/* B38-07 */}
              <FiltroPorCampoControle campos={campos} valor={campo} onChange={mudarCampo} />
            </div>
          )}
          {aba === "rfv" && <RfvClient atendenteId={atendenteId || null} campo={campoAtivo} />}
          {aba === "coorte" && <CoorteClient atendenteId={atendenteId || null} campo={campoAtivo} />}
          {aba === "funil" && <FunilClientesClient atendenteId={atendenteId || null} campo={campoAtivo} />}
          {aba === "carteiras" && <CarteirasClient campo={campoAtivo} />}
        </>
      )}

      {aba === "visao-geral" && (<>
      {/* Cabeçalho do período + atalhos */}
      <div className="rounded-lg border p-4 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm">
            <span className="font-semibold">Visualização:</span> <span data-testid="titulo-periodo">{visao.cabecalho.titulo}</span>
          </p>
          {visao.cabecalho.aviso && (
            <p className="text-xs text-info mt-1" data-testid="aviso-comparacao">{visao.cabecalho.aviso}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={botaoClass} onClick={() => aplicar({ tipo: "ontem" })}>Ontem</button>
          <button type="button" className={botaoClass} onClick={() => aplicar(periodoMesAnterior(hoje))}>Mês anterior</button>
          <button type="button" className={botaoClass} onClick={() => aplicar(periodoPadrao(hoje))}>Este mês</button>
        </div>
      </div>

      {/* Filtros: ano, meses (vários do mesmo ano) e atendente */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select aria-label="Ano" className={selectClass} value={anoSelecionado} onChange={(e) => trocarAno(Number(e.target.value))}>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Meses">
          {MESES.map((nome, i) => {
            const mes = i + 1
            const ativo = mesesSelecionados.includes(mes)
            return (
              <button
                key={mes}
                type="button"
                aria-pressed={ativo}
                onClick={() => alternarMes(mes)}
                className={cn(
                  "h-7 rounded-md border px-2 text-xs transition-colors",
                  ativo ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:bg-muted"
                )}
              >
                {nome.slice(0, 3)}
              </button>
            )
          })}
        </div>
        {podeFiltrarAtendente && (
          <select aria-label="Atendente" className={selectClass} value={atendenteId} onChange={(e) => aplicar(periodo, e.target.value)}>
            <option value="">Todos os atendentes</option>
            {atendentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        )}
        {/* B38-07 */}
        <FiltroPorCampoControle campos={campos} valor={campo} onChange={mudarCampo} />
      </div>

      {erro && <p className="text-sm text-destructive mb-4">Não foi possível carregar o relatório. Tente novamente.</p>}

      <CartoesResumo cartoes={visao.cartoes} />

      {/* B32-04: gráficos abaixo dos cartões; a projeção só no mês atual. */}
      <div className="flex flex-col gap-4 mt-6">
        <GraficoVendasDiarias dias={visao.graficos.vendasDiarias} />
        {visao.graficos.projecao && <GraficoProjecao projecao={visao.graficos.projecao} />}
        <GraficoFormaPagamento formas={visao.graficos.porForma} />
        {/* B32-05: a tabela das vendas do período, com o mesmo filtro no Exportar. */}
        <TabelaVendas vendas={visao.tabela} urlExportar={urlDeExportacao(periodo, atendenteId || null)} />
        {/* B32-06: variação por UF e os últimos 25 meses fecham a Visão Geral. */}
        <VariacaoPorUfTabela variacao={visao.porUf} urlExportar={urlDeExportacaoPorUf(periodo, atendenteId || null)} />
        {/* B38-08: as vendas agrupadas pelo valor de um campo personalizado */}
        {campos.length > 0 && <VendasPorCampoTabela campos={campos} periodo={periodo} atendenteId={atendenteId || null} filtro={campoAtivo} />}
        <Grafico25Meses meses={visao.mesesHistorico} />
      </div>
      </>)}
    </>
  )
}
