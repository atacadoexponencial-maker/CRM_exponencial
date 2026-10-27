"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LIMITE_DE_OPCOES, NOME_MAXIMO, TIPOS_DE_CAMPO, rotuloDoTipo, temOpcoes } from "@/lib/campos-personalizados"
import { chaveDaVariavel } from "@/lib/variaveis-mensagem"
import {
  adicionarOpcao,
  apagarCampo,
  criarCampo,
  moverCampo,
  moverOpcao,
  renomearCampo,
  renomearOpcao,
  resumoParaApagar,
  tirarOpcao,
  type CampoParaGerenciar,
  type OpcaoParaGerenciar,
  type ResumoParaApagar,
} from "./actions"
import { avisar } from "@/lib/aviso-na-tela"

// B38-01: tela de campos personalizados. Admin e Gerente criam o campo com nome e tipo,
// e editam o nome e as opções das listas. O tipo aparece só para leitura depois de criado.

const CLASSE_SELECT =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

async function executar(acao: () => Promise<{ erro?: string }>, setErro: (e: string | null) => void, setSalvando: (s: boolean) => void): Promise<boolean> {
  setErro(null)
  setSalvando(true)
  try {
    const r = await acao()
    if (r.erro) {
      setErro(r.erro)
      return false
    }
    return true
  } catch {
    setErro("Não foi possível salvar. Tente de novo.")
    return false
  } finally {
    setSalvando(false)
  }
}

