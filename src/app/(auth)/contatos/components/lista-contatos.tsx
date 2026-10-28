"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, ChevronDown, Loader2, Trash2, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { NovoContatoDialog } from "./novo-contato-dialog"
import { DialogoExcluirContato } from "./dialogo-excluir-contato"
import { PainelFiltro } from "./painel-filtro"
import { FaixaFiltrosSalvos } from "./faixa-filtros-salvos"
import { atualizarFiltroSalvo, salvarFiltro, type FiltroSalvo } from "../filtros-salvos"
import { resumoExclusaoContato, excluirContato, type ResumoExclusao } from "../lixeira/actions"
import { filtrarContatos, salvarColunasOcultas, type OrdemDaLista } from "../actions"
import { COLUNAS_FIXAS } from "../colunas"
import { MenuColunas } from "./menu-colunas"
import { contarCondicoes, limparFiltro, FILTRO_VAZIO, type Condicao, type Filtro, type FunilParaFiltro } from "@/lib/filtro-contatos"
import {
  type Contato,
  type ClassificacaoContato,
  type TipoContato,
  CLASSIFICACAO_LABEL,
  TIPO_LABEL,
  TAMANHO_PAGINA_CONTATOS,
} from "../mock-contatos"
import { SeloPerfilRfv } from "@/components/shared/selo-perfil-rfv"
import { formatarValor, type CampoDaEmpresa } from "@/lib/campos-personalizados"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

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
] as const satisfies ReadonlyArray<{ label: string; valor: OrdemDaLista }>

type Ordenacao = typeof ORDENACOES[number]["valor"]

const CLASSIFICACAO_BADGE: Record<ClassificacaoContato, string> = {
  lead: "bg-info-fundo text-info border-info/30",
  ativo: "bg-sucesso-fundo text-sucesso border-sucesso/30",
  em_risco: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
  inativo: "bg-secondary text-muted-foreground border-border",
  perdido: "bg-erro-fundo text-erro border-erro/30",
  sem_historico: "bg-secondary text-muted-foreground border-border",
}

interface ListaContatosProps {
  contatos: Contato[]
  /** B37-01: total de contatos que a pessoa vê, contado no servidor. */
  total?: number
  /** B37-01: atendentes da empresa, para os botões fixos e o filtro. */
  atendentes?: Array<{ id: string; nome: string }>
  /** B37-02: etiquetas da empresa, para o filtro. */
  etiquetas?: string[]
  /** B41-06: funis da empresa, para o filtro. */
  funis?: FunilParaFiltro[]
  /** B37-03: filtros salvos da empresa, na ordem da faixa. */
  filtrosSalvos?: FiltroSalvo[]
  papel: string
  /** B13-04: quantos contatos o usuário vê na lixeira. */
  totalLixeira?: number
  /** B38-02: campos personalizados da empresa, na ordem dela. */
  campos?: CampoDaEmpresa[]
  /** B38-09: colunas que este usuário escondeu (chave da fixa ou id do campo). */
  colunasOcultas?: string[]
}

