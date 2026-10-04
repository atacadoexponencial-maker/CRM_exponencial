"use client"

// Importar produtos por planilha (B18): baixar o modelo, enviar o arquivo e conferir a prévia.

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { COLUNAS_PLANILHA } from "@/lib/catalogo/planilha"
import type { PreviaImportacao as Previa } from "@/lib/catalogo/importacao"
import { AbasCatalogo } from "../components/abas-catalogo"
import { ALVOS_TOQUE_CELULAR } from "../components/alvos-toque"
import { PreviaImportacao } from "../components/previa-importacao"
import { HREFS_CATALOGO } from "../produtos-client"
import { importarLote, previaImportacao } from "./actions"

/** Produtos por envio: o progresso anda a cada lote. */
const POR_LOTE = 10

interface Resultado {
  novos: number
  atualizados: number
  falhas: { codigo: string; texto: string }[]
  avisos: { codigo: string; texto: string }[]
}

export function ImportarClient() {
  const entrada = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function enviar(escolhido: File | undefined) {
    if (!escolhido) return
    setArquivo(escolhido)
    setPrevia(null)
    setErro(null)
    setLendo(true)
    const dados = new FormData()
    dados.set("arquivo", escolhido)
    const r = await previaImportacao(dados).catch(() => ({ erro: "Não deu para enviar a planilha. Tente de novo." }))
    setLendo(false)
    if ("erro" in r) setErro(r.erro)
    else setPrevia(r.previa)
  }

  async function importar() {
    if (!arquivo || !previa) return
    const codigos = previa.itens.map((i) => i.codigo)
    const total: Resultado = { novos: 0, atualizados: 0, falhas: [], avisos: [] }
    setErro(null)
    setProgresso({ feitos: 0, total: codigos.length })
    for (let i = 0; i < codigos.length; i += POR_LOTE) {
      const lote = codigos.slice(i, i + POR_LOTE)
      const dados = new FormData()
      dados.set("arquivo", arquivo)
      dados.set("codigos", JSON.stringify(lote))
      const r = await importarLote(dados).catch(() => ({ erro: "A conexão caiu no meio da importação." }))
      if ("erro" in r) {
        total.falhas.push(...lote.map((codigo) => ({ codigo, texto: r.erro })))
      } else {
        total.novos += r.lote.novos
        total.atualizados += r.lote.atualizados
        total.falhas.push(...r.lote.falhas)
        total.avisos.push(...r.lote.avisos)
      }
      setProgresso({ feitos: Math.min(codigos.length, i + lote.length), total: codigos.length })
    }
    setProgresso(null)
    setResultado(total)
  }

  function recomecar() {
    setArquivo(null)
    setPrevia(null)
    setErro(null)
    setResultado(null)
    if (entrada.current) entrada.current.value = ""
  }

  const prontos = previa ? previa.novos + previa.atualizados : 0

  return (
    <div className={`max-w-6xl mx-auto w-full px-4 py-8 ${ALVOS_TOQUE_CELULAR}`}>
      <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
      <AbasCatalogo ativa="produtos" hrefs={HREFS_CATALOGO} />

      <div className="max-w-3xl space-y-6">
        <Link href="/catalogo" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Produtos
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Importar produtos por planilha</h2>
          <p className="text-sm text-muted-foreground mt-1">Cadastre ou atualize vários produtos de uma vez. Nada é gravado antes de você conferir a prévia.</p>
        </div>

        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">1. Baixe o modelo</h3>
          <p className="text-sm text-muted-foreground">
            Preencha no Excel ou no Google Planilhas. Só <strong className="text-foreground">Código, Nome e Preço</strong> são obrigatórios. Produto com variação ocupa uma linha por combinação, todas com o mesmo código.
          </p>
          <a href="/catalogo/importar/modelo" download data-slot="button" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Download className="size-4 mr-1.5" />
            Baixar modelo
          </a>
          <details className="group">
            <summary className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">Como preencher</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Coluna</th>
                    <th className="py-1.5 pr-3 font-medium">O que vai nela</th>
                    <th className="py-1.5 font-medium">Exemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {COLUNAS_PLANILHA.map((c) => (
                    <tr key={c.chave} className="align-top">
                      <td className="py-2 pr-3 whitespace-nowrap font-medium">{c.titulo}{c.obrigatoria && <span className="text-amber-300"> *</span>}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.oQueVai}</td>
                      <td className="py-2 font-mono text-xs break-all">{c.exemplo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">* obrigatória. Reimportar com o mesmo código atualiza o produto; coluna vazia não apaga o que ele já tem.</p>
            </div>
          </details>
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">2. Envie a planilha</h3>
          {!previa && (
            <label
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center cursor-pointer transition-colors",
                arrastando ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              )}
              onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files?.[0]) }}
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">{lendo ? "Lendo a planilha..." : "Escolher a planilha"}</span>
              <span className="text-xs text-muted-foreground">Excel (.xlsx) ou .csv do Google Planilhas · até 1.000 linhas e 4 MB</span>
              <input
                ref={entrada}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                disabled={lendo}
                onChange={(e) => enviar(e.target.files?.[0])}
              />
            </label>
          )}
          {arquivo && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4 shrink-0" />
              <span className="truncate">{arquivo.name}</span>
            </p>
          )}
          {erro && <p className="text-sm text-amber-300" role="alert">{erro}</p>}
          {(previa || erro) && !resultado && progresso === null && (
            <button type="button" onClick={recomecar} data-slot="button" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Enviar outro arquivo
            </button>
          )}
        </section>

        {previa && !resultado && (
          <section className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">3. Confira antes de importar</h3>
            <PreviaImportacao previa={previa} />
            {prontos === 0 ? (
              <p className="text-sm text-amber-300">Nenhum produto pode ser importado. Corrija a planilha.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button onClick={importar} disabled={progresso !== null}>
                  {progresso ? `Importando ${progresso.feitos} de ${progresso.total}...` : `Importar ${prontos} ${prontos === 1 ? "produto" : "produtos"}`}
                </Button>
                {previa.comErro > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {previa.comErro === 1 ? "O produto com erro fica de fora." : `Os ${previa.comErro} produtos com erro ficam de fora.`} Corrija a planilha e envie de novo para incluí-los.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {resultado && (
          <section className="rounded-lg border p-4 space-y-3" role="status">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-emerald-300" />
              {resultado.novos + resultado.atualizados} {resultado.novos + resultado.atualizados === 1 ? "produto importado" : "produtos importados"}: {resultado.novos} {resultado.novos === 1 ? "novo" : "novos"} e {resultado.atualizados} {resultado.atualizados === 1 ? "atualizado" : "atualizados"}.
            </h3>
            {resultado.falhas.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-amber-300">Não entraram:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {resultado.falhas.map((f, i) => <li key={i}>{f.codigo ? `${f.codigo}: ` : ""}{f.texto.startsWith(`${f.codigo}:`) ? f.texto.slice(f.codigo.length + 1).trim() : f.texto}</li>)}
                </ul>
              </div>
            )}
            {resultado.avisos.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-amber-300">Fotos que não entraram (o produto entrou sem elas):</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {resultado.avisos.map((a, i) => <li key={i}>{a.codigo}: {a.texto}</li>)}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href="/catalogo" data-slot="button" className={buttonVariants({ size: "sm" })}>Ver produtos</Link>
              <button type="button" onClick={recomecar} data-slot="button" className={buttonVariants({ size: "sm", variant: "outline" })}>Importar outra planilha</button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
