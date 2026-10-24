"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Image as ImageIcon, Info, Loader2, MessageSquare, Paperclip, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { PainelFiltro } from "../../contatos/components/painel-filtro"
import { contarCondicoes, descreverFiltro, FILTRO_VAZIO, type Filtro, type FunilParaFiltro } from "@/lib/filtro-contatos"
import {
  avaliarDisparo,
  confirmarCampanha,
  contarDestinatarios,
  salvarRascunho,
  uploadArquivoCampanha,
} from "../actions"
import type {
  AvaliacaoDoDisparo,
  CampanhaDetalhe,
  DadosCampanha,
  DestinatarioPreview,
  NumeroParaCampanha,
  Segmento,
} from "../actions"

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const textareaClass =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

interface EditorCampanhaClientProps {
  campanha: CampanhaDetalhe | null
  /** B42-02: o que o painel do filtro precisa da empresa (o mesmo da lista de Contatos). */
  opcoes: { atendentes: Array<{ id: string; nome: string }>; etiquetas: string[]; funis: FunilParaFiltro[] }
  /** B7-03: números conectados do workspace, com o canal de cada um. */
  numeros: NumeroParaCampanha[]
}

export function EditorCampanhaClient({ campanha, opcoes, numeros }: EditorCampanhaClientProps) {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [id, setId] = useState<string | null>(campanha?.id ?? null)

  const [nome, setNome] = useState(campanha?.nome ?? "")
  const [segmento, setSegmento] = useState<Segmento>(campanha?.segmento ?? {})
  const [tipoMensagem, setTipoMensagem] = useState<"texto" | "imagem" | "documento">(
    campanha?.tipoMensagem ?? "texto"
  )
  const [conteudo, setConteudo] = useState(campanha?.conteudo ?? "")
  /**
   * B7-03: número de origem. Vazio significa "o número do workspace" — é o
   * comportamento das campanhas criadas antes desta issue, e continua válido.
   * Com um número só conectado, ele já vem escolhido: não há decisão a tomar.
   */
  const [avaliacao, setAvaliacao] = useState<AvaliacaoDoDisparo | null>(null)
  const [numeroOrigem, setNumeroOrigem] = useState<string>(
    campanha?.whatsappConnectionId ?? (numeros.length === 1 ? numeros[0].id : "")
  )
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
  // B42-02: quem recebe é o filtro de Contatos; o painel monta, o servidor conta.
  const [painelAberto, setPainelAberto] = useState(false)
  const filtro = segmento.filtro ?? FILTRO_VAZIO
  const condicoes = contarCondicoes(filtro)
  const resumo = descreverFiltro(filtro, opcoes)

  function aplicarFiltro(novo: Filtro) {
    setSegmento({ filtro: novo })
    setPainelAberto(false)
  }

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
    return {
      nome,
      segmento,
      tipoMensagem,
      conteudo,
      arquivoUrl,
      arquivoNome,
      whatsappConnectionId: numeroOrigem || null,
    }
  }


  /**
   * B8-01: aviso de risco e duração estimada, calculados no servidor.
   * Refazem quando o número escolhido ou a quantidade de destinatários muda —
   * as duas entradas do cálculo.
   */
  useEffect(() => {
    let ativo = true
    if (etapa !== 3) return

    void (async () => {
      const resultado = await avaliarDisparo(numeroOrigem || null, total ?? 0)
      if (ativo) setAvaliacao(resultado)
    })()

    return () => {
      ativo = false
    }
  }, [etapa, numeroOrigem, total])

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
      // QA baixos (06/10): data no passado avisada aqui, antes de ir ao servidor.
      if (new Date(agendadaPara) <= new Date()) {
        setErro("A data de agendamento precisa estar no futuro")
        return
      }
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
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-1">
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
            <div className="flex flex-col gap-2">
              <Label>Destinatários</Label>
              <div className="flex flex-wrap items-center gap-2">
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
                    onClick={() => aplicarFiltro(FILTRO_VAZIO)}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <p className="text-sm text-muted-foreground" data-testid="resumo-do-filtro">
                {resumo || "Sem filtro: todos os contatos com WhatsApp válido."}
              </p>
              <PainelFiltro
                aberto={painelAberto}
                onAbertoChange={setPainelAberto}
                filtro={filtro}
                atendentes={opcoes.atendentes}
                etiquetas={opcoes.etiquetas}
                funis={opcoes.funis}
                onAplicar={aplicarFiltro}
                onLimpar={() => aplicarFiltro(FILTRO_VAZIO)}
              />
            </div>
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
                className="flex items-center gap-2 rounded-md border border-dashed bg-card/60 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
              <div className="rounded-lg bg-sucesso-fundo px-3 py-2 text-sm whitespace-pre-wrap max-w-sm">
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
          {/* B7-03: por qual número a campanha dispara. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="camp-numero">Enviar pelo número</Label>
            {numeros.length === 0 ? (
              <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Nenhum número conectado. Conecte um número em Configurações &gt; WhatsApp antes de
                disparar.
              </p>
            ) : (
              <>
                <select
                  id="camp-numero"
                  className={selectClass}
                  value={numeroOrigem}
                  onChange={(e) => setNumeroOrigem(e.target.value)}
                >
                  <option value="">Usar o número conectado do workspace</option>
                  {numeros.map((n) => (
                    <option key={n.id} value={n.id}>
                      {[n.numero ?? "número não confirmado", n.nomeExibicao, n.canalNome]
                        .filter(Boolean)
                        .join(" · ")}
                    </option>
                  ))}
                </select>
                {/* B8-01: o aviso e a estimativa vêm prontos do servidor. */}
                {avaliacao?.aviso && (
                  <p className="flex gap-2 rounded-lg border border-aviso/30 bg-aviso-fundo text-aviso p-3 text-xs ">
                    <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{avaliacao.aviso}</span>
                  </p>
                )}
                {/* B26-03: número em aquecimento, com o dia e os limites que a fila usa */}
                {avaliacao?.aquecimento && (
                  <p className="flex gap-2 rounded-lg border border-aviso/30 bg-aviso-fundo text-aviso p-3 text-xs">
                    <Info className="size-4 shrink-0 mt-0.5" aria-hidden />
                    <span>{avaliacao.aquecimento}</span>
                  </p>
                )}
                {avaliacao?.estimativa && (
                  <p className="rounded-lg border bg-muted/40 p-3 text-xs">
                    <strong className="font-medium">Duração estimada:</strong> {avaliacao.estimativa}
                    {!avaliacao.ritmoConfirmado && (
                      <span className="text-muted-foreground">
                        {" "}
                        Estimativa aproximada: o ritmo atual do número não pôde ser consultado, e o
                        padrão do sistema foi usado.
                      </span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>

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

      {erro && <p className="text-sm text-erro mt-4">{erro}</p>}

      {/* Navegação */}
      {/* QA M23 (06/10): no celular, "Confirmar e enviar agora" saía da tela. */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-6 mt-6 border-t">
        <div>
          {etapa > 1 && (
            <Button type="button" variant="outline" onClick={() => setEtapa(etapa - 1)}>
              Anterior
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
