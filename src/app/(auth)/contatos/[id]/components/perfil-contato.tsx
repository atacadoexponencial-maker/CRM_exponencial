"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MessageSquare, ArrowLeft, Pencil, X, Trash2, Download } from "lucide-react"
import { MenuMaisAcoes } from "@/components/shared/menu-mais-acoes"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { AvatarContato } from "@/components/shared/avatar-contato"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  type ContatoPerfil,
  CLASSIFICACAO_LABEL,
  TIPO_LABEL,
  ICP_LABEL,
} from "../../mock-contatos"
import { TimelineContato } from "./timeline-contato"
import { SecaoPedidosContato } from "../../../catalogo/components/secao-pedidos-contato"
import { formatarWhatsapp } from "../../../catalogo/components/lista-pedidos"
import { RegistrarCompraDialog } from "./registrar-compra-dialog"
import { DialogoExcluirContato } from "../../components/dialogo-excluir-contato"
import { resumoExclusaoContato, excluirContato, restaurarContato, type ResumoExclusao } from "../../lixeira/actions"
import { atualizarDadosContato, adicionarTagContato, removerTagContato, atualizarObservacoesContato } from "../../actions"
import { ROTULO_FORMA_PAGAMENTO, ROTULO_ORIGEM_COMPRA } from "@/lib/compras"
import { UFS } from "@/lib/uf"
import { SeloPerfilRfv } from "@/components/shared/selo-perfil-rfv"
import { CamposPersonalizadosContato } from "./campos-personalizados-contato"
import type { CampoComValor } from "../../campos-personalizados"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { DICA_TAG_SEM_ESPACO, useCampoDeTag } from "@/hooks/use-campo-de-tag"
import { Ajuda } from "@/components/shared/ajuda"

const CLASSIFICACAO_BADGE: Record<string, string> = {
  lead: "bg-info-fundo text-info border-info/30",
  ativo: "bg-sucesso-fundo text-sucesso border-sucesso/30",
  em_risco: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
  inativo: "bg-secondary text-muted-foreground border-border",
  perdido: "bg-erro-fundo text-erro border-erro/30",
  sem_historico: "bg-secondary text-muted-foreground border-border",
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const editSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["lojista", "revendedor", "empreendedor", ""]).optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  icp: z.enum(["ja_revende", "primeira_vez", ""]).optional(),
})

type EditFormData = z.infer<typeof editSchema>

type Aba = "dados" | "timeline"

interface PerfilContatoProps {
  contato: ContatoPerfil | null
  papel: string
  contactId?: string
  /** B13-04: o contato não veio porque está na lixeira. */
  naLixeira?: { excluidoPor: string; excluidoEm: string; diasRestantes: number } | null
  /** B30-01: usuários ativos para o seletor de atendente da compra e quem vem marcado. */
  atendentes?: Array<{ id: string; nome: string }>
  atendenteSugeridoId?: string | null
  /** B38-01: campos personalizados da empresa com o valor deste contato. */
  camposPersonalizados?: CampoComValor[]
}

