"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { avisar } from "@/lib/aviso-na-tela"
import type { Alcance } from "@/lib/alcance"
import { salvarPermissoes, type Permissoes } from "./actions"

const OPCOES: { valor: Alcance; nome: string; efeito: string }[] = [
  {
    valor: "atribuidos",
    nome: "Só os atribuídos a ele",
    efeito:
      "Lead novo sem dono só aparece para quem vê os sem dono, até alguém atribuir. Use a automação 'Atribuir ao time' para distribuir na chegada.",
  },
  {
    valor: "atribuidos_e_sem_dono",
    nome: "Os dele e os sem dono",
    efeito: "Vê também o lead novo que ainda não tem dono, e quem responde primeiro vira o dono.",
  },
  {
    valor: "todos",
    nome: "Todos da empresa",
    efeito: "Vê e atende tudo da empresa, mas só o Admin e o Gerente trocam o dono.",
  },
]

const CARGOS: { chave: keyof Permissoes; nome: string }[] = [
  { chave: "atendente", nome: "Atendente" },
  { chave: "gerente", nome: "Gerente" },
]

export function PermissoesClient({ inicial }: { inicial: Permissoes }) {
  const router = useRouter()
  const [escolha, setEscolha] = useState(inicial)
  const [salvo, setSalvo] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const mudou = escolha.atendente !== salvo.atendente || escolha.gerente !== salvo.gerente

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const res = await salvarPermissoes(escolha)
    setSalvando(false)
    if (res.erro) {
      setErro(res.erro)
      return
    }
    setSalvo(escolha)
    avisar("Permissões salvas")
    router.refresh()
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-2">Permissões</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xl">
        O que cada cargo vê de conversas, contatos e cards. Vale para todos com o cargo na empresa.
      </p>

      <div className="space-y-4 max-w-xl">
        <section aria-label="Admin" className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Admin</h2>
          <p className="text-sm text-muted-foreground">Vê tudo da empresa</p>
        </section>

        {CARGOS.map((cargo) => {
          const marcada = OPCOES.find((o) => o.valor === escolha[cargo.chave])
          return (
            <fieldset key={cargo.chave} aria-label={cargo.nome} className="rounded-lg border border-border p-4 space-y-2">
              <legend className="px-1 text-sm font-semibold">{cargo.nome}</legend>
              {OPCOES.map((opcao) => (
                <label key={opcao.valor} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`alcance-${cargo.chave}`}
                    value={opcao.valor}
                    checked={escolha[cargo.chave] === opcao.valor}
                    onChange={() => setEscolha((e) => ({ ...e, [cargo.chave]: opcao.valor }))}
                    className="accent-primary"
                  />
                  {opcao.nome}
                </label>
              ))}
              {marcada && <p className="text-sm text-muted-foreground pt-1">{marcada.efeito}</p>}
            </fieldset>
          )
        })}

        {erro && (
          <p role="alert" className="text-sm text-erro">
            {erro}
          </p>
        )}
        <Button size="sm" onClick={salvar} disabled={salvando || !mudou}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </>
  )
}
