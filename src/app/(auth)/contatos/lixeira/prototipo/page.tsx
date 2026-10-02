"use client"

// Protótipo B13-01: a lixeira de contatos e o diálogo de exclusão.
//
// Rota temporária, fora do menu, com dados fixos: nenhum botão grava nada.
// Sai do repositório na B13-04, quando a lixeira estiver ligada aos dados reais.

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Phone, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DialogoExcluirContato } from "../../components/dialogo-excluir-contato"
import { ListaLixeira } from "../components/lista-lixeira"
import { ITENS_EXEMPLO, VARIACOES_DIALOGO, type VariacaoDialogo } from "./dados-exemplo"

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export default function PrototipoLixeiraPage() {
  const [vazia, setVazia] = useState(false)
  const [variacao, setVariacao] = useState<VariacaoDialogo | null>(null)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <p className="mb-8 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Protótipo B13-01 — dados de exemplo. Nenhum botão grava nada.
      </p>

      <Secao titulo="Lixeira (/contatos/lixeira)">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/contatos"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Contatos
            </Link>
            <h1 className="text-xl font-semibold">Lixeira</h1>
          </div>
          <div className="flex gap-1 rounded-lg bg-secondary p-1 text-sm">
            <button
              type="button"
              onClick={() => setVazia(false)}
              className={`rounded-md px-3 py-1 ${!vazia ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              Com itens
            </button>
            <button
              type="button"
              onClick={() => setVazia(true)}
              className={`rounded-md px-3 py-1 ${vazia ? "bg-background text-foreground" : "text-muted-foreground"}`}
            >
              Vazia
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Itens na lixeira são apagados de vez após 30 dias.
        </p>
        <ListaLixeira itens={vazia ? [] : ITENS_EXEMPLO} onRestaurar={() => {}} onApagarDeVez={() => {}} />
      </Secao>

      <Secao titulo="Diálogo de exclusão (painel do card, lista e perfil)">
        <div className="flex flex-wrap gap-2">
          {VARIACOES_DIALOGO.map((v) => (
            <Button key={v.id} variant="outline" onClick={() => setVariacao(v)}>
              {v.rotulo}
            </Button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Onde fica o botão">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Painel do card (topo)</p>
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="font-semibold">Teste Cliente</span>
                <X className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-2 px-4 py-3 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" aria-hidden /> +55 21 9999-9999
                </p>
                <p>
                  <span className="text-muted-foreground">Funil:</span> Entrada
                </p>
              </div>
              <div className="border-t border-border px-4 py-3">
                <Button variant="destructive" size="sm" onClick={() => setVariacao(VARIACOES_DIALOGO[0])}>
                  <Trash2 className="size-3.5" aria-hidden />
                  Excluir
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Lista de contatos</p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xl font-semibold">Contatos</span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Trash2 className="size-3.5" aria-hidden />
                Lixeira (4)
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium">Teste Cliente</td>
                    <td className="px-4 py-3 text-muted-foreground">+55 21 9999-9999</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir"
                        onClick={() => setVariacao(VARIACOES_DIALOGO[0])}
                      >
                        <Trash2 className="size-3.5 text-destructive" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Perfil do contato (topo)</p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="font-semibold">Empório São Jorge</p>
                <p className="text-xs text-muted-foreground">+55 41 88012-2345</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setVariacao(VARIACOES_DIALOGO[2])}>
                <Trash2 className="size-3.5" aria-hidden />
                Excluir contato
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">Perfil de um contato que está na lixeira</p>
            <div className="rounded-lg border border-border bg-card px-4 py-4">
              <p className="mb-1 font-semibold">Este contato está na lixeira</p>
              <p className="mb-3 text-sm text-muted-foreground">
                Excluído por Carlos em 20/09/2026. Será apagado de vez em 18 dias.
              </p>
              <div className="flex gap-2">
                <Button size="sm">Restaurar</Button>
                <Button variant="outline" size="sm">
                  Ir para a lixeira
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Secao>

      {variacao && (
        <DialogoExcluirContato
          aberto
          onAbertoChange={(aberto) => !aberto && setVariacao(null)}
          nome={variacao.nome}
          telefone={variacao.telefone}
          funis={variacao.funis}
          funilDeOrigem={variacao.funilDeOrigem}
          conversas={variacao.conversas}
          mensagens={variacao.mensagens}
          erro={variacao.erro}
          onConfirmar={() => setVariacao(null)}
        />
      )}
    </div>
  )
}
