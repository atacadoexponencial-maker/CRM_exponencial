"use client"

import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"

import { chaveCombinacao, combinacoes, MAX_TIPOS_VARIACAO, type EstoquePorCombinacao, type TipoVariacao } from "@/lib/catalogo/combinacoes"

export { chaveCombinacao, combinacoes, MAX_TIPOS_VARIACAO, type EstoquePorCombinacao, type TipoVariacao }

interface VariacoesEstoqueProps {
  tipos: TipoVariacao[]
  estoque: EstoquePorCombinacao
  onMudarTipos: (tipos: TipoVariacao[]) => void
  onMudarEstoque: (chave: string, quantidade: number) => void
  /** Gera o id de um tipo novo (o protótipo usa um contador; o real, o banco). */
  novoId: () => string
}

export function VariacoesEstoque({ tipos, estoque, onMudarTipos, onMudarEstoque, novoId }: VariacoesEstoqueProps) {
  const [novaOpcao, setNovaOpcao] = useState<Record<string, string>>({})
  const [removendo, setRemovendo] = useState<{ tipoId: string; opcao: string; pecas: number } | null>(null)

  const linhas = combinacoes(tipos)

  function adicionarTipo() {
    onMudarTipos([...tipos, { id: novoId(), nome: tipos.length === 0 ? "Tamanho" : "Cor", opcoes: [] }])
  }

  function renomearTipo(id: string, nome: string) {
    onMudarTipos(tipos.map((t) => (t.id === id ? { ...t, nome } : t)))
  }

  function removerTipo(id: string) {
    onMudarTipos(tipos.filter((t) => t.id !== id))
  }

  function adicionarOpcao(tipoId: string) {
    const valor = (novaOpcao[tipoId] ?? "").trim()
    const tipo = tipos.find((t) => t.id === tipoId)
    if (!valor || !tipo || tipo.opcoes.some((o) => o.toLowerCase() === valor.toLowerCase())) return
    onMudarTipos(tipos.map((t) => (t.id === tipoId ? { ...t, opcoes: [...t.opcoes, valor] } : t)))
    setNovaOpcao((atual) => ({ ...atual, [tipoId]: "" }))
  }

  function pecasDaOpcao(tipoId: string, opcao: string): number {
    const indice = tipos.filter((t) => t.opcoes.length > 0).findIndex((t) => t.id === tipoId)
    if (indice < 0) return 0
    return linhas.filter((l) => l[indice] === opcao).reduce((soma, l) => soma + (estoque[chaveCombinacao(l)] ?? 0), 0)
  }

  function pedirRemocaoOpcao(tipoId: string, opcao: string) {
    const pecas = pecasDaOpcao(tipoId, opcao)
    if (pecas > 0) {
      setRemovendo({ tipoId, opcao, pecas })
      return
    }
    removerOpcao(tipoId, opcao)
  }

  function removerOpcao(tipoId: string, opcao: string) {
    onMudarTipos(tipos.map((t) => (t.id === tipoId ? { ...t, opcoes: t.opcoes.filter((o) => o !== opcao) } : t)))
  }

  return (
    <div className="space-y-4">
      {tipos.map((tipo) => (
        <div key={tipo.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={tipo.nome}
              onChange={(e) => renomearTipo(tipo.id, e.target.value)}
              className="h-8 max-w-48 font-medium"
              aria-label="Nome do tipo de variação"
            />
            <Button size="icon-sm" variant="ghost" onClick={() => removerTipo(tipo.id)} aria-label={`Remover ${tipo.nome}`}>
              <Trash2 />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tipo.opcoes.map((o) => (
              <span key={o} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 pl-2 pr-1 py-0.5 text-sm">
                {o}
                <button
                  type="button"
                  onClick={() => pedirRemocaoOpcao(tipo.id, o)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={`Remover opção ${o}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <div className="flex gap-1">
              <Input
                value={novaOpcao[tipo.id] ?? ""}
                onChange={(e) => setNovaOpcao((atual) => ({ ...atual, [tipo.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarOpcao(tipo.id) } }}
                placeholder={tipo.nome === "Cor" ? "Ex.: Azul" : "Ex.: M"}
                className="h-7 w-28"
                aria-label={`Nova opção de ${tipo.nome}`}
              />
              <Button size="sm" variant="outline" onClick={() => adicionarOpcao(tipo.id)}>Adicionar</Button>
            </div>
          </div>
        </div>
      ))}

      {tipos.length < MAX_TIPOS_VARIACAO && (
        <Button size="sm" variant="outline" onClick={adicionarTipo}>
          <Plus className="size-4" />
          {tipos.length === 0 ? "Adicionar variação (ex.: Tamanho)" : "Adicionar outro tipo (ex.: Cor)"}
        </Button>
      )}

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {linhas.length === 1 && linhas[0].length === 0 ? "Produto sem variação" : "Combinação"}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-36">Estoque</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const chave = chaveCombinacao(l)
              return (
                <tr key={chave || "unico"} className="border-b last:border-0">
                  <td className="px-3 py-1.5">{chave || "Estoque do produto"}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={estoque[chave] ?? 0}
                      onChange={(e) => onMudarEstoque(chave, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                      className="h-7 text-right tabular-nums"
                      aria-label={`Estoque de ${chave || "produto"}`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={removendo !== null} onOpenChange={(aberto) => { if (!aberto) setRemovendo(null) }}>
        <DialogPopup className="max-w-sm">
          <DialogTitle>Remover a opção {removendo?.opcao}?</DialogTitle>
          <DialogDescription className="mt-2">
            As combinações com {removendo?.opcao} somam {removendo?.pecas} peças em estoque. Elas saem da grade e da loja.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { if (removendo) removerOpcao(removendo.tipoId, removendo.opcao); setRemovendo(null) }}
            >
              Remover
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}
