"use client"

// B38-08: vendas do período por valor de um campo personalizado (lista de opções,
// múltipla escolha ou sim/não), no formato da Variação por UF, com o Excel. Acompanha
// o período, o atendente e o filtro por campo da tela.

import { useEffect, useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import type { CampoParaFiltro } from "@/lib/filtro-contatos"
import type { FiltroPorCampo } from "@/lib/filtro-por-campo"
import type { PeriodoRelatorio } from "@/lib/relatorios/visao-geral"
import { urlDeExportacaoPorCampo } from "@/lib/relatorios/exportar-vendas"
import { buscarVendasPorCampo, type VendasPorCampo } from "../actions"
import { VariacaoPorUfTabela } from "./variacao-por-uf"

const TIPOS_QUE_AGRUPAM = ["lista", "multipla", "sim_nao"]

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

interface Props {
  campos: CampoParaFiltro[]
  periodo: PeriodoRelatorio
  atendenteId: string | null
  filtro: FiltroPorCampo | null
}

export function VendasPorCampoTabela({ campos, periodo, atendenteId, filtro }: Props) {
  const agrupaveis = campos.filter((c) => TIPOS_QUE_AGRUPAM.includes(c.tipo))
  const [agrupar, setAgrupar] = useState("")
  const [resultado, setResultado] = useState<VendasPorCampo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const chave = JSON.stringify([agrupar, periodo, atendenteId, filtro])

  useEffect(() => {
    if (!agrupar) return
    startTransition(async () => {
      try {
        const r = await buscarVendasPorCampo({ periodo, atendenteId, ...(filtro ? { campo: filtro } : {}), agrupar })
        if (!r) setErro("Não foi possível carregar a tabela. Tente novamente.")
        else if ("erro" in r) setErro(r.erro)
        else {
          setResultado(r)
          setErro(null)
        }
      } catch {
        setErro("Não foi possível carregar a tabela. Tente novamente.")
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return (
    <section aria-label="Vendas por campo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Vendas por campo</h2>
        {agrupaveis.length > 0 && (
          <select aria-label="Agrupar por" className={selectClass} value={agrupar} onChange={(e) => setAgrupar(e.target.value)}>
            <option value="">Escolha o campo…</option>
            {agrupaveis.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      {agrupaveis.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Para ver as vendas por campo, crie um campo de lista de opções, múltipla escolha ou sim/não em Configurações → Campos personalizados.
        </p>
      )}
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {resultado && agrupar && resultado.campo.id === agrupar && (
        <>
          {resultado.somaPodePassar && (
            <p className="text-xs text-aviso">Cliente com mais de uma opção conta em cada uma delas: a soma das linhas pode passar do total.</p>
          )}
          <VariacaoPorUfTabela
            variacao={resultado.variacao}
            titulo={`Vendas por ${resultado.campo.nome}`}
            rotuloDoGrupo={resultado.campo.nome}
            urlExportar={urlDeExportacaoPorCampo(periodo, atendenteId, agrupar, filtro)}
          />
        </>
      )}
    </section>
  )
}
