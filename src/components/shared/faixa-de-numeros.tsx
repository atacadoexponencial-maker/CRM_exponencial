// B36-04 (compartilhada na B36-11): grupo de números em faixa única, separada por linhas finas (o livro-caixa do
// quadro Caderno), no lugar de uma fileira de cartões iguais. Valor em fonte de número;
// a variação sobre o período anterior em verde quando sobe e vermelho quando cai.

import { cn } from "@/lib/utils"
import type { Variacao } from "@/lib/painel-dashboard"

export type NumeroDaFaixa = {
  rotulo: string
  valor: string | number | null
  sufixo?: string
  variacao?: Variacao
}

function textoDaVariacao(v: NonNullable<Variacao>): string {
  const sinal = v.valor > 0 ? "+" : v.valor < 0 ? "−" : ""
  const numero = Math.abs(v.valor)
  return v.unidade === "pp" ? `${sinal}${numero} p.p.` : `${sinal}${numero}%`
}

export function FaixaDeNumeros({ itens, destaque = false, className }: { itens: NumeroDaFaixa[]; destaque?: boolean; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] border-b",
        destaque ? "border-t-2 border-t-foreground" : "border-t",
        className
      )}
    >
      {itens.map((n) => (
        <div key={n.rotulo} className="flex flex-col-reverse gap-1 py-4 pr-5" data-numero={n.rotulo}>
          <dt className="text-xs text-muted-foreground">
            {n.rotulo}
            {n.variacao && (
              <span
                data-variacao={n.variacao.valor > 0 ? "alta" : n.variacao.valor < 0 ? "queda" : "igual"}
                className={cn(
                  "ml-1.5 font-medium",
                  n.variacao.valor > 0 ? "text-alta" : n.variacao.valor < 0 ? "text-queda" : "text-muted-foreground"
                )}
              >
                {textoDaVariacao(n.variacao)}
              </span>
            )}
          </dt>
          <dd className={cn("numero font-medium tracking-tight", destaque ? "text-[28px] leading-none" : "text-2xl leading-none")}>
            {n.valor === null ? "—" : `${n.valor}${n.sufixo ?? ""}`}
          </dd>
        </div>
      ))}
    </dl>
  )
}
