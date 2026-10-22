"use client"

// B32-05: tabela das vendas do período, com busca pelo contato, "Ver todas" e Exportar.

import { useState } from "react"
import Link from "next/link"
import { Download } from "lucide-react"
import { contemTermo } from "@/lib/normalizar-busca"
import { formatarWhatsapp } from "@/app/(auth)/catalogo/components/lista-pedidos"
import { formatarDataBr, type VendaDaTabela } from "@/lib/relatorios/visao-geral"

const POR_PAGINA = 50

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function TabelaVendas({ vendas, urlExportar }: { vendas: VendaDaTabela[]; urlExportar: string }) {
  const [busca, setBusca] = useState("")
  const [todas, setTodas] = useState(false)

  const filtradas = busca ? vendas.filter((v) => contemTermo(v.contato, busca)) : vendas
  const visiveis = todas ? filtradas : filtradas.slice(0, POR_PAGINA)

  return (
    <section className="rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold">Vendas</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Pesquisar contato"
            placeholder="Pesquisar..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setTodas(false) }}
            className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
          />
          {!todas && filtradas.length > POR_PAGINA && (
            <button type="button" onClick={() => setTodas(true)} className="h-8 rounded-lg border border-input px-3 text-sm hover:bg-muted">
              Ver todas ({filtradas.length})
            </button>
          )}
          <a href={urlExportar} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-sm hover:bg-muted">
            <Download className="size-3.5" /> Exportar
          </a>
        </div>
      </div>

      {vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda com esse nome.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="py-2 pr-3 font-medium">Contato</th>
                <th className="py-2 pr-3 font-medium">Telefone</th>
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Origem</th>
                <th className="py-2 pr-3 font-medium">Atendente</th>
                <th className="py-2 pr-3 font-medium">Cidade</th>
                <th className="py-2 pr-3 font-medium">UF</th>
                <th className="py-2 pr-3 font-medium text-right">Peças</th>
                <th className="py-2 pr-3 font-medium">Forma de pagamento</th>
                <th className="py-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <Link href={`/contatos/${v.contatoId}`} className="hover:underline">{v.contato}</Link>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap numero">{v.telefone ? formatarWhatsapp(v.telefone) : "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap numero">{formatarDataBr(v.data)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{v.origem}</td>
                  <td className="py-2 pr-3">{v.atendente ?? "—"}</td>
                  <td className="py-2 pr-3">{v.cidade ?? "—"}</td>
                  <td className="py-2 pr-3">{v.uf ?? "—"}</td>
                  <td className="py-2 pr-3 text-right numero">{v.pecas ?? "—"}</td>
                  <td className="py-2 pr-3">{v.formaPagamento ?? "—"}</td>
                  <td className="py-2 text-right numero font-medium">{moeda(v.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!todas && filtradas.length > POR_PAGINA && (
            <p className="text-xs text-muted-foreground mt-2">Mostrando {POR_PAGINA} de {filtradas.length}.</p>
          )}
        </div>
      )}
    </section>
  )
}
