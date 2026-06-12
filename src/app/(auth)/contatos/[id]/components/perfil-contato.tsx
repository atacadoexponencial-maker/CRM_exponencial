"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MessageSquare, ArrowLeft, Pencil, X, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { IniciarSequenciaDialog } from "@/components/shared/iniciar-sequencia-dialog"
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
import { RegistrarCompraDialog } from "./registrar-compra-dialog"
import { atualizarDadosContato, adicionarTagContato, removerTagContato, atualizarObservacoesContato } from "../../actions"

const CLASSIFICACAO_BADGE: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  ativo: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  em_risco: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  inativo: "bg-secondary text-muted-foreground border-border",
  perdido: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  sem_historico: "bg-secondary text-muted-foreground border-border",
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const editSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.enum(["lojista", "revendedor", "empreendedor", ""]).optional(),
  nicho: z.string().optional(),
  cidade: z.string().optional(),
  icp: z.enum(["ja_revende", "primeira_vez", ""]).optional(),
})

type EditFormData = z.infer<typeof editSchema>

type Aba = "dados" | "timeline"

interface PerfilContatoProps {
  contato: ContatoPerfil | null
  papel: string
}

export function PerfilContato({ contato, papel }: PerfilContatoProps) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>("dados")
  const [editando, setEditando] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [novaTag, setNovaTag] = useState("")
  const [erroTag, setErroTag] = useState<string | null>(null)
  const [sequenciaAberta, setSequenciaAberta] = useState(false)
  const [salvandoTag, setSalvandoTag] = useState(false)
  const [editandoObs, setEditandoObs] = useState(false)
  const [textoObs, setTextoObs] = useState("")
  const [erroObs, setErroObs] = useState<string | null>(null)
  const [salvandoObs, setSalvandoObs] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  })

  if (!contato) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-16 text-center text-muted-foreground">
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
      nicho: contato!.nicho ?? "",
      cidade: contato!.cidade ?? "",
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
    setNovaTag("")
    router.refresh()
  }

  async function onSubmitEdicao(data: EditFormData) {
    setErroEdicao(null)
    const resultado = await atualizarDadosContato(contato!.id, {
      nome: data.nome,
      tipo: data.tipo || null,
      nicho: data.nicho || null,
      cidade: data.cidade || null,
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
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
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
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{contato.nome}</h1>
          <p className="text-sm text-muted-foreground">{contato.telefone}</p>
          <span className={cn(
            "inline-flex items-center self-start px-2 py-0.5 text-xs rounded-md border font-medium mt-1",
            CLASSIFICACAO_BADGE[contato.classificacao]
          )}>
            {CLASSIFICACAO_LABEL[contato.classificacao]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSequenciaAberta(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Zap className="size-3.5" />
            Iniciar sequência
          </button>
          <Link
            href={contato.conversaId ? `/chat?conversa=${contato.conversaId}` : "/chat"}
            className="inline-flex items-center gap-1.5 text-sm font-medium h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <MessageSquare className="size-3.5" />
            Abrir conversa
          </Link>
        </div>
      </div>

      {sequenciaAberta && (
        <IniciarSequenciaDialog
          contactId={contato.id}
          contatoNome={contato.nome}
          aberto
          onFechar={() => setSequenciaAberta(false)}
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
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                  {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
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
                  <Label htmlFor="edit-nicho">Nicho</Label>
                  <Input id="edit-nicho" type="text" {...register("nicho")} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-cidade">Cidade</Label>
                  <Input id="edit-cidade" type="text" {...register("cidade")} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-icp">ICP</Label>
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
                <Row label="WhatsApp" value={contato.telefone} />
                <Row label="Tipo" value={contato.tipo ? TIPO_LABEL[contato.tipo] : "—"} />
                <Row label="Nicho" value={contato.nicho ?? "—"} />
                <Row label="Cidade" value={contato.cidade ?? "—"} />
                <Row label="ICP" value={contato.icp ? ICP_LABEL[contato.icp] : "—"} />
              </div>
            )}
          </section>

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
                  setNovaTag(e.target.value)
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
            {erroTag && (
              <p className="text-sm text-destructive">{erroTag}</p>
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
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                    href={card.funil === "expansao" ? "/pipeline" : "/pipeline/retencao"}
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <span className="text-muted-foreground">
                      Funil de {card.funil === "expansao" ? "Expansão" : "Retenção"}:
                    </span>
                    <span className="font-medium">{card.etapaLabel}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Histórico de compras */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico de compras</h2>
              {papel !== "atendente" && (
                <RegistrarCompraDialog contactId={contato.id} />
              )}
            </div>

            {contato.compras.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma compra registrada</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Data</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contato.compras.map((compra) => (
                      <tr key={compra.id} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground">{compra.data}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatarMoeda(compra.valor)}</td>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
