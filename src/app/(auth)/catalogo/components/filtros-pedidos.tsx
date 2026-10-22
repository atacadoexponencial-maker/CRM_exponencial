"use client"

// B39-01: barra de filtros da tela Pedidos. Só guarda o que a pessoa escolhe; quem
// filtra é o servidor, sobre todos os pedidos da empresa.

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { erroDoPeriodo, type FiltrosPedidos, type PeriodoPedidos } from "@/lib/catalogo/filtros-pedidos"
import type { ProdutoDoFiltro } from "../pedidos/actions"
import { ROTULO_SITUACAO, type SituacaoPedido } from "./situacao-pedido"

const selectClass = "h-8 rounded-lg border border-input bg-input/30 px-2 text-sm max-sm:w-full"
const campoClass = "h-8 rounded-lg border border-input bg-input/30 px-2 text-sm"

/** Valor do <select> de produto: "id:<uuid>" ou "nome:<nome do apagado>". */
const valorDoProduto = (p: ProdutoDoFiltro) => (p.id ? `id:${p.id}` : `nome:${p.nome}`)

interface FiltrosPedidosProps {
  filtros: FiltrosPedidos
  onChange: (filtros: FiltrosPedidos) => void
  onLimpar: () => void
  produtos: ProdutoDoFiltro[]
  atendentes: Array<{ id: string; nome: string }>
}

export function BarraFiltrosPedidos({ filtros, onChange, onLimpar, produtos, atendentes }: FiltrosPedidosProps) {
  const mudar = (parcial: Partial<FiltrosPedidos>) => onChange({ ...filtros, ...parcial })
  const avisoPeriodo = erroDoPeriodo(filtros)
  const produtoEscolhido = filtros.produtoId ? `id:${filtros.produtoId}` : filtros.produtoNome ? `nome:${filtros.produtoNome}` : ""

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filtros.busca}
            onChange={(e) => mudar({ busca: e.target.value })}
            placeholder="Nome ou WhatsApp"
            className="pl-8"
            aria-label="Buscar pedido por nome ou WhatsApp"
          />
        </div>
        <select
          value={filtros.situacao}
          onChange={(e) => mudar({ situacao: e.target.value as FiltrosPedidos["situacao"] })}
          className={selectClass}
          aria-label="Filtrar por situação"
        >
          <option value="">Todas as situações</option>
          {(Object.keys(ROTULO_SITUACAO) as SituacaoPedido[]).map((s) => <option key={s} value={s}>{ROTULO_SITUACAO[s]}</option>)}
        </select>
        <select
          value={filtros.periodo}
          onChange={(e) => mudar({ periodo: e.target.value as PeriodoPedidos })}
          className={selectClass}
          aria-label="Filtrar por período"
        >
          <option value="hoje">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="tudo">Tudo</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </div>

      {filtros.periodo === "personalizado" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <label className="flex items-center gap-1.5">
            De
            <input type="date" aria-label="Dia inicial" className={campoClass} value={filtros.de} onChange={(e) => mudar({ de: e.target.value })} />
          </label>
          <label className="flex items-center gap-1.5">
            até
            <input type="date" aria-label="Dia final" className={campoClass} value={filtros.ate} onChange={(e) => mudar({ ate: e.target.value })} />
          </label>
          {avisoPeriodo && <span role="alert" className="text-xs text-erro">{avisoPeriodo}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          R$
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="mínimo"
            aria-label="Valor mínimo"
            className={`${campoClass} numero w-24`}
            value={filtros.valorMin}
            onChange={(e) => mudar({ valorMin: e.target.value })}
          />
          a
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="máximo"
            aria-label="Valor máximo"
            className={`${campoClass} numero w-24`}
            value={filtros.valorMax}
            onChange={(e) => mudar({ valorMax: e.target.value })}
          />
        </label>
        <select
          value={produtoEscolhido}
          onChange={(e) => {
            const v = e.target.value
            mudar({
              produtoId: v.startsWith("id:") ? v.slice(3) : "",
              produtoNome: v.startsWith("nome:") ? v.slice(5) : "",
            })
          }}
          className={`${selectClass} max-w-56`}
          aria-label="Filtrar por produto"
        >
          <option value="">Todos os produtos</option>
          {produtos.map((p) => (
            <option key={valorDoProduto(p)} value={valorDoProduto(p)}>
              {p.apagado ? `${p.nome} (apagado)` : p.nome}
            </option>
          ))}
        </select>
        <select
          value={filtros.cliente}
          onChange={(e) => mudar({ cliente: e.target.value as FiltrosPedidos["cliente"] })}
          className={selectClass}
          aria-label="Filtrar por cliente nova ou antiga"
        >
          <option value="">Clientes novas e antigas</option>
          <option value="nova">Cliente nova</option>
          <option value="antiga">Cliente antiga</option>
        </select>
        <select
          value={filtros.atendente}
          onChange={(e) => mudar({ atendente: e.target.value })}
          className={selectClass}
          aria-label="Filtrar por atendente da cliente"
        >
          <option value="">Todos os atendentes</option>
          {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          <option value="sem">Sem atendente</option>
        </select>
        <button type="button" onClick={onLimpar} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