export function ListaContatos({
  contatos: contatosIniciais,
  total: totalInicial = contatosIniciais.length,
  atendentes = [],
  etiquetas = [],
  funis = [],
  filtrosSalvos: filtrosSalvosIniciais = [],
  papel,
  totalLixeira = 0,
  campos = [],
  colunasOcultas = [],
}: ListaContatosProps) {
  const router = useRouter()
  // B38-09: todo campo é coluna; cada usuário esconde as que quiser, menos o Nome.
  const [ocultas, setOcultas] = useState<string[]>(colunasOcultas)
  const ve = (chave: string) => !ocultas.includes(chave)
  const camposNaLista = campos.filter((c) => ve(c.id))
  const colunasDoMenu = COLUNAS_FIXAS
    .filter((c) => c.chave !== "atendente" || papel !== "atendente")
    .flatMap((c) => c.chave === "cidade"
      ? [c, ...campos.map((campo) => ({ chave: campo.id, nome: campo.nome }))]
      : [c])
  const [busca, setBusca] = useState("")
  const [classificacao, setClassificacao] = useState<ClassificacaoContato | "todas">("todas")
  const [tipo, setTipo] = useState<TipoContato | "todos">("todos")
  const [atendente, setAtendente] = useState<string | null>(null)
  // B48-11: tipo e atendente ficam atrás de "Mais filtros"; o botão conta os ligados
  const [maisFiltros, setMaisFiltros] = useState(false)
  const filtrosRecolhidosLigados = (tipo !== "todos" ? 1 : 0) + (atendente !== null ? 1 : 0)
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recente")
  const [ordenacaoAberta, setOrdenacaoAberta] = useState(false)
  // B37-01: filtro avançado aplicado (o painel edita um rascunho e só muda isto no "Aplicar").
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_VAZIO)
  const [painelAberto, setPainelAberto] = useState(false)
  // B37-03: filtros salvos da empresa; o ligado é o que tem as mesmas condições do aplicado.
  const [filtrosSalvos, setFiltrosSalvos] = useState<FiltroSalvo[]>(filtrosSalvosIniciais)
  const podeGerirSalvos = papel === "admin" || papel === "gerente"

  // B10-06 / B37-01: páginas do resultado do servidor e o total dele.
  const [paginas, setPaginas] = useState<Contato[]>(contatosIniciais)
  const [total, setTotal] = useState(totalInicial)
  // QA A10 (06/10): depois de "Novo contato", o router.refresh() traz a lista nova
  // nas props; sem isto, o estado ficava com a lista antiga até o F5.
  const [recebidos, setRecebidos] = useState(contatosIniciais)
  if (contatosIniciais !== recebidos) {
    setRecebidos(contatosIniciais)
    setPaginas(contatosIniciais)
    setTotal(totalInicial)
  }
  const [carregando, setCarregando] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroLista, setErroLista] = useState<string | null>(null)

  // Tudo o que decide o resultado vai ao servidor; nada se filtra aqui.
  const consulta = useMemo(() => {
    const rapidos: Condicao[] = []
    if (classificacao !== "todas") rapidos.push({ campo: "classificacao", comparacao: "e", valores: [classificacao] })
    if (tipo !== "todos") rapidos.push({ campo: "tipo", comparacao: "e", valores: [tipo] })
    if (atendente) rapidos.push({ campo: "atendente", comparacao: "e", valores: [atendente] })
    const termo = busca.trim()
    return { filtro: limparFiltro(filtro), rapidos, busca: termo.length >= 2 ? termo : "", ordem: ordenacao }
  }, [filtro, classificacao, tipo, atendente, busca, ordenacao])
  const chave = JSON.stringify(consulta)
  const chaveInicial = useRef(chave)
  const pedido = useRef(0)

  useEffect(() => {
    // A primeira página sem nada aplicado já veio do servidor.
    if (chave === chaveInicial.current) return
    chaveInicial.current = ""
    const meu = ++pedido.current
    setCarregando(true)
    const t = setTimeout(() => {
      filtrarContatos({ ...consulta, limite: TAMANHO_PAGINA_CONTATOS, offset: 0 })
        .then((r) => {
          if (meu !== pedido.current) return
          if ("erro" in r) { setErroLista(r.erro); return }
          setErroLista(null)
          setPaginas(r.contatos)
          setTotal(r.total)
        })
        .catch(() => { if (meu === pedido.current) setErroLista("Não foi possível aplicar o filtro.") })
        .finally(() => { if (meu === pedido.current) setCarregando(false) })
    }, 250)
    return () => clearTimeout(t)
    // `consulta` muda junto com `chave`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  async function carregarMais() {
    if (carregandoMais || paginas.length >= total) return
    const meu = pedido.current
    setCarregandoMais(true)
    try {
      const r = await filtrarContatos({ ...consulta, limite: TAMANHO_PAGINA_CONTATOS, offset: paginas.length })
      if (meu !== pedido.current) return
      if ("erro" in r) { setErroLista(r.erro); return }
      setPaginas((prev) => {
        const ids = new Set(prev.map((c) => c.id))
        return [...prev, ...r.contatos.filter((c) => !ids.has(c.id))]
      })
      if (r.contatos.length < TAMANHO_PAGINA_CONTATOS) setTotal(paginas.length + r.contatos.length)
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

  const contatosFiltrados = useMemo(() => paginas.filter((c) => !excluidos.has(c.id)), [paginas, excluidos])
  const totalVisivel = Math.max(0, total - (paginas.length - contatosFiltrados.length))
  const temMais = paginas.length < total
  const condicoes = contarCondicoes(filtro)
  const algoAplicado = condicoes > 0 || consulta.rapidos.length > 0 || !!consulta.busca

  const chaveDoAplicado = JSON.stringify(limparFiltro(filtro))
  const salvoAtivo =
    condicoes > 0 ? filtrosSalvos.find((f) => JSON.stringify(limparFiltro(f.filtro)) === chaveDoAplicado) ?? null : null

  function alternarSalvo(salvo: FiltroSalvo) {
    setFiltro(salvoAtivo?.id === salvo.id ? FILTRO_VAZIO : salvo.filtro)
  }

  async function salvarNovo(nome: string, rascunho: Filtro): Promise<string | null> {
    const r = await salvarFiltro(nome, rascunho)
    if (r.erro) return r.erro
    if (r.filtros) setFiltrosSalvos(r.filtros)
    aplicarFiltro(rascunho)
    return null
  }

  async function atualizarSalvo(rascunho: Filtro): Promise<string | null> {
    if (!salvoAtivo) return null
    const r = await atualizarFiltroSalvo(salvoAtivo.id, rascunho)
    if (r.erro) return r.erro
    if (r.filtros) setFiltrosSalvos(r.filtros)
    aplicarFiltro(rascunho)
    return null
  }

  function aplicarFiltro(novo: Filtro) {
    setFiltro(novo)
    setPainelAberto(false)
  }

  function limparFiltroAplicado() {
    setFiltro(FILTRO_VAZIO)
    setPainelAberto(false)
  }

  // B38-09: muda a tabela na hora e grava a escolha; se não gravar, volta como estava.
  async function alternarColuna(chave: string) {
    const antes = ocultas
    const depois = antes.includes(chave) ? antes.filter((c) => c !== chave) : [...antes, chave]
    setOcultas(depois)
    setErroLista(null)
    try {
      const r = await salvarColunasOcultas(depois)
      if (!r.erro) return
    } catch {
      // cai no aviso abaixo
    }
    setOcultas(antes)
    setErroLista("Não foi possível guardar as colunas.")
  }

  const ordenacaoLabel = ORDENACOES.find((o) => o.valor === ordenacao)?.label ?? "Ordenar"

  return (
    <div className={CLASSE_DA_PAGINA}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Contatos</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/contatos/lixeira"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" aria-hidden />
            {/* Só conta o que ainda está na lista: depois do refresh o servidor já contou. */}
            Lixeira ({totalLixeira + [...excluidos].filter((id) => paginas.some((c) => c.id === id)).length})
          </Link>
          {papel !== "atendente" && <NovoContatoDialog campos={campos} />}
        </div>
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
            className="h-9 w-64 pl-8 pr-3 text-sm rounded-md border border-input bg-card outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        {/* Ordenação */}
        <div className="relative">
          <button
            onClick={() => setOrdenacaoAberta((v) => !v)}
            className="h-9 flex items-center gap-1.5 px-3 text-sm rounded-md border border-input bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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

        {/* B37-01: filtro avançado */}
        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className={cn(
            "h-9 flex items-center gap-1.5 px-3 text-sm rounded-md border transition-colors",
            condicoes > 0
              ? "border-primary text-foreground"
              : "border-input bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          {condicoes > 0 ? `Filtrar · ${condicoes}` : "Filtrar"}
        </button>
        {condicoes > 0 && (
          <button
            type="button"
            onClick={limparFiltroAplicado}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar filtro
          </button>
        )}

        {/* B38-09: cada usuário escolhe as colunas que vê */}
        <MenuColunas colunas={colunasDoMenu} ocultas={ocultas} onAlternar={alternarColuna} />
      </div>

      <PainelFiltro
        aberto={painelAberto}
        onAbertoChange={setPainelAberto}
        filtro={filtro}
        atendentes={atendentes}
        etiquetas={etiquetas}
        funis={funis}
        campos={campos}
        onAplicar={aplicarFiltro}
        onLimpar={limparFiltroAplicado}
        podeSalvar={podeGerirSalvos}
        salvoAtivo={salvoAtivo?.nome ?? null}
        onSalvar={salvarNovo}
        onAtualizar={atualizarSalvo}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
        {/* B37-03: filtros salvos, ao lado dos botões fixos */}
        <FaixaFiltrosSalvos
          filtros={filtrosSalvos}
          ativoId={salvoAtivo?.id ?? null}
          podeGerir={podeGerirSalvos}
          onAlternar={alternarSalvo}
          onMudou={(lista, apagadoId) => {
            setFiltrosSalvos(lista)
            if (apagadoId && salvoAtivo?.id === apagadoId) setFiltro(FILTRO_VAZIO)
          }}
        />

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

        <button
          type="button"
          aria-expanded={maisFiltros}
          onClick={() => setMaisFiltros((v) => !v)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md border transition-colors",
            filtrosRecolhidosLigados > 0 ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {filtrosRecolhidosLigados > 0 ? `Mais filtros · ${filtrosRecolhidosLigados}` : "Mais filtros"}
        </button>

        {/* Tipo */}
        {maisFiltros && (
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
        )}

        {/* Atendente — apenas admin e gerente */}
        {maisFiltros && papel !== "atendente" && atendentes.length > 0 && (
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
                key={a.id}
                onClick={() => setAtendente(atendente === a.id ? null : a.id)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border transition-colors",
                  atendente === a.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indicador de total */}
      <p className="text-xs text-muted-foreground mb-3">
        <span className="numero">{totalVisivel}</span> {totalVisivel === 1 ? "contato" : "contatos"}
        {algoAplicado && (totalVisivel === 1 ? " encontrado" : " encontrados")}
      </p>
      {erroLista && <p className="mb-3 text-xs text-erro">{erroLista}</p>}

      {/* Tabela */}
      {contatosFiltrados.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border rounded-lg">
          Nenhum contato encontrado
        </div>
      ) : (
        <div className="overflow-x-auto border-t-2 border-t-foreground">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
                {ve("whatsapp") && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">WhatsApp</th>}
                {ve("classificacao") && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Classificação</th>}
                {ve("perfil_rfv") && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Perfil RFV</th>}
                {ve("tipo") && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tipo</th>}
                {ve("cidade") && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Cidade</th>}
                {/* B38-02: os campos personalizados, na ordem da empresa (B38-09: menos os escondidos). */}
                {camposNaLista.map((c) => (
                  <th key={c.id} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{c.nome}</th>
                ))}
                {papel !== "atendente" && ve("atendente") && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Atendente</th>
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
                  <td className="px-4 py-3 font-medium min-w-40 max-w-64 break-words">{contato.nome}</td>
                  {ve("whatsapp") && <td className="numero px-4 py-3 text-muted-foreground">{contato.telefone}</td>}
                  {ve("classificacao") && (
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center whitespace-nowrap px-2 py-0.5 text-xs rounded-md border font-medium",
                        CLASSIFICACAO_BADGE[contato.classificacao]
                      )}>
                        {CLASSIFICACAO_LABEL[contato.classificacao]}
                      </span>
                    </td>
                  )}
                  {/* B43-01: perfil RFV da hora, como na aba RFV dos Relatórios. */}
                  {ve("perfil_rfv") && (
                    <td className="px-4 py-3">
                      <SeloPerfilRfv perfil={contato.perfilRfv} />
                    </td>
                  )}
                  {ve("tipo") && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {contato.tipo ? TIPO_LABEL[contato.tipo] : "—"}
                    </td>
                  )}
                  {ve("cidade") && <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contato.cidade ?? "—"}</td>}
                  {camposNaLista.map((c) => (
                    <td key={c.id} data-coluna={c.nome} className="px-4 py-3 text-muted-foreground min-w-24 max-w-56 break-words">
                      {formatarValor(c, contato.campos?.[c.id] ?? null)}
                    </td>
                  ))}
                  {papel !== "atendente" && ve("atendente") && (
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{contato.atendente ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Excluir ${contato.nome}`}
                      disabled={preparandoExclusao === contato.id}
                      onClick={(e) => { e.stopPropagation(); abrirExclusao(contato.id) }}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-erro hover:bg-erro-fundo disabled:opacity-50"
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
        <p className="mt-3 text-xs text-erro">{erroExclusao}</p>
      )}

      {resumoExclusao && (
        <DialogoExcluirContato
          aberto
          onAbertoChange={(aberto) => { if (!aberto) { setResumoExclusao(null); setErroExclusao(null) } }}
          nome={resumoExclusao.nome}
          telefone={resumoExclusao.telefone}
          funis={resumoExclusao.funis}
          nomesDosFunis={resumoExclusao.nomesDosFunis}
          conversas={resumoExclusao.conversas}
          mensagens={resumoExclusao.mensagens}
          erro={erroExclusao}
          excluindo={excluindo}
          onConfirmar={confirmarExclusao}
        />
      )}

      {carregando && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Buscando…
        </p>
      )}

      {!carregando && temMais && (
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