function NovoCampo({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState("")
  const [opcoes, setOpcoes] = useState<string[]>(["", ""])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const comOpcoes = temOpcoes(tipo)

  async function salvar() {
    const ok = await executar(() => criarCampo(nome, tipo, comOpcoes ? opcoes.filter((o) => o.trim()) : []), setErro, setSalvando)
    if (!ok) return
    avisar("Campo salvo")
    onCriado()
  }

  return (
    <section aria-label="Novo campo" className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Novo campo</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span>Nome do campo</span>
          <Input value={nome} maxLength={NOME_MAXIMO} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: CNPJ" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={CLASSE_SELECT}>
            <option value="">Escolha o tipo…</option>
            {TIPOS_DE_CAMPO.map((t) => (
              <option key={t.id} value={t.id}>{t.rotulo}</option>
            ))}
          </select>
        </label>
      </div>
      {comOpcoes && (
        <div className="space-y-2">
          <span className="text-sm">Opções, na ordem em que aparecem</span>
          {opcoes.map((opcao, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={`Opção ${i + 1}`}
                value={opcao}
                maxLength={NOME_MAXIMO}
                onChange={(e) => setOpcoes((lista) => lista.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={`Opção ${i + 1}`}
                className="sm:max-w-72"
              />
              {opcoes.length > 1 && (
                <button
                  type="button"
                  aria-label={`Tirar a opção ${i + 1}`}
                  onClick={() => setOpcoes((lista) => lista.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {opcoes.length < LIMITE_DE_OPCOES && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpcoes((lista) => [...lista, ""])}>
              <Plus className="size-3.5" />
              Acrescentar opção
            </Button>
          )}
        </div>
      )}
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onFechar}>Cancelar</Button>
        <Button type="button" size="sm" disabled={salvando} onClick={salvar}>{salvando ? "Criando..." : "Criar campo"}</Button>
      </div>
    </section>
  )
}

/**
 * B38-06: confirmação de apagar o campo ou tirar a opção. Pergunta ao servidor quantos
 * contatos perdem o valor e onde o campo (ou a opção) é usado; em uso, não deixa.
 */
function ConfirmarApagar({
  campoId,
  opcao,
  nome,
  onCancelar,
  onFeito,
}: {
  campoId: string
  opcao?: string
  nome: string
  onCancelar: () => void
  onFeito: () => void
}) {
  const [resumo, setResumo] = useState<ResumoParaApagar | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const oQue = opcao ? "a opção" : "o campo"

  useEffect(() => {
    let ativo = true
    resumoParaApagar(campoId, opcao)
      .then((r) => { if (ativo) setResumo(r) })
      .catch(() => { if (ativo) setResumo({ erro: "Não foi possível conferir onde é usado." }) })
    return () => { ativo = false }
  }, [campoId, opcao])

  async function confirmar() {
    setErro(null)
    setSalvando(true)
    try {
      const r = opcao ? await tirarOpcao(campoId, opcao) : await apagarCampo(campoId)
      if (r.usadoEm) setResumo((atual) => ({ ...atual, usadoEm: r.usadoEm }))
      if (r.erro) { setErro(r.erro); return }
      onFeito()
    } catch {
      setErro("Não foi possível apagar. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }

  const usado = resumo?.usadoEm
  const emUso = !!usado && usado.automacoes.length + usado.filtros.length + usado.campanhas.length > 0
  const grupos: Array<[string, string[]]> = usado
    ? [["Automações", usado.automacoes], ["Filtros salvos", usado.filtros], ["Campanhas não enviadas", usado.campanhas]]
    : []

  return (
    <div role="alertdialog" aria-label={opcao ? `Tirar a opção ${nome}` : `Apagar o campo ${nome}`} className="basis-full space-y-2 rounded-md border border-aviso/40 px-3 py-2 text-xs">
      {!resumo && <p className="text-muted-foreground">Conferindo onde {oQue} é usad{opcao ? "a" : "o"}…</p>}
      {resumo?.erro && !usado && <p className="text-destructive">{resumo.erro}</p>}
      {emUso && (
        <div className="space-y-1">
          <p className="font-medium">Não dá para {opcao ? "tirar" : "apagar"}: {oQue} &quot;{nome}&quot; é usad{opcao ? "a" : "o"} em</p>
          {grupos.filter(([, nomes]) => nomes.length > 0).map(([titulo, nomes]) => (
            <div key={titulo}>
              <p className="text-muted-foreground">{titulo}</p>
              <ul aria-label={titulo} className="list-disc pl-4">
                {nomes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {resumo && !resumo.erro && !emUso && (
        <p>
          {resumo.preenchidos === 0
            ? `Nenhum contato tem ${opcao ? "esta opção" : "este campo preenchido"}.`
            : `${resumo.preenchidos} ${resumo.preenchidos === 1 ? "contato perde" : "contatos perdem"} ${opcao ? "esta opção" : "este valor"}.`}
        </p>
      )}
      {erro && <p role="alert" className="text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
        {resumo && !resumo.erro && !emUso && (
          <Button type="button" size="sm" variant="destructive" disabled={salvando} onClick={confirmar}>
            {opcao ? "Tirar opção" : "Apagar campo"}
          </Button>
        )}
      </div>
    </div>
  )
}

// B38-09: o nome da opção é rascunho do editor e grava no Salvar do rodapé.
function OpcaoEditavel({ campoId, opcao, nome, onNome, posicao, total, onSalvo }: { campoId: string; opcao: OpcaoParaGerenciar; nome: string; onNome: (nome: string) => void; posicao: number; total: number; onSalvo: () => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [tirando, setTirando] = useState(false)

  async function rodar(acao: () => Promise<{ erro?: string }>) {
    if (await executar(acao, setErro, setSalvando)) onSalvo()
  }

  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={`Nome da opção ${posicao + 1}`}
          value={nome}
          maxLength={NOME_MAXIMO}
          onChange={(e) => onNome(e.target.value)}
          className="sm:max-w-72"
        />
        <Button type="button" size="icon-sm" variant="ghost" aria-label={`Subir ${opcao.nome}`} disabled={salvando || posicao === 0} onClick={() => rodar(() => moverOpcao(campoId, opcao.id, "subir"))}>
          <ArrowUp className="size-3.5" />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={`Descer ${opcao.nome}`} disabled={salvando || posicao === total - 1} onClick={() => rodar(() => moverOpcao(campoId, opcao.id, "descer"))}>
          <ArrowDown className="size-3.5" />
        </Button>
        {total > 1 && (
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Tirar a opção ${opcao.nome}`} disabled={salvando} onClick={() => setTirando(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      {tirando && <ConfirmarApagar campoId={campoId} opcao={opcao.id} nome={opcao.nome} onCancelar={() => setTirando(false)} onFeito={() => { setTirando(false); onSalvo() }} />}
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </li>
  )
}

function EditorDoCampo({ campo, onFechar, onSalvo }: { campo: CampoParaGerenciar; onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(campo.nome)
  // B38-09: nomes das opções mudados e ainda não salvos, por id da opção.
  const [nomesDasOpcoes, setNomesDasOpcoes] = useState<Record<string, string>>({})
  const [novaOpcao, setNovaOpcao] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function rodar(acao: () => Promise<{ erro?: string }>, depois?: () => void) {
    if (await executar(acao, setErro, setSalvando)) {
      depois?.()
      onSalvo()
    }
  }

  // B38-09: o Salvar do rodapé grava o nome do campo e as opções renomeadas e fecha.
  // Acrescentar, subir, descer e tirar opção gravam na hora, cada um no seu botão.
  async function salvar() {
    const mudancas: Array<() => Promise<{ erro?: string }>> = []
    if (nome.trim() !== campo.nome) mudancas.push(() => renomearCampo(campo.id, nome))
    for (const o of campo.opcoes) {
      const novo = nomesDasOpcoes[o.id]
      if (novo !== undefined && novo.trim() !== o.nome) mudancas.push(() => renomearOpcao(campo.id, o.id, novo))
    }
    for (const [i, mudanca] of mudancas.entries()) {
      if (!(await executar(mudanca, setErro, setSalvando))) {
        if (i > 0) onSalvo()
        return
      }
    }
    if (mudancas.length > 0) onSalvo()
    onFechar()
  }

  return (
    <section aria-label={`Editar ${campo.nome}`} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Editar campo</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <label htmlFor="nome-do-campo">Nome do campo</label>
          <Input id="nome-do-campo" value={nome} maxLength={NOME_MAXIMO} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5 text-sm">
          <span id="tipo-do-campo">Tipo</span>
          <p aria-labelledby="tipo-do-campo" data-tipo-somente-leitura className="flex h-9 items-center rounded-md border border-dashed border-border px-3 text-muted-foreground">
            {rotuloDoTipo(campo.tipo)}
          </p>
          <p className="text-xs text-muted-foreground">O tipo não muda depois de criado.</p>
        </div>
      </div>
      {/* B38-05: a variável do campo nas mensagens; acompanha o nome */}
      <p className="text-sm">
        Variável nas mensagens: <code data-variavel className="rounded bg-muted px-1.5 py-0.5 text-xs">{`{{${chaveDaVariavel(campo.nome)}}}`}</code>
      </p>
      {temOpcoes(campo.tipo) && (
        <div className="space-y-2">
          <span className="text-sm">Opções, na ordem em que aparecem</span>
          <ul className="space-y-2">
            {campo.opcoes.map((o, i) => (
              <OpcaoEditavel
                key={o.id}
                campoId={campo.id}
                opcao={o}
                nome={nomesDasOpcoes[o.id] ?? o.nome}
                onNome={(n) => setNomesDasOpcoes((atual) => ({ ...atual, [o.id]: n }))}
                posicao={i}
                total={campo.opcoes.length}
                onSalvo={onSalvo}
              />
            ))}
          </ul>
          {campo.opcoes.length < LIMITE_DE_OPCOES && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Nova opção"
                value={novaOpcao}
                maxLength={NOME_MAXIMO}
                onChange={(e) => setNovaOpcao(e.target.value)}
                placeholder="Nova opção"
                className="sm:max-w-72"
              />
              <Button type="button" size="sm" variant="outline" disabled={salvando || !novaOpcao.trim()} onClick={() => rodar(() => adicionarOpcao(campo.id, novaOpcao), () => setNovaOpcao(""))}>
                <Plus className="size-3.5" />
                Acrescentar opção
              </Button>
            </div>
          )}
        </div>
      )}
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" size="sm" variant="ghost" onClick={onFechar}>Cancelar</Button>
        <Button type="button" size="sm" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar"}</Button>
      </div>
    </section>
  )
}

export function CamposClient({ campos }: { campos: CampoParaGerenciar[] }) {
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [movendo, setMovendo] = useState(false)
  const [apagandoId, setApagandoId] = useState<string | null>(null)
  const [erroOrdem, setErroOrdem] = useState<string | null>(null)
  const editando = campos.find((c) => c.id === editandoId) ?? null

  async function mover(campoId: string, direcao: "subir" | "descer") {
    if (await executar(() => moverCampo(campoId, direcao), setErroOrdem, setMovendo)) router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Campos personalizados</h1>
          <p className="mt-1 text-sm text-muted-foreground">Informações do contato que a empresa quer guardar além dos dados do sistema.</p>
        </div>
        {!criando && campos.length > 0 && (
          <Button size="sm" onClick={() => { setCriando(true); setEditandoId(null) }}>
            <Plus className="size-3.5" />
            Criar campo
          </Button>
        )}
      </div>

      {criando && <NovoCampo onFechar={() => setCriando(false)} onCriado={() => { setCriando(false); router.refresh() }} />}
      {editando && <EditorDoCampo key={editando.id} campo={editando} onFechar={() => setEditandoId(null)} onSalvo={() => router.refresh()} />}

      {erroOrdem && <p role="alert" className="text-xs text-destructive">{erroOrdem}</p>}

      {campos.length === 0 ? (
        !criando && (
          <div className="space-y-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-medium">Nenhum campo criado ainda</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Crie campos para guardar o que a empresa precisa saber de cada contato, como CNPJ, porte da loja, limite de crédito ou
              as linhas que o cliente compra. Eles aparecem no perfil do contato.
            </p>
            <Button size="sm" onClick={() => setCriando(true)}>
              <Plus className="size-3.5" />
              Criar campo
            </Button>
          </div>
        )
      ) : (
        <ul aria-label="Lista de campos" className="divide-y divide-border rounded-lg border border-border bg-card">
          {campos.map((c, i) => (
            <li key={c.id} data-campo={c.nome} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.nome}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{rotuloDoTipo(c.tipo)}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="numero mr-2 text-xs text-muted-foreground">
                  {c.preenchidos} {c.preenchidos === 1 ? "contato preenchido" : "contatos preenchidos"}
                </span>
                <Button size="icon-sm" variant="ghost" aria-label={`Subir ${c.nome}`} disabled={movendo || i === 0} onClick={() => mover(c.id, "subir")}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Descer ${c.nome}`} disabled={movendo || i === campos.length - 1} onClick={() => mover(c.id, "descer")}>
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditandoId(c.id); setCriando(false) }}>Editar</Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Apagar o campo ${c.nome}`} onClick={() => setApagandoId(c.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </span>
              {apagandoId === c.id && (
                <ConfirmarApagar
                  campoId={c.id}
                  nome={c.nome}
                  onCancelar={() => setApagandoId(null)}
                  onFeito={() => { setApagandoId(null); if (editandoId === c.id) setEditandoId(null); router.refresh() }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
