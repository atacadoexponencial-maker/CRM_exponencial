"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CORES_PRONTAS, LIMITE_DE_ETAPAS, NOME_MAXIMO, ehCorPropria } from "@/lib/funis"
import { adicionarEtapa, apagarEtapa, apagarFunil, automacoesQueUsam, criarFunil, editarEtapa, moverEtapa, renomearFunil, type FunilParaGerenciar, type FunisParaGerenciar } from "./actions"
import { avisar } from "@/lib/aviso-na-tela"

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

/**
 * B41-04: no aviso de apagar, as automações que usam o funil ou a etapa. Elas são
 * desligadas e ficam "precisando de ajuste" até alguém escolher outro funil ou etapa.
 */
function AutomacoesAfetadas({ alvo }: { alvo: { funil: string } | { etapa: string } }) {
  const id = "funil" in alvo ? alvo.funil : alvo.etapa
  const [nomes, setNomes] = useState<string[] | null>(null)
  useEffect(() => {
    let ativo = true
    automacoesQueUsam("funil" in alvo ? { funil: id } : { etapa: id })
      .then((r) => { if (ativo) setNomes((r.automacoes ?? []).map((a) => a.nome)) })
      .catch(() => { if (ativo) setNomes([]) })
    return () => { ativo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  if (!nomes || nomes.length === 0) return null
  return (
    <div role="alert" className="space-y-1 rounded-md border border-aviso/40 px-3 py-2 text-xs">
      <p className="font-medium">
        {nomes.length === 1 ? "Esta automação usa" : "Estas automações usam"} {"funil" in alvo ? "este funil" : "esta etapa"} e {nomes.length === 1 ? "vai ser desligada" : "vão ser desligadas"} até alguém escolher outro funil ou etapa:
      </p>
      <ul className="list-disc pl-4">
        {nomes.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </div>
  )
}

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
      avisar("Funil salvo")
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

type EtapaDoEditor = FunilParaGerenciar["etapas"][number]

function EtapaEditavel({ etapa, posicao, outras, onSalvo }: { etapa: EtapaDoEditor; posicao: number; outras: EtapaDoEditor[]; onSalvo: () => void }) {
  const [nome, setNome] = useState(etapa.nome)
  const [prazo, setPrazo] = useState(etapa.paradoDias?.toString() ?? "")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [apagando, setApagando] = useState(false)
  const [destino, setDestino] = useState("")
  const total = outras.length + 1

  async function executar(acao: () => Promise<{ erro?: string }>) {
    setErro(null)
    setSalvando(true)
    try {
      const r = await acao()
      if (r.erro) { setErro(r.erro); return }
      setApagando(false)
      onSalvo()
    } catch {
      setErro("Não foi possível salvar. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  async function salvar(mudancas: { nome?: string; cor?: string | null; paradoDias?: string | null }) {
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
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Avisar parado depois de
          <Input
            aria-label={`Prazo de parado de ${etapa.nome}`}
            inputMode="numeric"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            onBlur={() => { if (prazo.trim() !== (etapa.paradoDias?.toString() ?? "")) void salvar({ paradoDias: prazo.trim() || null }) }}
            placeholder="—"
            className="h-7 w-14 px-2 text-center"
          />
          dias
        </label>
        <span className="numero text-xs text-muted-foreground">{etapa.cards} {etapa.cards === 1 ? "card" : "cards"}</span>
        <span className="flex items-center gap-1 sm:ml-auto">
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Subir ${etapa.nome}`} disabled={salvando || posicao === 0} onClick={() => executar(() => moverEtapa(etapa.id, "subir"))}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Descer ${etapa.nome}`} disabled={salvando || posicao === total - 1} onClick={() => executar(() => moverEtapa(etapa.id, "descer"))}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Apagar ${etapa.nome}`}
            title={total === 1 ? "O funil precisa de ao menos uma etapa" : undefined}
            disabled={salvando || total === 1}
            onClick={() => { setErro(null); setDestino(""); setApagando(true) }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </span>
        {salvando && <span className="text-xs text-muted-foreground">Salvando...</span>}
      </div>
      {apagando && (
        <div role="group" aria-label={`Apagar ${etapa.nome}`} className="space-y-2 rounded-md bg-muted/60 p-3 text-sm">
          <AutomacoesAfetadas alvo={{ etapa: etapa.id }} />
          {etapa.cards > 0 ? (
            <label className="block space-y-1.5">
              <span>
                {etapa.cards === 1 ? "1 card está" : `${etapa.cards} cards estão`} nesta etapa. Para qual etapa {etapa.cards === 1 ? "ele vai" : "eles vão"}?
              </span>
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm sm:max-w-56"
              >
                <option value="">Escolha a etapa</option>
                {outras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
          ) : (
            <p>Apagar a etapa {etapa.nome}? Ela não tem cards.</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={salvando || (etapa.cards > 0 && !destino)}
              onClick={() => executar(() => apagarEtapa(etapa.id, etapa.cards > 0 ? destino : null))}
            >
              Apagar etapa
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setApagando(false)}>Cancelar</Button>
          </div>
        </div>
      )}
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
          {funil.etapas.map((e, i) => (
            <EtapaEditavel key={e.id} etapa={e} posicao={i} outras={funil.etapas.filter((o) => o.id !== e.id)} onSalvo={onSalvo} />
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

function ApagarFunil({ funil, onCancelar, onApagado }: { funil: FunilParaGerenciar; onCancelar: () => void; onApagado: () => void }) {
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  return (
    <div role="group" aria-label={`Apagar ${funil.nome}`} className="w-full space-y-2 rounded-md bg-muted/60 p-3 text-sm">
      <AutomacoesAfetadas alvo={{ funil: funil.id }} />
      <p>
        Apagar o funil {funil.nome}?{" "}
        {funil.cards === 0 ? "Ele não tem cards." : `${funil.cards === 1 ? "1 card sai" : `${funil.cards} cards saem`} junto.`} Os contatos continuam.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={apagando}
          onClick={() => {
            setErro(null)
            setApagando(true)
            apagarFunil(funil.id)
              .then((r) => { if (r.erro) setErro(r.erro); else onApagado() })
              .catch(() => setErro("Não foi possível apagar o funil. Tente de novo."))
              .finally(() => setApagando(false))
          }}
        >
          {apagando ? "Apagando..." : "Apagar funil"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}

export function FunisClient({ dados }: { dados: FunisParaGerenciar }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [apagandoId, setApagandoId] = useState<string | null>(null)
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
              <Button size="sm" variant="ghost" aria-label={`Apagar o funil ${f.nome}`} onClick={() => setApagandoId(f.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </span>
            {apagandoId === f.id && (
              <ApagarFunil
                funil={f}
                onCancelar={() => setApagandoId(null)}
                onApagado={() => { setApagandoId(null); if (editandoId === f.id) setEditandoId(null); router.refresh() }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