export function PerfilContato({ contato, papel, contactId, naLixeira, atendentes = [], atendenteSugeridoId = null, camposPersonalizados = [] }: PerfilContatoProps) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>("dados")
  const [editando, setEditando] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const campoDaTag = useCampoDeTag()
  const novaTag = campoDaTag.valor
  const [erroTag, setErroTag] = useState<string | null>(null)
  const [resumoExclusao, setResumoExclusao] = useState<ResumoExclusao | null>(null)
  const [preparandoExclusao, setPreparandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  const [salvandoTag, setSalvandoTag] = useState(false)
  const [editandoObs, setEditandoObs] = useState(false)
  const [textoObs, setTextoObs] = useState("")
  const [erroObs, setErroObs] = useState<string | null>(null)
  const [salvandoObs, setSalvandoObs] = useState(false)
  const [restaurando, setRestaurando] = useState(false)
  const [erroRestaurar, setErroRestaurar] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  })

  if (!contato && naLixeira && contactId) {
    const prazo = naLixeira.diasRestantes <= 0
      ? "Será apagado de vez hoje."
      : `Será apagado de vez em ${naLixeira.diasRestantes} ${naLixeira.diasRestantes === 1 ? "dia" : "dias"}.`
    return (
      <div className={cn(CLASSE_DA_PAGINA, "py-16 *:max-w-3xl")}>
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          <p className="mb-1 font-semibold">Este contato está na lixeira</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Excluído por {naLixeira.excluidoPor} em {naLixeira.excluidoEm}. {prazo}
          </p>
          {erroRestaurar && (
            <p className="mb-3 rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">{erroRestaurar}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={restaurando}
              onClick={() => {
                setRestaurando(true)
                setErroRestaurar(null)
                restaurarContato(contactId)
                  .then((r) => {
                    if ("erro" in r) setErroRestaurar(r.erro)
                    else router.refresh()
                  })
                  .catch(() => setErroRestaurar("Não foi possível restaurar. Tente de novo."))
                  .finally(() => setRestaurando(false))
              }}
            >
              {restaurando ? "Restaurando..." : "Restaurar"}
            </Button>
            <Link
              href="/contatos/lixeira"
              className="inline-flex h-7 items-center rounded-md border border-input px-2.5 text-[0.8rem] hover:bg-muted"
            >
              Ir para a lixeira
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!contato) {
    return (
      <div className={cn(CLASSE_DA_PAGINA, "py-16 text-center text-muted-foreground *:max-w-3xl")}>
        Contato não encontrado.
      </div>
    )
  }

  const totalCompras = contato.compras.reduce((acc, c) => acc + c.valor, 0)
  const ticketMedio = contato.compras.length > 0 ? totalCompras / contato.compras.length : 0

  function iniciarEdicao() {
    reset({
      nome: contato!.nome,
      tipo: (contato!.tipo ?? "") as EditFormData["tipo"],
      cidade: contato!.cidade ?? "",
      uf: contato!.uf ?? "",
      icp: (contato!.icp ?? "") as EditFormData["icp"],
    })
    setErroEdicao(null)
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
    setErroEdicao(null)
  }

  function iniciarEdicaoObs() {
    setTextoObs(contato!.observacoes)
    setErroObs(null)
    setEditandoObs(true)
  }

  function cancelarEdicaoObs() {
    setEditandoObs(false)
    setErroObs(null)
  }

  async function salvarObservacoes() {
    setSalvandoObs(true)
    setErroObs(null)
    const resultado = await atualizarObservacoesContato(contato!.id, textoObs)
    setSalvandoObs(false)
    if (resultado.erro) {
      setErroObs(resultado.erro)
      return
    }
    setEditandoObs(false)
    router.refresh()
  }

  async function handleAdicionarTag() {
    const tag = novaTag.trim()
    if (!tag) return
    if (/\s/.test(tag)) {
      setErroTag("Tag não pode conter espaços")
      return
    }
    if (tag.length > 50) {
      setErroTag("Tag muito longa (máx. 50 caracteres)")
      return
    }
    setSalvandoTag(true)
    setErroTag(null)
    const resultado = await adicionarTagContato(contato!.id, tag)
    setSalvandoTag(false)
    if (resultado.erro) {
      setErroTag(resultado.erro)
      return
    }
    campoDaTag.limpar()
    router.refresh()
  }

  async function onSubmitEdicao(data: EditFormData) {
    setErroEdicao(null)
    const resultado = await atualizarDadosContato(contato!.id, {
      nome: data.nome,
      tipo: data.tipo || null,
      cidade: data.cidade || null,
      uf: data.uf || null,
      icp: data.icp || null,
    })
    if (resultado.erro) {
      setErroEdicao(resultado.erro)
      return
    }
    setEditando(false)
    router.refresh()
  }

  return (
    <div className={cn(CLASSE_DA_PAGINA, "space-y-6 *:max-w-3xl")}>
      {/* Voltar */}
      <Link
        href="/contatos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Contatos
      </Link>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
        {/* B29: a foto de perfil, ou as iniciais, ao lado do nome. */}
        <AvatarContato nome={contato.nome} fotoUrl={contato.fotoUrl ?? null} tamanho="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{contato.nome}</h1>
          <p className="text-sm text-muted-foreground">{formatarWhatsapp(contato.telefone.replace(/\D/g, ""))}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 text-xs rounded-md border font-medium",
              CLASSIFICACAO_BADGE[contato.classificacao]
            )}>
              {CLASSIFICACAO_LABEL[contato.classificacao]}
            </span>
            {/* B43-01: perfil RFV da hora. */}
            <SeloPerfilRfv perfil={contato.perfilRfv} />
            {/* B48-15: o que é o perfil RFV, para quem não usa os Relatórios */}
            <Ajuda termo="Perfil RFV">{AJUDA_RFV}</Ajuda>
          </div>
        </div>
        </div>
        {/* QA M23 (06/10): no celular, "Excluir contato" ficava cortado. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={contato.conversaId ? `/chat?conversa=${contato.conversaId}` : "/chat"}
            className="inline-flex items-center gap-1.5 text-sm font-medium h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <MessageSquare className="size-3.5" />
            Abrir conversa
          </Link>
          {/* B48-16: excluir fica no "⋯", longe do Abrir conversa */}
          <MenuMaisAcoes rotulo="Mais ações do contato" className="border border-input">
            <DropdownMenuItem
              variant="destructive"
              disabled={preparandoExclusao}
              onClick={() => {
                setErroExclusao(null)
                setPreparandoExclusao(true)
                resumoExclusaoContato(contato.id)
                  .then((r) => {
                    if ("erro" in r) setErroExclusao(r.erro)
                    else setResumoExclusao(r.resumo)
                  })
                  .catch(() => setErroExclusao("Não foi possível excluir. Tente de novo."))
                  .finally(() => setPreparandoExclusao(false))
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              {preparandoExclusao ? "Carregando..." : "Excluir contato"}
            </DropdownMenuItem>
          </MenuMaisAcoes>
        </div>
      </div>

      {erroExclusao && !resumoExclusao && (
        <p className="text-sm text-erro">{erroExclusao}</p>
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
          onConfirmar={() => {
            setExcluindo(true)
            setErroExclusao(null)
            excluirContato(contato.id)
              .then((r) => {
                if ("erro" in r) { setErroExclusao(r.erro); return }
                router.push("/contatos")
              })
              .catch(() => setErroExclusao("Não foi possível excluir. Tente de novo."))
              .finally(() => setExcluindo(false))
          }}
        />
      )}

      {/* Abas */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 self-start w-fit">
        <button
          onClick={() => setAba("dados")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-colors",
            aba === "dados"
              ? "bg-background text-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dados
        </button>
        <button
          onClick={() => setAba("timeline")}
          className={cn(
            "px-4 py-1.5 text-sm rounded-md transition-colors",
            aba === "timeline"
              ? "bg-background text-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Timeline
        </button>
      </div>

      {/* Conteúdo da aba */}
      {aba === "timeline" ? (
        <TimelineContato eventos={contato.timeline} />
      ) : (
        <div className="space-y-6">
          {/* Dados do contato */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados do contato</h2>
              {!editando && papel !== "atendente" && (
                <Button size="sm" variant="outline" onClick={iniciarEdicao}>
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              )}
            </div>

            {editando ? (
              <form onSubmit={handleSubmit(onSubmitEdicao)} className="rounded-lg border p-4 space-y-4 text-sm">
                {erroEdicao && (
                  <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
                    {erroEdicao}
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input
                    id="edit-nome"
                    type="text"
                    aria-invalid={!!errors.nome}
                    {...register("nome")}
                  />
                  {errors.nome && <p className="text-sm text-erro">{errors.nome.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-tipo">Tipo</Label>
                  <select
                    id="edit-tipo"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register("tipo")}
                  >
                    <option value="">Sem tipo</option>
                    <option value="lojista">Lojista</option>
                    <option value="revendedor">Revendedor</option>
                    <option value="empreendedor">Empreendedor</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-cidade">Cidade</Label>
                  <Input id="edit-cidade" type="text" {...register("cidade")} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-uf">UF</Label>
                  <select id="edit-uf" className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("uf")}>
                    <option value="">Sem UF</option>
                    {UFS.map((u) => (
                      <option key={u.sigla} value={u.sigla}>{u.sigla} · {u.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1">
                    <Label htmlFor="edit-icp">ICP</Label>
                    <Ajuda termo="ICP">{AJUDA_ICP}</Ajuda>
                  </span>
                  <select
                    id="edit-icp"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register("icp")}
                  >
                    <option value="">Sem ICP</option>
                    <option value="ja_revende">Já revende este nicho</option>
                    <option value="primeira_vez">Primeira vez no nicho</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={cancelarEdicao}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg border divide-y text-sm">
                <Row label="Nome" value={contato.nome} />
                <Row label="WhatsApp" value={formatarWhatsapp(contato.telefone.replace(/\D/g, ""))} />
                <Row label="Tipo" value={contato.tipo ? TIPO_LABEL[contato.tipo] : "—"} />
                <Row label="Cidade" value={contato.cidade ?? "—"} />
                <Row label="UF" value={contato.uf ?? "—"} />
                <Row label="ICP" ajuda={<Ajuda termo="ICP">{AJUDA_ICP}</Ajuda>} value={contato.icp ? ICP_LABEL[contato.icp] : "—"} />
              </div>
            )}
          </section>

          {/* B38-01: campos criados pela empresa */}
          {contactId && <CamposPersonalizadosContato contactId={contactId} campos={camposPersonalizados} />}

          {/* Tags */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tags</h2>
            {contato.tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {contato.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-secondary text-muted-foreground border border-border"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={async () => {
                        const resultado = await removerTagContato(contato.id, tag)
                        if (resultado.erro) setErroTag(resultado.erro)
                        else router.refresh()
                      }}
                      className="hover:text-foreground transition-colors"
                      aria-label={`Remover tag ${tag}`}
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Nova tag (sem espaços)"
                value={novaTag}
                onChange={(e) => {
                  campoDaTag.mudar(e.target.value)
                  setErroTag(null)
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    await handleAdicionarTag()
                  }
                }}
                maxLength={50}
                className="h-8 text-sm max-w-48"
                disabled={salvandoTag}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!novaTag.trim() || salvandoTag}
                onClick={handleAdicionarTag}
              >
                Adicionar
              </Button>
            </div>
            {campoDaTag.comEspaco && !erroTag && <p className="text-sm text-muted-foreground">{DICA_TAG_SEM_ESPACO}</p>}
            {erroTag && (
              <p className="text-sm text-erro">{erroTag}</p>
            )}
          </section>

          {/* Observações */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h2>
              {!editandoObs && (
                <Button size="sm" variant="outline" onClick={iniciarEdicaoObs}>
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
              )}
            </div>

            {editandoObs ? (
              <div className="space-y-3">
                {erroObs && (
                  <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
                    {erroObs}
                  </p>
                )}
                <textarea
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-24 resize-y"
                  value={textoObs}
                  onChange={(e) => setTextoObs(e.target.value)}
                  onBlur={salvarObservacoes}
                  disabled={salvandoObs}
                  placeholder="Adicione observações internas sobre este contato..."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={cancelarEdicaoObs} disabled={salvandoObs}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={salvarObservacoes} disabled={salvandoObs}>
                    {salvandoObs ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {contato.observacoes ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{contato.observacoes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem observações</p>
                )}
              </>
            )}
          </section>

          {/* Pipeline */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline</h2>
            {contato.cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem card no pipeline</p>
            ) : (
              <div className="flex flex-col gap-2">
                {contato.cards.map((card, i) => (
                  <Link
                    key={i}
                    href={card.href ?? (card.funil === "recompra" ? "/pipeline/recompra" : "/pipeline")}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <span className="text-muted-foreground">
                      {card.nome ?? `Funil de ${card.funil === "recompra" ? "Recompra" : "Entrada"}`}:
                    </span>
                    <span className="font-medium">{card.etapaLabel}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* B16-10: pedidos feitos pela loja do catálogo */}
          {contato.pedidosCatalogo && contato.pedidosCatalogo.length > 0 && (
            <SecaoPedidosContato pedidos={contato.pedidosCatalogo} hrefPedido={(pid) => `/catalogo/pedidos?pedido=${pid}`} />
          )}

          {/* Histórico de compras */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico de compras</h2>
              <div className="flex items-center gap-2">
                {/* B30-04: baixa a tabela em Excel. A rota decide o que cada papel vê. */}
                <Button size="sm" variant="outline" render={<a href={`/contatos/${contato.id}/compras/exportar`} />}>
                  <Download className="size-3.5" />
                  Exportar
                </Button>
                {papel !== "atendente" && (
                  <RegistrarCompraDialog contactId={contato.id} atendentes={atendentes} atendenteSugeridoId={atendenteSugeridoId} />
                )}
              </div>
            </div>

            {contato.compras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma compra registrada</p>
            ) : (
              <div className="overflow-x-auto border-t-2 border-t-foreground">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                      {/* B30-01: campos dos relatórios */}
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Peças</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pagamento</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Atendente</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contato.compras.map((compra) => (
                      <tr key={compra.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{compra.data}</td>
                        <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{formatarMoeda(compra.valor)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{compra.pecas ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{compra.formaPagamento ? ROTULO_FORMA_PAGAMENTO[compra.formaPagamento] : "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{compra.atendente ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {/* B30-02: o número do pedido abre o pedido do catálogo. */}
                          {compra.pedidoId && compra.pedidoNumero ? (
                            <Link href={`/catalogo/pedidos?pedido=${compra.pedidoId}`} className="hover:underline text-foreground">
                              {ROTULO_ORIGEM_COMPRA.catalogo} · #{compra.pedidoNumero}
                            </Link>
                          ) : (
                            ROTULO_ORIGEM_COMPRA[compra.origem ?? "manual"]
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-6 text-sm pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{formatarMoeda(totalCompras)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Ticket médio:</span>
                <span className="font-semibold">{formatarMoeda(ticketMedio)}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

// B48-15: termos da ficha que a tela não explicava
const AJUDA_ICP = "ICP é o perfil de cliente ideal: diz se o contato já revende este nicho ou se é a primeira vez dele no nicho."
const AJUDA_RFV = "O perfil RFV classifica o contato pelas compras: há quanto tempo comprou (Recência), quantas vezes (Frequência) e quanto gastou (Valor). É o mesmo da aba RFV dos Relatórios."

function Row({ label, value, ajuda }: { label: string; value: string; ajuda?: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="flex w-28 shrink-0 items-center gap-1 text-muted-foreground">{label}{ajuda}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
