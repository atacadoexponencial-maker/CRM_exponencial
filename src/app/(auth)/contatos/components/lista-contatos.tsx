"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronDown, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { NovoContatoDialog } from "./novo-contato-dialog"
import { DialogoExcluirContato } from "./dialogo-excluir-contato"
import { resumoExclusaoContato, excluirContato, type ResumoExclusao } from "../lixeira/actions"
import { listarContatos } from "../actions"
import {
  type Contato,
  type ClassificacaoContato,
  type TipoContato,
  CLASSIFICACAO_LABEL,
  TIPO_LABEL,
  TAMANHO_PAGINA_CONTATOS,
} from "../mock-contatos"

const CLASSIFICACOES: { label: string; valor: ClassificacaoContato | "todas" }[] = [
  { label: "Todas", valor: "todas" },
  { label: "Lead", valor: "lead" },
  { label: "Ativo", valor: "ativo" },
  { label: "Em Risco", valor: "em_risco" },
  { label: "Inativo", valor: "inativo" },
  { label: "Perdido", valor: "perdido" },
  { label: "Sem histórico", valor: "sem_historico" },
]

const TIPOS: { label: string; valor: TipoContato | "todos" }[] = [
  { label: "Todos", valor: "todos" },
  { label: "Lojista", valor: "lojista" },
  { label: "Revendedor", valor: "revendedor" },
  { label: "Empreendedor", valor: "empreendedor" },
]

const ORDENACOES = [
  { label: "Mais recente", valor: "recente" },
  { label: "Nome (A–Z)", valor: "nome" },
  { label: "Classificação", valor: "classificacao" },
] as const

type Ordenacao = typeof ORDENACOES[number]["valor"]

const CLASSIFICACAO_BADGE: Record<ClassificacaoContato, string> = {
  lead: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  ativo: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  em_risco: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  inativo: "bg-secondary text-muted-foreground border-border",
  perdido: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  sem_historico: "bg-secondary text-muted-foreground border-border",
}

const ORDEM_CLASSIFICACAO: Record<ClassificacaoContato, number> = {
  ativo: 0,
  lead: 1,
  em_risco: 2,
  inativo: 3,
  perdido: 4,
  sem_historico: 5,
}

interface ListaContatosProps {
  contatos: Contato[]
  /** A primeira página veio cheia: há mais no servidor (B10-06). */
  temMais?: boolean
  papel: string
}

