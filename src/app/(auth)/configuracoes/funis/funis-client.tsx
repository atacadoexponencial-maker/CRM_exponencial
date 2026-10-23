"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CORES_PRONTAS, LIMITE_DE_ETAPAS, NOME_MAXIMO, ehCorPropria } from "@/lib/funis"
import { adicionarEtapa, criarFunil, editarEtapa, renomearFunil, type FunilParaGerenciar, type FunisParaGerenciar } from "./actions"

// Amostra das cores prontas com as mesmas cores das colunas do quadro (B15-02).
const AMOSTRA: Record<string, string> = {
  verde: "bg-sucesso",
  amarelo: "bg-aviso",
  cinza: "bg-muted-foreground/50",
  laranja: "bg-orange-600 dark:bg-orange-400",
  vermelho: "bg-erro",
}

/** Escolha de cor: sem cor, uma das prontas ou "outra cor" (#rrggbb). */
function SeletorDeCor({ cor, onChange, rotulo }: { cor: string | null; onChange: (cor: string | null) => void; rotulo: string }) {
  const propria = cor && ehCorPropria(cor) ? cor : null
  return (
    <div role="group" aria-label={`Cor de ${rotulo}`} className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={!cor}
        aria-label="Sem cor"
        onClick={() => onChange(null)}
        className={cn("size-6 rounded-full border border-border bg-card", !cor && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
      />
      {CORES_PRONTAS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={cor === c.id}
          aria-label={c.rotulo}
          onClick={() => onChange(c.id)}
          className={cn("size-6 rounded-full", AMOSTRA[c.id], cor === c.id && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
        />
      ))}
      <label
        className={cn(
          "flex h-6 cursor-pointer items-center gap-1 rounded-full border border-border px-2 text-xs text-muted-foreground",
          propria && "ring-2 ring-ring ring-offset-1 ring-offset-background"
        )}
      >
        <span className="size-3 rounded-full border border-border" style={propria ? { backgroundColor: propria } : undefined} />
        Outra cor
        <input
          type="color"
          aria-label={`Outra cor de ${rotulo}`}
          value={propria ?? "#4f46e5"}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  )
}

type EtapaNova = { nome: string; cor: string | null }

function NovoFunil({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState("")
  const [etapas, setEtapas] = useState<EtapaNova[]>([{ nome: "", cor: null }])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function mudarEtapa(i: number, mudanca: Partial<EtapaNova>) {
    setEtapas((lista) => lista.map((e, j) => (j === i ? { ...e, ...mudanca } : e)))
  }

  async function salvar() {
    setErro(null)
    setSalvando(true)
    try {
      const r = await criarFunil(nome, etapas)
      if (r.erro) { setErro(r.erro); return }
      onCriado()
    } catch {
      setErro("Não foi possível criar o funil. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section aria-label="Novo funil" className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Novo funil</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span>Nome do funil</span>
        <Input value={nome} maxLength={NOME_MAXIMO} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Feira de Março" />
      </label>
      <div className="space-y-2">
        <span className="text-sm">Etapas, na ordem das colunas</span>
        {etapas.map((etapa, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center">
            <Input
              aria-label={`Nome da etapa ${i + 1}`}
              value={etapa.nome}
              maxLength={NOME_MAXIMO}
              onChange={(e) => mudarEtapa(i, { nome: e.target.value })}
              placeholder={`Etapa ${i + 1}`}
              className="sm:max-w-56"
            />
            <SeletorDeCor rotulo={`etapa ${i + 1}`} cor={etapa.cor} onChange={(cor) => mudarEtapa(i, { cor })} />
            {etapas.length > 1 && (
              <button
                type="button"
                aria-label={`Tirar a etapa ${i + 1}`}
                onClick={() => setEtapas((lista) => lista.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground sm:ml-auto"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {etapas.length < LIMITE_DE_ETAPAS && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEtapas((lista) => [...lista, { nome: "", cor: null }])}>
            <Plus className="size-3.5" />
            Acrescentar etapa
          </Button>
        )}
      </div>
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onFechar}>Cancelar</Button>
        <Button type="button" size="sm" disabled={salvando} onClick={salvar}>{salvando ? "Criando..." : "Criar funil"}</Button>
      </div>
    </section>
  )
}

function EtapaEditavel({ etapa, onSalvo }: { etapa: FunilParaGerenciar["etapas"][number]; onSalvo: () => void }) {
  const [nome, setNome] = useState(etapa.nome)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(mudancas: { nome?: string; cor?: string | null }) {
    setErro(null)
    setSalvando(true)
    try {
      const r = await editarEtapa(etapa.id, mudancas)
      if (r.erro) { setErro(r.erro); return }
      onSalvo()
    } catch {
      setErro("Não foi possível salvar a etapa. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <li className="space-y-1.5 rounded-md border border-border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          aria-label={`Nome da etapa ${etapa.nome}`}
          value={nome}
          maxLength={NOME_MAXIMO}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => { if (nome.trim() !== etapa.nome) void salvar({ nome }) }}
          className="sm:max-w-56"
        />
        <SeletorDeCor rotulo={etapa.nome} cor={etapa.cor} onChange={(cor) => void salvar({ cor })} />
        {salvando && <span className="text-xs text-muted-foreground">Salvando...</span>}
      </div>
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </li>
  )
}

function EditorDoFunil({ funil, onFechar, onSalvo }: { funil: FunilParaGerenciar; onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(funil.nome)
  const [novaEtapa, setNovaEtapa] = useState<EtapaNova>({ nome: "", cor: null })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function executar(acao: () => Promise<{ erro?: string }>, depois?: () => void) {
    setErro(null)
    setSalvando(true)
    try {
      const r = await acao()
      if (r.erro) { setErro(r.erro); return }
      depois?.()
      onSalvo()
    } catch {
      setErro("Não foi possível salvar. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section aria-label={`Editar ${funil.nome}`} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Editar funil</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1 space-y-1.5 text-sm">
          <span>Nome do funil</span>
          <Input value={nome} maxLength={NOME_MAXIMO} onChange={(e) => setNome(e.target.value)} />
        </label>
        <Button type="button" size="sm" variant="outline" disabled={salvando || nome.trim() === funil.nome} onClick={() => executar(() => renomearFunil(funil.id, nome))}>
          Salvar nome
        </Button>
      </div>
      <div className="space-y-2">
        <span className="text-sm">Etapas</span>
        <ul className="space-y-2">
          {funil.etapas.map((e) => (
            <EtapaEditavel key={e.id} etapa={e} onSalvo={onSalvo} />
          ))}
        </ul>
        {funil.etapas.length < LIMITE_DE_ETAPAS && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Nome da nova etapa"
              value={novaEtapa.nome}
              maxLength={NOME_MAXIMO}
              onChange={(e) => setNovaEtapa((n) => ({ ...n, nome: e.target.value }))}
              placeholder="Nova etapa"
              className="sm:max-w-56"
            />
            <SeletorDeCor rotulo="nova etapa" cor={novaEtapa.cor} onChange={(cor) => setNovaEtapa((n) => ({ ...n, cor }))} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={salvando}
              onClick={() => executar(() => adicionarEtapa(funil.id, novaEtapa.nome, novaEtapa.cor), () => setNovaEtapa({ nome: "", cor: null }))}
              className="sm:ml-auto"
            >
              <Plus className="size-3.5" />
              Acrescentar etapa
            </Button>
          </div>
        )}
      </div>
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </section>
  )
}

export function FunisClient({ dados }: { dados: FunisParaGerenciar }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const editando = dados.funis.find((f) => f.id === editandoId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Funis</h1>
          <p className="mt-1 text-sm text-muted-foreground">Funis da empresa além de Entrada e Recompra, cada um com as próprias etapas.</p>
        </div>
        {!criando && (
          <Button size="sm" onClick={() => { setCriando(true); setEditandoId(null) }}>
            <Plus className="size-3.5" />
            Novo funil
          </Button>
        )}
      </div>

      {criando && <NovoFunil onFechar={() => setCriando(false)} onCriado={() => { setCriando(false); router.refresh() }} />}
      {editando && <EditorDoFunil key={editando.id} funil={editando} onFechar={() => setEditandoId(null)} onSalvo={() => router.refresh()} />}

      <ul aria-label="Lista de funis" className="divide-y divide-border rounded-lg border border-border bg-card">
        {dados.fixos.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
              <Link href={f.id === "entrada" ? "/pipeline" : "/pipeline/recompra"} className="font-medium hover:underline">{f.nome}</Link>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">fixo</span>
            </span>
            <span className="numero text-xs text-muted-foreground">{f.etapas} etapas</span>
          </li>
        ))}
        {dados.funis.map((f) => (
          <li key={f.id} data-funil={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <Link href={`/pipeline/funil/${f.id}`} className="font-medium hover:underline">{f.nome}</Link>
            <span className="flex items-center gap-4">
              <span className="numero text-xs text-muted-foreground">
                {f.etapas.length} {f.etapas.length === 1 ? "etapa" : "etapas"} · {f.cards} {f.cards === 1 ? "card" : "cards"}
              </span>
              <Button size="sm" variant="ghost" onClick={() => { setEditandoId(f.id); setCriando(false) }}>Editar</Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
