"use client"

// B33-02: clientes por perfil RFV — busca, seletor de perfil, filtro pela célula da
// matriz, 25 por página e Excel com o filtro atual.

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react"
import { formatarDataBr } from "@/lib/relatorios/visao-geral"
import { PERFIL_POR_ID, PERFIS, perfilDaMatriz, type ClienteRfv, type PerfilRfv } from "@/lib/relatorios/rfv"
import { filtrarClientesRfv, urlDeExportacaoRfv } from "@/lib/relatorios/exportar-rfv"

const POR_PAGINA = 25
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring"

export function ListaClientesRfv({
  clientes,
  celula,
  onLimparCelula,
  atendenteId,
}: {
  clientes: ClienteRfv[]
  celula: { r: number; fv: number } | null
  onLimparCelula: () => void
  atendenteId: string | null
}) {
  const [perfil, setPerfil] = useState<PerfilRfv | "">("")
  const [busca, setBusca] = useState("")
  const [pagina, setPagina] = useState(0)

  const filtro = { perfil: perfil || null, celula, busca }
  const filtrados = filtrarClientesRfv(clientes, filtro)
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const atual = Math.min(pagina, paginas - 1)
  const visiveis = filtrados.slice(atual * POR_PAGINA, atual * POR_PAGINA + POR_PAGINA)
  const de = filtrados.length ? atual * POR_PAGINA + 1 : 0
  const ate = Math.min(filtrados.length, (atual + 1) * POR_PAGINA)

  return (
    <section className="rounded-md border bg-card p-5" data-testid="lista-rfv">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold">Clientes por perfil RFV</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Lista de clientes segmentados</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {celula && (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/60 px-2.5 text-xs" data-testid="chip-celula">
              {PERFIL_POR_ID[perfilDaMatriz(celula.r, celula.fv)].nome} · R {celula.r} · FV {celula.fv}
              <button type="button" onClick={onLimparCelula} aria-label="Limpar filtro da matriz" className="hover:text-foreground text-muted-foreground"><X className="size-3.5" /></button>
            </span>
          )}
          <input
            type="search"
            aria-label="Buscar cliente"
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(0) }}
            className="h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
          />
          <select aria-label="Perfil" className={selectClass} value={perfil} onChange={(e) => { setPerfil(e.target.value as PerfilRfv | ""); setPagina(0) }}>
            <option value="">Todos</option>
            {PERFIS.map((p) => (
              <option key={p.id} value={p.id}>{p.icone} {p.nome}</option>
            ))}
          </select>
          <a href={urlDeExportacaoRfv(filtro, atendenteId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted">
            <Download className="size-3.5" /> Excel
          </a>
        </div>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente com compra.</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente com esse filtro.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Perfil</th>
                <th className="py-2 pr-2 font-medium text-right">R</th>
                <th className="py-2 pr-2 font-medium text-right">F</th>
                <th className="py-2 pr-2 font-medium text-right">V</th>
                <th className="py-2 pr-3 font-medium text-right">FV</th>
                <th className="py-2 pr-3 font-medium text-right">Dias s/ compra</th>
                <th className="py-2 pr-3 font-medium text-right">Vendas 12m</th>
                <th className="py-2 pr-3 font-medium text-right">Valor 12m</th>
                <th className="py-2 pr-3 font-medium">Última venda</th>
                <th className="py-2 pr-3 font-medium">Atendente</th>
                <th className="py-2 pr-3 font-medium">Cidade</th>
                <th className="py-2 font-medium">UF</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => {
                const p = PERFIL_POR_ID[c.perfil]
                return (
                  <tr key={c.contatoId} className="border-b last:border-0">
                    <td className="py-2 pr-3"><Link href={`/contatos/${c.contatoId}`} className="hover:underline">{c.nome}</Link></td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white" style={{ backgroundColor: p.cor }}>{p.icone} {p.nome}</span>
                    </td>
                    <td className="py-2 pr-2 text-right numero">{c.r}</td>
                    <td className="py-2 pr-2 text-right numero">{c.f}</td>
                    <td className="py-2 pr-2 text-right numero">{c.v}</td>
                    <td className="py-2 pr-3 text-right numero">{c.fv}</td>
                    <td className="py-2 pr-3 text-right numero">{c.diasSemCompra}</td>
                    <td className="py-2 pr-3 text-right numero">{c.vendas12m}</td>
                    <td className="py-2 pr-3 text-right numero">{moeda(c.valor12m)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap numero">{formatarDataBr(c.ultimaVenda)}</td>
                    <td className="py-2 pr-3">{c.atendente ?? "—"}</td>
                    <td className="py-2 pr-3">{c.cidade ?? "—"}</td>
                    <td className="py-2">{c.uf ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 mt-3 text-sm text-muted-foreground">
            <span data-testid="rfv-paginacao">Mostrando {de}–{ate} de {filtrados.length} clientes</span>
            <span className="flex items-center gap-1">
              <button type="button" aria-label="Página anterior" disabled={atual === 0} onClick={() => setPagina(atual - 1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-input disabled:opacity-40 hover:bg-muted"><ChevronLeft className="size-4" /></button>
              <button type="button" aria-label="Próxima página" disabled={atual >= paginas - 1} onClick={() => setPagina(atual + 1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-input disabled:opacity-40 hover:bg-muted"><ChevronRight className="size-4" /></button>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