export function ListaContatos({ contatos: contatosIniciais, temMais: temMaisInicial = false, papel }: ListaContatosProps) {
  const router = useRouter()
  const [busca, setBusca] = useState("")

  // B10-06: páginas carregadas e, quando há busca, o resultado vindo do servidor.
  const [paginas, setPaginas] = useState<Contato[]>(contatosIniciais)
  const [temMais, setTemMais] = useState(temMaisInicial)
  const [carregandoMais, setCarregandoMais] = useState(false)
  // Resultado guardado junto com o termo: só vale enquanto o termo for o mesmo.
  const [respostaBusca, setRespostaBusca] = useState<{ termo: string; lista: Contato[] } | null>(null)

  const termoServidor = busca.trim().length >= 2 ? busca.trim() : ""
  const resultadoBusca = termoServidor && respostaBusca?.termo === termoServidor ? respostaBusca.lista : null
  const buscando = !!termoServidor && resultadoBusca === null

  useEffect(() => {
    if (!termoServidor) return
    let cancelado = false
    const t = setTimeout(() => {
      listarContatos({ busca: termoServidor, limite: TAMANHO_PAGINA_CONTATOS })
        .then((lista) => { if (!cancelado) setRespostaBusca({ termo: termoServidor, lista }) })
        .catch(() => { /* mantém o que está na tela */ })
    }, 300)
    return () => { cancelado = true; clearTimeout(t) }
  }, [termoServidor])

  async function carregarMais() {
    if (carregandoMais || !temMais) return
    setCarregandoMais(true)
    try {
      const pagina = await listarContatos({ limite: TAMANHO_PAGINA_CONTATOS, offset: paginas.length })
      setPaginas((prev) => {
        const ids = new Set(prev.map((c) => c.id))
        return [...prev, ...pagina.filter((c) => !ids.has(c.id))]
      })
      if (pagina.length < TAMANHO_PAGINA_CONTATOS) setTemMais(false)
    } catch {
      // Mantém o que já tem; o botão permite tentar de novo.
    } finally {
      setCarregandoMais(false)
    }
  }

  // B13-02: contatos excluídos nesta tela somem na hora, sem recarregar a lista.
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set())
  const [resumoExclusao, setResumoExclusao] = useState<ResumoExclusao | null>(null)
  const [preparandoExclusao, setPreparandoExclusao] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

  function abrirExclusao(contactId: string) {
    setErroExclusao(null)
    setPreparandoExclusao(contactId)
    resumoExclusaoContato(contactId)
      .then((r) => {
        if ("erro" in r) setErroExclusao(r.erro)
        else setResumoExclusao(r.resumo)
      })
      .catch(() => setErroExclusao("Não foi possível excluir. Tente de novo."))
      .finally(() => setPreparandoExclusao(null))
  }

  function confirmarExclusao() {
    if (!resumoExclusao) return
    const id = resumoExclusao.contactId
    setExcluindo(true)
    setErroExclusao(null)
    excluirContato(id)
      .then((r) => {
        if ("erro" in r) { setErroExclusao(r.erro); return }
        setExcluidos((prev) => new Set(prev).add(id))
        setResumoExclusao(null)
      })
      .catch(() => setErroExclusao("Não foi possível excluir. Tente de novo."))
      .finally(() => setExcluindo(false))
  }

  const contatos = useMemo(
    () => (resultadoBusca ?? paginas).filter((c) => !excluidos.has(c.id)),
    [resultadoBusca, paginas, excluidos]
  )
  const [classificacao, setClassificacao] = useState<ClassificacaoContato | "todas">("todas")
  const [tipo, setTipo] = useState<TipoContato | "todos">("todos")
  const [nicho, setNicho] = useState<string | null>(null)
  const [atendente, setAtendente] = useState<string | null>(null)
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recente")
  const [ordenacaoAberta, setOrdenacaoAberta] = useState(false)

  const nichos = useMemo(
    () => Array.from(new Set(contatos.map((c) => c.nicho).filter(Boolean) as string[])).sort(),
    [contatos]
  )
  const atendentes = useMemo(
    () => Array.from(new Set(contatos.map((c) => c.atendente).filter(Boolean) as string[])).sort(),
    [contatos]
  )

  const contatosFiltrados = useMemo(() => {
    let lista = contatos.filter((c) => {
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        if (!c.nome.toLowerCase().includes(termo) && !c.telefone.toLowerCase().includes(termo)) return false
      }
      if (classificacao !== "todas" && c.classificacao !== classificacao) return false
      if (tipo !== "todos" && c.tipo !== tipo) return false
      if (nicho && c.nicho !== nicho) return false
      if (atendente && c.atendente !== atendente) return false
      return true
    })

    if (ordenacao === "recente") {
      lista = [...lista].sort((a, b) => b.created_at.localeCompare(a.created_at))
    } else if (ordenacao === "nome") {
      lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    } else if (ordenacao === "classificacao") {
      lista = [...lista].sort((a, b) => ORDEM_CLASSIFICACAO[a.classificacao] - ORDEM_CLASSIFICACAO[b.classificacao])
    }

    return lista
  }, [contatos, busca, classificacao, tipo, nicho, atendente, ordenacao])

  const ordenacaoLabel = ORDENACOES.find((o) => o.valor === ordenacao)?.label ?? "Ordenar"

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Contatos</h1>
        {papel !== "atendente" && <NovoContatoDialog />}
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-64 pl-8 pr-3 text-sm rounded-lg border border-input bg-transparent outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        {/* Ordenação */}
        <div className="relative">
          <button
            onClick={() => setOrdenacaoAberta((v) => !v)}
            className="h-8 flex items-center gap-1.5 px-3 text-sm rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {ordenacaoLabel}
            <ChevronDown className="size-3" />
          </button>
          {ordenacaoAberta && (
            <div className="absolute left-0 top-9 z-10 w-44 bg-card border border-border rounded-lg shadow-md py-1 text-sm">
              {ORDENACOES.map((o) => (
                <button
                  key={o.valor}
                  onClick={() => { setOrdenacao(o.valor); setOrdenacaoAberta(false) }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 hover:bg-muted transition-colors",
                    ordenacao === o.valor && "text-primary font-medium"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
        {/* Classificação */}
        <div className="flex gap-1 flex-wrap">
          {CLASSIFICACOES.map((f) => (
            <button
              key={f.valor}
              onClick={() => setClassificacao(f.valor)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                classificacao === f.valor
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tipo */}
        <div className="flex gap-1 flex-wrap">
          {TIPOS.map((f) => (
            <button
              key={f.valor}
              onClick={() => setTipo(f.valor)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                tipo === f.valor
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Nicho */}
        {nichos.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setNicho(null)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                nicho === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Todos nichos
            </button>
            {nichos.map((n) => (
              <button
                key={n}
                onClick={() => setNicho(nicho === n ? null : n)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border transition-colors",
                  nicho === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Atendente — apenas admin e gerente */}
        {papel !== "atendente" && atendentes.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setAtendente(null)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors",
                atendente === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Todos atendentes
            </button>
            {atendentes.map((a) => (
              <button
                key={a}
                onClick={() => setAtendente(atendente === a ? null : a)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border transition-colors",
                  atendente === a
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indicador de total */}
      <p className="text-xs text-muted-foreground mb-3">
        {contatosFiltrados.length} {contatosFiltrados.length === 1 ? "contato" : "contatos"}
      </p>

      {/* Tabela */}
      {contatosFiltrados.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border rounded-lg">
          Nenhum contato encontrado
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">WhatsApp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Classificação</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nicho</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cidade</th>
                {papel !== "atendente" && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Atendente</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contatosFiltrados.map((contato) => (
                <tr
                  key={contato.id}
                  onClick={() => router.push(`/contatos/${contato.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium">{contato.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contato.telefone}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 text-xs rounded-md border font-medium",
                      CLASSIFICACAO_BADGE[contato.classificacao]
                    )}>
                      {CLASSIFICACAO_LABEL[contato.classificacao]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {contato.tipo ? TIPO_LABEL[contato.tipo] : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{contato.nicho ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{contato.cidade ?? "—"}</td>
                  {papel !== "atendente" && (
                    <td className="px-4 py-3 text-muted-foreground">{contato.atendente ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Excluir ${contato.nome}`}
                      disabled={preparandoExclusao === contato.id}
                      onClick={(e) => { e.stopPropagation(); abrirExclusao(contato.id) }}
                      className="inline-flex size-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {preparandoExclusao === contato.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erroExclusao && !resumoExclusao && (
        <p className="mt-3 text-xs text-destructive">{erroExclusao}</p>
      )}

      {resumoExclusao && (
        <DialogoExcluirContato
          aberto
          onAbertoChange={(aberto) => { if (!aberto) { setResumoExclusao(null); setErroExclusao(null) } }}
          nome={resumoExclusao.nome}
          telefone={resumoExclusao.telefone}
          funis={resumoExclusao.funis}
          conversas={resumoExclusao.conversas}
          mensagens={resumoExclusao.mensagens}
          erro={erroExclusao}
          excluindo={excluindo}
          onConfirmar={confirmarExclusao}
        />
      )}

      {buscando && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Buscando…
        </p>
      )}

      {!resultadoBusca && temMais && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={carregarMais}
            disabled={carregandoMais}
            className="h-8 flex items-center gap-2 px-4 text-sm rounded-lg border border-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {carregandoMais && <Loader2 className="size-3.5 animate-spin" />}
            {carregandoMais ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  )
}
