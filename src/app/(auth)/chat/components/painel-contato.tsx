"use client"

import { useState, useRef, useEffect, useTransition, KeyboardEvent } from "react"
import Link from "next/link"
import { Pencil, Check, X, ChevronRight, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { AvatarContato } from "@/components/shared/avatar-contato"
import { SeloPerfilRfv } from "@/components/shared/selo-perfil-rfv"
import { buscarInfoContato, atualizarNomeContato } from "../actions"
import { adicionarTagContato, atualizarDadosContato, removerTagContato } from "@/app/(auth)/contatos/actions"
import type { Conversa } from "../mock-conversas"
import type { CadastroDoContato } from "../actions"
import { CLASSIFICACAO_LABEL, ICP_LABEL, TIPO_LABEL, type ClassificacaoContato, type ICP, type TipoContato } from "@/app/(auth)/contatos/mock-contatos"
import { UFS } from "@/lib/uf"
import { textoDaUltimaCompra, type ResumoDeCompras } from "@/lib/resumo-de-compras"

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** B36-06: o resumo das compras do cliente, em faixa de números do Caderno. */
function ResumoCompras({ compras }: { compras: ResumoDeCompras }) {
  const itens = [
    { rotulo: "Total comprado", valor: moeda(compras.total) },
    { rotulo: "Pedidos", valor: String(compras.quantidade) },
    { rotulo: "Ticket médio", valor: compras.ticketMedio === null ? "—" : moeda(compras.ticketMedio) },
    { rotulo: "Última compra", valor: textoDaUltimaCompra(compras.diasDesdeUltima) ?? "—" },
  ]
  return (
    <dl aria-label="Compras" className="grid grid-cols-2 gap-x-3 gap-y-3 border-y py-3">
      {itens.map((i) => (
        <div key={i.rotulo} className="flex flex-col-reverse gap-0.5" data-resumo={i.rotulo}>
          <dt className="text-[11px] text-muted-foreground">{i.rotulo}</dt>
          <dd className="numero text-[15px] font-medium leading-tight">{i.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Linha rótulo + valor do cadastro; vazio vira "—", para a pessoa ver o que falta. */
function Dado({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <dt className="text-muted-foreground shrink-0">{rotulo}</dt>
      <dd className={cn("text-right truncate", !valor && "text-muted-foreground")}>{valor || "—"}</dd>
    </div>
  )
}

const campoClasse = "text-xs border rounded-md px-1.5 py-0.5 w-32 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60 bg-background"

/**
 * Linha editável no lugar (pedido dela em 20/10/2026): lápis abre o campo; Enter ou ✓
 * salva, Esc ou × cancela. `opcoes` faz virar um seletor.
 */
function DadoEditavel({
  rotulo,
  valor,
  rotuloDoValor,
  opcoes,
  podeEditar,
  onSalvar,
}: {
  rotulo: string
  valor: string | null
  rotuloDoValor?: (v: string) => string
  opcoes?: Array<{ id: string; nome: string }>
  podeEditar: boolean
  onSalvar: (novo: string | null) => Promise<boolean>
}) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)

  function abrir() {
    setRascunho(valor ?? "")
    setErro(false)
    setEditando(true)
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    const ok = await onSalvar(rascunho.trim() || null)
    setSalvando(false)
    if (ok) setEditando(false)
    else setErro(true)
  }

  const mostrado = valor ? (rotuloDoValor ? rotuloDoValor(valor) : valor) : null

  if (!editando) {
    return (
      <div className="flex items-baseline justify-between gap-2 text-xs group">
        <dt className="text-muted-foreground shrink-0">{rotulo}</dt>
        <dd className="flex items-center gap-1 min-w-0">
          <span className={cn("truncate", !mostrado && "text-muted-foreground")}>{mostrado || "—"}</span>
          {podeEditar && (
            <button
              type="button"
              onClick={abrir}
              aria-label={`Editar ${rotulo.toLowerCase()}`}
              className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted"
            >
              <Pencil className="size-2.5" />
            </button>
          )}
        </dd>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <dt className="text-muted-foreground shrink-0">{rotulo}</dt>
      <dd className="flex items-center gap-1">
        {opcoes ? (
          <select
            aria-label={rotulo}
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            disabled={salvando}
            className={campoClasse}
          >
            <option value="">—</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        ) : (
          <input
            aria-label={rotulo}
            autoFocus
            type="text"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void salvar()
              if (e.key === "Escape") setEditando(false)
            }}
            disabled={salvando}
            className={campoClasse}
          />
        )}
        <button type="button" onClick={() => void salvar()} disabled={salvando} aria-label={`Salvar ${rotulo.toLowerCase()}`} className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-sucesso disabled:opacity-40">
          {salvando ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        </button>
        <button type="button" onClick={() => setEditando(false)} disabled={salvando} aria-label={`Cancelar ${rotulo.toLowerCase()}`} className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
          <X className="size-3" />
        </button>
        {erro && <span className="text-destructive">Erro</span>}
      </dd>
    </div>
  )
}

interface PainelContatoProps {
  conversa: Conversa
  conversaId: string
  onFechar: () => void
  onConversaAtualizada: (id: string, updates: Partial<Conversa>) => void
  /** Admin e gerente editam o cadastro na ficha; o atendente só vê. */
  podeEditar?: boolean
}

export function PainelContato({ conversa, conversaId, onFechar, onConversaAtualizada, podeEditar = false }: PainelContatoProps) {
  const [nomeLocal, setNomeLocal] = useState<string | null>(conversa.contato.nome)
  const [editando, setEditando] = useState(false)
  const [valorEdicao, setValorEdicao] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataPrimeiroContato, setDataPrimeiroContato] = useState<string | null>(null)
  const [cadastro, setCadastro] = useState<CadastroDoContato | null>(null)
  const [compras, setCompras] = useState<ResumoDeCompras | null>(null)
  const [novaTag, setNovaTag] = useState("")
  const [erroTag, setErroTag] = useState<string | null>(null)

  /** Grava um campo do cadastro mandando os outros como estão (a action regrava todos). */
  async function salvarCampo(campo: "tipo" | "cidade" | "uf" | "icp", novo: string | null): Promise<boolean> {
    if (!cadastro) return false
    const proximo = { ...cadastro, [campo]: novo }
    const r = await atualizarDadosContato(cadastro.contactId, {
      nome: nomeLocal ?? conversa.contato.telefone,
      tipo: proximo.tipo,
      cidade: proximo.cidade,
      uf: proximo.uf,
      icp: proximo.icp,
    })
    if (r.erro) return false
    setCadastro(proximo)
    return true
  }

  async function adicionarTag() {
    if (!cadastro) return
    const tag = novaTag.trim().toLowerCase()
    if (!tag) return
    setErroTag(null)
    const r = await adicionarTagContato(cadastro.contactId, tag)
    if (r.erro) {
      setErroTag(r.erro)
      return
    }
    setCadastro({ ...cadastro, tags: cadastro.tags.includes(tag) ? cadastro.tags : [...cadastro.tags, tag] })
    setNovaTag("")
  }

  async function removerTag(tag: string) {
    if (!cadastro) return
    setErroTag(null)
    const r = await removerTagContato(cadastro.contactId, tag)
    if (r.erro) {
      setErroTag(r.erro)
      return
    }
    setCadastro({ ...cadastro, tags: cadastro.tags.filter((t) => t !== tag) })
  }
  const [erroInfo, setErroInfo] = useState(false)
  const [isPending, startTransition] = useTransition()

  const nomeExibido = nomeLocal ?? conversa.contato.telefone

  // Montado dentro do PainelConversa (keyed por conversa.id), então conversaId
  // nunca muda durante a vida do componente — o estado inicial já está zerado.
  useEffect(() => {
    startTransition(async () => {
      try {
        const info = await buscarInfoContato(conversaId)
        setDataPrimeiroContato(info.dataPrimeiroContato)
        setCadastro(info.cadastro)
        setCompras(info.compras ?? null)
      } catch {
        setErroInfo(true)
      }
    })
  }, [conversaId])

  function iniciarEdicao() {
    setValorEdicao(nomeLocal ?? "")
    setErroSalvar(false)
    setEditando(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function confirmarEdicao() {
    const trimmed = valorEdicao.trim()
    if (!trimmed || salvando) return

    const contactId = conversa.contato.contactId
    if (!contactId) {
      setNomeLocal(trimmed)
      setEditando(false)
      return
    }

    setSalvando(true)
    setErroSalvar(false)
    try {
      await atualizarNomeContato(contactId, trimmed)
      setNomeLocal(trimmed)
      onConversaAtualizada(conversaId, { contato: { ...conversa.contato, nome: trimmed } })
      setEditando(false)
    } catch {
      setErroSalvar(true)
    } finally {
      setSalvando(false)
    }
  }

  function cancelarEdicao() {
    setEditando(false)
    setErroSalvar(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") confirmarEdicao()
    if (e.key === "Escape") cancelarEdicao()
  }

  return (
    <aside aria-label="Ficha do cliente" className="w-full md:w-72 shrink-0 border-r bg-sidebar flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Ficha do cliente</span>
        <button
          onClick={onFechar}
          aria-label="Fechar ficha"
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4 overflow-y-auto">
        {/* Avatar + nome + telefone */}
        <div className="flex flex-col items-center gap-2 py-2">
          <AvatarContato nome={nomeLocal} fotoUrl={conversa.contato.fotoUrl ?? null} tamanho="lg" />

          {editando ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={valorEdicao}
                  onChange={(e) => setValorEdicao(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nome do contato"
                  disabled={salvando}
                  className="text-sm border rounded-md px-2 py-0.5 w-36 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                />
                <button
                  onClick={confirmarEdicao}
                  disabled={!valorEdicao.trim() || salvando}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-sucesso disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {salvando ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </button>
                <button
                  onClick={cancelarEdicao}
                  disabled={salvando}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              {erroSalvar && (
                <p className="text-xs text-destructive">Erro ao salvar</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className="font-semibold text-sm">{nomeExibido}</p>
              <button
                onClick={iniciarEdicao}
                className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          )}

          {nomeLocal !== null && (
            <p className="text-xs text-muted-foreground">{conversa.contato.telefone}</p>
          )}
        </div>

        {compras && <ResumoCompras compras={compras} />}

        {/* Data do primeiro contato */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Primeiro contato
          </p>
          {isPending || dataPrimeiroContato === null ? (
            erroInfo ? (
              <p className="text-xs text-destructive">Erro ao carregar</p>
            ) : (
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            )
          ) : (
            <p className="text-sm">{dataPrimeiroContato}</p>
          )}
        </div>

        {/* Cadastro e funil (20/10/2026): o que o perfil tem, só de leitura */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cadastro</p>
          {isPending || cadastro === null ? (
            erroInfo ? (
              <p className="text-xs text-destructive">Erro ao carregar</p>
            ) : (
              <div className="h-20 rounded-md bg-muted animate-pulse" />
            )
          ) : (
            <>
              <dl className="flex flex-col gap-1">
                <Dado rotulo="Classificação" valor={CLASSIFICACAO_LABEL[cadastro.classificacao as ClassificacaoContato] ?? cadastro.classificacao} />
                {/* B43-01: perfil RFV da hora. */}
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <dt className="text-muted-foreground shrink-0">Perfil RFV</dt>
                  <dd><SeloPerfilRfv perfil={cadastro.perfilRfv} /></dd>
                </div>
                <DadoEditavel
                  rotulo="Tipo"
                  valor={cadastro.tipo}
                  rotuloDoValor={(v) => TIPO_LABEL[v as TipoContato] ?? v}
                  opcoes={Object.entries(TIPO_LABEL).map(([id, nome]) => ({ id, nome }))}
                  podeEditar={podeEditar}
                  onSalvar={(novo) => salvarCampo("tipo", novo)}
                />
                <DadoEditavel rotulo="Cidade" valor={cadastro.cidade} podeEditar={podeEditar} onSalvar={(novo) => salvarCampo("cidade", novo)} />
                <DadoEditavel
                  rotulo="UF"
                  valor={cadastro.uf}
                  opcoes={UFS.map((u) => ({ id: u.sigla, nome: u.sigla }))}
                  podeEditar={podeEditar}
                  onSalvar={(novo) => salvarCampo("uf", novo)}
                />
                <DadoEditavel
                  rotulo="Perfil"
                  valor={cadastro.icp}
                  rotuloDoValor={(v) => ICP_LABEL[v as ICP] ?? v}
                  opcoes={Object.entries(ICP_LABEL).map(([id, nome]) => ({ id, nome }))}
                  podeEditar={podeEditar}
                  onSalvar={(novo) => salvarCampo("icp", novo)}
                />
                <Dado rotulo="Atendente" valor={cadastro.atendente} />
                {cadastro.funis.map((f) => (
                  <Dado key={f.funil} rotulo={f.nome ?? (f.funil === "entrada" ? "Funil de Entrada" : "Funil de Recompra")} valor={f.etapa} />
                ))}
                {cadastro.funis.length === 0 && <Dado rotulo="Funil" valor={null} />}
              </dl>
              {(cadastro.tags.length > 0 || podeEditar) && (
                <div className="flex flex-wrap items-center gap-1" aria-label="Tags">
                  {cadastro.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                      {t}
                      {podeEditar && (
                        <button type="button" onClick={() => void removerTag(t)} aria-label={`Remover tag ${t}`} className="text-muted-foreground hover:text-foreground">
                          <X className="size-2.5" />
                        </button>
                      )}
                    </span>
                  ))}
                  {podeEditar && (
                    <input
                      type="text"
                      value={novaTag}
                      onChange={(e) => setNovaTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void adicionarTag() } }}
                      placeholder="+ tag"
                      aria-label="Nova tag"
                      className="w-16 rounded-full border bg-background px-2 py-0.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    />
                  )}
                </div>
              )}
              {erroTag && <p className="text-xs text-destructive">{erroTag}</p>}
              <Link
                href={`/contatos/${cadastro.contactId}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Abrir perfil completo
              </Link>
            </>
          )}
        </div>

      </div>
    </aside>
  )
}
