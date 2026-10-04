// Peças dos protótipos do catálogo que ainda ficam no ar (aparência, configurações e
// pedidos) até as issues que trocam cada um por dados reais (B16-07, B16-08, B16-10).

import type { ProdutoEditavel } from "../components/editor-produto"
import { estoqueTotal as somaEstoque } from "@/lib/catalogo/combinacoes"

export const HREFS_PROTOTIPO = {
  produtos: "/catalogo",
  aparencia: "/catalogo/prototipo/aparencia",
  configuracoes: "/catalogo/prototipo/configuracoes",
  pedidos: "/catalogo/prototipo/pedidos",
}

export function FaixaPrototipo({ children }: { children?: React.ReactNode }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-200">
      <strong>Protótipo do catálogo:</strong> dados de exemplo, nada é gravado. Recarregar a página volta ao início.{" "}
      {children}
    </div>
  )
}

export function estoqueTotal(p: ProdutoEditavel): number {
  return somaEstoque(p.tipos, p.estoque)
}
