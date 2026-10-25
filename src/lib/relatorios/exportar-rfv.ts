// B33-02: filtro, ordem e exportação da lista de clientes por perfil RFV, e a tradução
// do filtro para a URL da rota de download (e de volta).

import type { ColunaPlanilha } from "@/lib/exportar-planilha"
import { contemTermo } from "@/lib/normalizar-busca"
import { PERFIL_POR_ID, PERFIS, type ClienteRfv, type PerfilRfv } from "./rfv"

export type FiltroListaRfv = {
  perfil?: PerfilRfv | null
  celula?: { r: number; fv: number } | null
  busca?: string
}

const ORDEM_PERFIL: Record<string, number> = Object.fromEntries(PERFIS.map((p, i) => [p.id, i]))

/** Perfil mais valioso primeiro (ordem do Tailor), depois menos dias sem compra. */
export function ordenarClientesRfv(clientes: ClienteRfv[]): ClienteRfv[] {
  return [...clientes].sort((a, b) => ORDEM_PERFIL[a.perfil] - ORDEM_PERFIL[b.perfil] || a.diasSemCompra - b.diasSemCompra || a.nome.localeCompare(b.nome))
}

export function filtrarClientesRfv(clientes: ClienteRfv[], filtro: FiltroListaRfv): ClienteRfv[] {
  return ordenarClientesRfv(
    clientes.filter(
      (c) =>
        (!filtro.perfil || c.perfil === filtro.perfil) &&
        (!filtro.celula || (c.r === filtro.celula.r && c.fv === filtro.celula.fv)) &&
        (!filtro.busca || contemTermo(c.nome, filtro.busca))
    )
  )
}

function dataLocal(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number)
  return new Date(a, m - 1, d)
}

/** As mesmas colunas da lista da tela, na mesma ordem. */
export const COLUNAS_EXPORTACAO_RFV: ColunaPlanilha<ClienteRfv>[] = [
  { titulo: "Cliente", tipo: "texto", valor: (c) => c.nome, largura: 32 },
  { titulo: "Perfil", tipo: "texto", valor: (c) => PERFIL_POR_ID[c.perfil].nome, largura: 22 },
  { titulo: "R", tipo: "numero", valor: (c) => c.r, largura: 6, nota: "Recência: há quanto tempo foi a última compra. 5 = até 30 dias, 4 = até 60, 3 = até 90, 2 = até 180, 1 = mais que isso." },
  { titulo: "F", tipo: "numero", valor: (c) => c.f, largura: 6, nota: "Frequência: quantas compras nos últimos 12 meses, comparando com os outros clientes. 5 = os 20% que mais compram." },
  { titulo: "V", tipo: "numero", valor: (c) => c.v, largura: 6, nota: "Valor: quanto gastou nos últimos 12 meses, comparando com os outros clientes. 5 = os 20% que mais gastam." },
  { titulo: "FV", tipo: "numero", valor: (c) => c.fv, largura: 6, nota: "Média entre F e V, arredondada para cima. É a linha da matriz." },
  { titulo: "Dias sem compra", tipo: "numero", valor: (c) => c.diasSemCompra, largura: 18 },
  { titulo: "Vendas 12m", tipo: "numero", valor: (c) => c.vendas12m, largura: 14 },
  { titulo: "Valor 12m", tipo: "moeda", valor: (c) => c.valor12m, largura: 16 },
  { titulo: "Última venda", tipo: "data", valor: (c) => dataLocal(c.ultimaVenda), largura: 14 },
  { titulo: "Atendente", tipo: "texto", valor: (c) => c.atendente, largura: 24 },
  { titulo: "Cidade", tipo: "texto", valor: (c) => c.cidade, largura: 20 },
  { titulo: "UF", tipo: "texto", valor: (c) => c.uf, largura: 6 },
]

export const TITULOS_EXPORTACAO_RFV = COLUNAS_EXPORTACAO_RFV.map((c) => c.titulo)

export function urlDeExportacaoRfv(filtro: FiltroListaRfv, atendenteId: string | null): string {
  const q = new URLSearchParams()
  if (atendenteId) q.set("atendente", atendenteId)
  if (filtro.perfil) q.set("perfil", filtro.perfil)
  if (filtro.celula) {
    q.set("r", String(filtro.celula.r))
    q.set("fv", String(filtro.celula.fv))
  }
  if (filtro.busca) q.set("busca", filtro.busca)
  const s = q.toString()
  return `/relatorios/rfv/exportar${s ? `?${s}` : ""}`
}

const PERFIS_VALIDOS = new Set<string>(PERFIS.map((p) => p.id))

/** O filtro lido da query string; `null` quando não é válido. */
export function filtroDaUrl(q: URLSearchParams): FiltroListaRfv | null {
  const perfil = q.get("perfil")
  if (perfil && !PERFIS_VALIDOS.has(perfil)) return null
  const r = q.get("r"), fv = q.get("fv")
  let celula: FiltroListaRfv["celula"] = null
  if (r || fv) {
    const nr = Number(r), nfv = Number(fv)
    if (![1, 2, 3, 4, 5].includes(nr) || ![1, 2, 3, 4, 5].includes(nfv)) return null
    celula = { r: nr, fv: nfv }
  }
  return { perfil: (perfil as PerfilRfv) || null, celula, busca: (q.get("busca") ?? "").slice(0, 100) }
}
