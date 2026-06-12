"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Image as ImageIcon, Info, Loader2, MessageSquare, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  confirmarCampanha,
  contarDestinatarios,
  salvarRascunho,
  uploadArquivoCampanha,
} from "../actions"
import type { CampanhaDetalhe, DadosCampanha, DestinatarioPreview, Segmento } from "../actions"

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

const CLASSIFICACOES = [
  { id: "lead", label: "Lead" },
  { id: "ativo", label: "Ativo" },
  { id: "em_risco", label: "Em Risco" },
  { id: "inativo", label: "Inativo" },
  { id: "perdido", label: "Perdido" },
  { id: "sem_historico", label: "Sem histórico" },
]

const TIPOS = [
  { id: "lojista", label: "Lojista" },
  { id: "revendedor", label: "Revendedor" },
  { id: "empreendedor", label: "Empreendedor" },
]

interface EditorCampanhaClientProps {
  campanha: CampanhaDetalhe | null
  opcoes: { nichos: string[]; tags: string[]; atendentes: Array<{ id: string; nome: string }> }
}

function ChipToggle({
  ativo,
  label,
  onClick,
}: {
  ativo: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        ativo
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-input text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

export function EditorCampanhaClient({ campanha, opcoes }: EditorCampanhaClientProps) {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [id, setId] = useState<string | null>(campanha?.id ?? null)

  const [nome, setNome] = useState(campanha?.nome ?? "")
  const [segmento, setSegmento] = useState<Segmento>(campanha?.segmento ?? {})
  const [tipoMensagem, setTipoMensagem] = useState<"texto" | "imagem" | "documento">(
    campanha?.tipoMensagem ?? "texto"
  )
  const [conteudo, setConteudo] = useState(campanha?.conteudo ?? "")
  const [arquivoUrl, setArquivoUrl] = useState<string | null>(campanha?.arquivoUrl ?? null)
  const [arquivoNome, setArquivoNome] = useState<string | null>(campanha?.arquivoNome ?? null)
  const [enviandoArquivo, setEnviandoArquivo] = useState(false)

  const [agendamento, setAgendamento] = useState<"agora" | "agendar">("agora")
  const [dataAgendada, setDataAgendada] = useState("")
  const [horaAgendada, setHoraAgendada] = useState("")

  const [total, setTotal] = useState<number | null>(null)
  const [amostra, setAmostra] = useState<DestinatarioPreview[]>([])
  const [contando, setContando] = useState(false)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)

  const ehReenvio = Boolean(segmento.reenvioDe)

  // Recontagem em tempo real conforme os filtros mudam (com debounce)
  useEffect(() => {
    let ativo = true
    const timer = setTimeout(async () => {
      if (!ativo) return
      setContando(true)
      try {
        const resultado = await contarDestinatarios(segmento)
        if (ativo) {
          setTotal(resultado.total)
          setAmostra(resultado.amostra)
        }
      } finally {
        if (ativo) setContando(false)
      }
    }, 400)
    return () => {
      ativo = false
      clearTimeout(timer)
    }
  }, [segmento])

  function dados(): DadosCampanha {
    return { nome, segmento, tipoMensagem, conteudo, arquivoUrl, arquivoNome }
  }

  function toggleLista(campo: "classificacoes" | "tipos" | "nichos" | "tags", valor: string) {
    setSegmento((prev) => {
      const atual = new Set(prev[campo] ?? [])
      if (atual.has(valor)) atual.delete(valor)
      else atual.add(valor)
      return { ...prev, [campo]: Array.from(atual) }
    })
  }

  function avancarEtapa1() {
    if (!nome.trim()) {
      setErro("Informe o nome da campanha")
      return
    }
    if ((total ?? 0) === 0) {
      setErro("A campanha precisa de pelo menos um destinatário")
      return
    }
    setErro(null)
    setEtapa(2)
  }

  function avancarEtapa2() {
    if (!conteudo.trim()) {
      setErro("Escreva a mensagem da campanha")
      return
    }
    if (tipoMensagem !== "texto" && !arquivoUrl) {
      setErro("Anexe o arquivo da campanha")
      return
    }
    setErro(null)
    setEtapa(3)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviandoArquivo(true)
    setErro(null)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    const resultado = await uploadArquivoCampanha(formData)
    setEnviandoArquivo(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setArquivoUrl(resultado.url ?? null)
    setArquivoNome(resultado.nome ?? null)
  }

  async function handleSalvarRascunho() {
    setSalvando(true)
    setErro(null)
    const resultado = await salvarRascunho(id, dados())
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    if (resultado.id) setId(resultado.id)
    router.push("/campanhas")
  }

  async function handleConfirmar() {
    let agendadaPara: string | null = null
    if (agendamento === "agendar") {
      if (!dataAgendada) {
        setErro("Escolha a data do agendamento")
        return
      }
      agendadaPara = new Date(`${dataAgendada}T${horaAgendada || "09:00"}:00`).toISOString()
    }
    setSalvando(true)
    setErro(null)
    const resultado = await confirmarCampanha(id, dados(), agendadaPara)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.push("/campanhas")
  }

  const previewMensagem = conteudo
    .replaceAll("{{nome_contato}}", amostra[0]?.nome ?? "Maria")
    .replaceAll("{{nome_vendedor}}", "Vendedor(a)")

  return (
    <>
      <h1 className="text-xl font-semibold mb-1">
        {campanha ? `Editar campanha — ${campanha.nome}` : "Nova campanha"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Etapa {etapa} de 3 — {etapa === 1 ? "Destinatários" : etapa === 2 ? "Mensagem" : "Agendamento"}
      </p>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              n <= etapa ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* ─── Etapa 1: Destinatários ─── */}
      {etapa === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="camp-nome">Nome da campanha</Label>
            <Input
              id="camp-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lançamento coleção inverno"
            />
          </div>

          {ehReenvio ? (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              Reenvio: os destinatários são os contatos que falharam na campanha original.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label>Classificação</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CLASSIFICACOES.map((c) => (
                    <ChipToggle
                      key={c.id}
                      label={c.label}
                      ativo={(segmento.classificacoes ?? []).includes(c.id)}
                      onClick={() => toggleLista("classificacoes", c.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tipo de contato</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS.map((t) => (
                    <ChipToggle
                      key={t.id}
                      label={t.label}
                      ativo={(segmento.tipos ?? []).includes(t.id)}
                      onClick={() => toggleLista("tipos", t.id)}
                    />
                  ))}
                </div>
              </div>

              {opcoes.nichos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Nicho</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {opcoes.nichos.map((n) => (
                      <ChipToggle
                        key={n}
                        label={n}
                        ativo={(segmento.nichos ?? []).includes(n)}
                        onClick={() => toggleLista("nichos", n)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {opcoes.tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Tag do contato</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {opcoes.tags.map((t) => (
                      <ChipToggle
                        key={t}
                        label={t}
                        ativo={(segmento.tags ?? []).includes(t)}
                        onClick={() => toggleLista("tags", t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="camp-cidade">Cidade</Label>
                  <Input
                    id="camp-cidade"
                    value={segmento.cidade ?? ""}
                    onChange={(e) => setSegmento((prev) => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Correspondência parcial"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="camp-atendente">Atendente responsável</Label>
                  <select
                    id="camp-atendente"
                    className={selectClass}
                    value={segmento.atendenteId ?? ""}
                    onChange={(e) =>
                      setSegmento((prev) => ({ ...prev, atendenteId: e.target.value || undefined }))
                    }
                  >
                    <option value="">Todos</option>
                    {opcoes.atendentes.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Preview de destinatários */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {contando ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Contando…
                  </span>
                ) : (
                  `${total ?? 0} ${total === 1 ? "destinatário" : "destinatários"}`
                )}
              </span>
            </div>
            {amostra.length > 0 && (
              <div className="max-h-40 overflow-y-auto divide-y text-sm">
                {amostra.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5">
                    <span>{d.nome}</span>
                    <span className="text-muted-foreground text-xs">{d.telefone}</span>
                  </div>
                ))}
                {(total ?? 0) > amostra.length && (
                  <p className="py-1.5 text-xs text-muted-foreground">
                    … e mais {(total ?? 0) - amostra.length}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Etapa 2: Mensagem ─── */}
      {etapa === 2 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Tipo de mensagem</Label>
            <div className="flex gap-2">
              {(
                [
                  ["texto", "Texto", MessageSquare],
                  ["imagem", "Imagem + legenda", ImageIcon],
                  ["documento", "Documento + legenda", FileText],
                ] as Array<["texto" | "imagem" | "documento", string, typeof MessageSquare]>
              ).map(([tipo, label, Icone]) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoMensagem(tipo)}
                  className={cn(
                    "flex-1 rounded-lg border p-3 text-sm flex flex-col items-center gap-1.5 transition-colors",
                    tipoMensagem === tipo
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icone className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tipoMensagem !== "texto" && (
            <div className="flex flex-col gap-1.5">
              <Label>Arquivo</Label>
              <input
                ref={arquivoRef}
                type="file"
                accept={tipoMensagem === "imagem" ? "image/*" : undefined}
                className="hidden"
                onChange={handleUpload}
              />
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                disabled={enviandoArquivo}
                className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {enviandoArquivo ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                {arquivoNome ?? "Escolher arquivo…"}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="camp-conteudo">
                {tipoMensagem === "texto" ? "Mensagem" : "Legenda"}
              </Label>
              <span className="text-xs text-muted-foreground">
                Variáveis: {"{{nome_contato}}"} e {"{{nome_vendedor}}"}
              </span>
            </div>
            <textarea
              id="camp-conteudo"
              className={textareaClass}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Olá {{nome_contato}}! Temos novidades para você…"
            />
          </div>

          {conteudo.trim() && (
            <div className="rounded-lg border p-3">
              <span className="text-xs text-muted-foreground block mb-1.5">Preview</span>
              <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm whitespace-pre-wrap max-w-sm">
                {previewMensagem}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            <span>
              A Meta só entrega mensagens livres para contatos que interagiram nas últimas 24
              horas. Para os demais, o envio pode falhar — acompanhe o relatório e considere
              usar um template aprovado para listas frias.
            </span>
          </div>
        </div>
      )}

      {/* ─── Etapa 3: Agendamento ─── */}
      {etapa === 3 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Quando enviar</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAgendamento("agora")}
                className={cn(
                  "flex-1 rounded-lg border p-3 text-sm transition-colors",
                  agendamento === "agora"
                    ? "border-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Enviar imediatamente
              </button>
              <button
                type="button"
                onClick={() => setAgendamento("agendar")}
                className={cn(
                  "flex-1 rounded-lg border p-3 text-sm transition-colors",
                  agendamento === "agendar"
                    ? "border-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Agendar data e hora
              </button>
            </div>
          </div>

          {agendamento === "agendar" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="camp-data">Data</Label>
                <Input
                  id="camp-data"
                  type="date"
                  value={dataAgendada}
                  onChange={(e) => setDataAgendada(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="camp-hora">Hora</Label>
                <Input
                  id="camp-hora"
                  type="time"
                  value={horaAgendada}
                  onChange={(e) => setHoraAgendada(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="rounded-lg border p-4 flex flex-col gap-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resumo da campanha
            </span>
            <div className="grid grid-cols-2 gap-y-1.5">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{nome || "—"}</span>
              <span className="text-muted-foreground">Destinatários</span>
              <span className="font-medium">{total ?? 0}</span>
              <span className="text-muted-foreground">Tipo de mensagem</span>
              <span className="font-medium capitalize">{tipoMensagem}</span>
              <span className="text-muted-foreground">Envio</span>
              <span className="font-medium">
                {agendamento === "agora"
                  ? "Imediato"
                  : dataAgendada
                    ? `${new Date(dataAgendada + "T00:00:00").toLocaleDateString("pt-BR")} às ${horaAgendada || "09:00"}`
                    : "—"}
              </span>
            </div>
          </div>

          {agendamento === "agendar" && (
            <div className="rounded-lg border p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              <span>
                O disparo agendado é processado pela rotina diária do sistema (ou ao abrir a
                lista de campanhas após o horário) — o horário exato pode variar.
              </span>
            </div>
          )}
        </div>
      )}

      {erro && <p className="text-sm text-destructive mt-4">{erro}</p>}

      {/* Navegação */}
      <div className="flex items-center justify-between gap-2 pt-6 mt-6 border-t">
        <div>
          {etapa > 1 && (
            <Button type="button" variant="outline" onClick={() => setEtapa(etapa - 1)}>
              Anterior
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={handleSalvarRascunho} disabled={salvando}>
            Salvar como rascunho
          </Button>
          {etapa === 1 && <Button onClick={avancarEtapa1}>Próximo</Button>}
          {etapa === 2 && <Button onClick={avancarEtapa2}>Próximo</Button>}
          {etapa === 3 && (
            <Button onClick={handleConfirmar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : null}
              {agendamento === "agora" ? "Confirmar e enviar agora" : "Confirmar e agendar"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
