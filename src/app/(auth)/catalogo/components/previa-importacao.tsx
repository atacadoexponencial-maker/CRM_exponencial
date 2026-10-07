"use client"

// Prévia da importação por planilha (B18). Só desenha o que o servidor montou.

import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PreviaImportacao as Previa } from "@/lib/catalogo/importacao"

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`
}

export function PreviaImportacao({ previa }: { previa: Previa }) {
  return (
    <div className="space-y-4">
      <p className="text-sm" role="status">
        <span className="font-semibold">{plural(previa.novos, "produto novo", "produtos novos")}</span>
        {" · "}
        <span className="font-semibold">{plural(previa.atualizados, "atualizado", "atualizados")}</span>
        {previa.comErro > 0 && (
          <>
            {" · "}
            <span className="font-semibold text-amber-300">{plural(previa.comErro, "com erro", "com erro")}</span>
          </>
        )}
      </p>

      {previa.erros.length > 0 && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2" aria-label="Erros da planilha">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
            <AlertTriangle className="size-4" />
            O que corrigir na planilha
          </h3>
          <ul className="space-y-1 text-sm">
            {previa.erros.map((e, i) => <li key={i}>{e.texto}</li>)}
          </ul>
        </section>
      )}

      {previa.itens.length > 0 && (
        <ul className="divide-y rounded-lg border" aria-label="Produtos da planilha">
          {previa.itens.map((item) => (
            <li key={item.codigo} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium truncate">{item.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {item.codigo}
                  {" · "}{item.combinacoes > 1 ? plural(item.combinacoes, "combinação", "combinações") : "sem variação"}
                  {" · estoque "}{item.estoqueTotal}
                  {" · "}{plural(item.fotos, "foto", "fotos")}
                </p>
                {item.situacao === "atualiza" && (
                  <p className="text-xs text-muted-foreground">{item.mudancas.length > 0 ? item.mudancas.join(" · ") : "Sem mudanças"}</p>
                )}
              </div>
              <Badge variant="outline" className={item.situacao === "novo" ? "shrink-0 border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : "shrink-0 border-sky-500/30 bg-sky-500/15 text-sky-300"}>
                {item.situacao === "novo" ? "Novo" : "Atualiza"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
