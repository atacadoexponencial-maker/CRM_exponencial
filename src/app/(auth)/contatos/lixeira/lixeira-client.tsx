"use client"

// B13-04: a lixeira de contatos. Liga a lista da B13-01 às ações do servidor;
// quem pode ver, restaurar e apagar é decidido lá.

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ListaLixeira, type ItemLixeira } from "./components/lista-lixeira"
import { apagarContatoDeVez, restaurarContato } from "./actions"

export function LixeiraClient({ itens }: { itens: ItemLixeira[] }) {
  const router = useRouter()
  const [removidos, setRemovidos] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)

  async function agir(id: string, acao: (id: string) => Promise<{ ok: true } | { erro: string }>) {
    setErro(null)
    try {
      const r = await acao(id)
      if ("erro" in r) {
        setErro(r.erro)
        router.refresh()
        return
      }
      setRemovidos((prev) => new Set(prev).add(id))
    } catch {
      setErro("Não foi possível concluir. Tente de novo.")
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/contatos"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Contatos
        </Link>
        <h1 className="text-xl font-semibold">Lixeira</h1>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Itens na lixeira são apagados de vez após 30 dias.
      </p>

      {erro && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
      )}

      <ListaLixeira
        itens={itens.filter((i) => !removidos.has(i.id))}
        onRestaurar={(id) => agir(id, restaurarContato)}
        onApagarDeVez={(id) => agir(id, apagarContatoDeVez)}
      />
    </div>
  )
}
