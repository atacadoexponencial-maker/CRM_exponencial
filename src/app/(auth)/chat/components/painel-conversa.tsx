"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import {
  Search, Paperclip, Mic, Zap, StickyNote, Send, X, MoreVertical, Phone, Reply, ChevronUp, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { BalaoMensagem } from "./balao-mensagem"
import { PainelContato } from "./painel-contato"
import { enviarMensagem, enviarImagem, enviarDocumento, enviarVideo, enviarAudio, atribuirConversa, transferirConversa, resolverConversa, reabrirConversa } from "../actions"
import { MOCK_MENSAGENS_RAPIDAS } from "../mock-mensagens-rapidas"
import type { Conversa } from "../mock-conversas"
import type { Mensagem } from "../mock-mensagens"

const STATUS_LABEL: Record<string, string> = {
  em_espera: "Em espera",
  em_atendimento: "Em atendimento",
  resolvida: "Resolvida",
}

const STATUS_CLASS: Record<string, string> = {
  em_espera: "bg-amber-100 text-amber-700 border-amber-200",
  em_atendimento: "bg-green-100 text-green-700 border-green-200",
  resolvida: "bg-muted text-muted-foreground border-border",
}

const ACOES_POR_STATUS: Record<string, string[]> = {
  em_espera: ["Atribuir"],
  em_atendimento: ["Transferir", "Resolver"],
  resolvida: ["Reabrir"],
}

function horaAtual(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

interface PainelConversaProps {
  conversa: Conversa
  mensagens: Mensagem[]
  onMensagemEnviada: (msg: Mensagem) => void
  podeAtribuir: boolean
  atendentes: Array<{ id: string; nome: string }>
  atendentesTransferir: Array<{ id: string; nome: string }>
  onConversaAtualizada: (id: string, updates: Partial<Conversa>) => void
  nomeUsuario: string
}

export function PainelConversa({ conversa, mensagens, onMensagemEnviada, podeAtribuir, atendentes, atendentesTransferir, onConversaAtualizada, nomeUsuario }: PainelConversaProps) {
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")
  const [modoNota, setModoNota] = useState(false)
  const [painelContato, setPainelContato] = useState(false)
  const [texto, setTexto] = useState("")
  const [seletorMRAberto, setSeletorMRAberto] = useState(false)
  const [termoBuscaMR, setTermoBuscaMR] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [enviandoDocumento, setEnviandoDocumento] = useState(false)
  const [enviandoVideo, setEnviandoVideo] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [duracaoGravacao, setDuracaoGravacao] = useState(0)
  const [enviandoAudio, setEnviandoAudio] = useState(false)
  const [mensagensFalhadas, setMensagensFalhadas] = useState<Set<string>>(new Set())
  const [replyPara, setReplyPara] = useState<Mensagem | null>(null)
  const [indiceAtual, setIndiceAtual] = useState(0)
  const resultsRef = useRef<(HTMLDivElement | null)[]>([])
  const mensagensRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nomeExibido = conversa.contato.nome ?? conversa.contato.telefone

  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight
    }
    setTermoBusca("")
    setBuscaAberta(false)
    setModoNota(false)
    setTexto("")
    setSeletorMRAberto(false)
    setTermoBuscaMR("")
    setReplyPara(null)
  }, [conversa.id])

  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight
    }
  }, [mensagens])

  useEffect(() => {
    setIndiceAtual(0)
  }, [termoBusca])

  useEffect(() => {
    resultsRef.current[indiceAtual]?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [indiceAtual])

  async function enviar() {
    const conteudo = texto.trim()
    if (!conteudo || enviando) return
    const tempId = `local-${Date.now()}`
    const nova: Mensagem = {
      id: tempId,
      conversaId: conversa.id,
      tipo: modoNota ? "nota_interna" : "texto",
      direcao: "enviada",
      conteudo,
      horario: horaAtual(),
      status: modoNota ? undefined : "enviado",
      ...(replyPara && !modoNota ? { replyDe: { id: replyPara.id, texto: replyPara.conteudo } } : {}),
    }
    onMensagemEnviada(nova)
    setTexto("")
    setReplyPara(null)
    inputRef.current?.focus()

    if (modoNota) return

    setEnviando(true)
    try {
      await enviarMensagem(conversa.id, conteudo)
    } catch {
      setMensagensFalhadas((prev) => new Set(prev).add(tempId))
      setTexto(conteudo)
    } finally {
      setEnviando(false)
    }
  }

  async function handleAnexarImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ""
    if (!arquivo) return

    if (arquivo.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. O tamanho máximo é 5 MB.")
      return
    }

    const blobUrl = URL.createObjectURL(arquivo)
    const tempId = `local-img-${Date.now()}`
    const nova: Mensagem = {
      id: tempId,
      conversaId: conversa.id,
      tipo: "imagem",
      direcao: "enviada",
      conteudo: blobUrl,
      horario: horaAtual(),
      status: "enviado",
    }
    onMensagemEnviada(nova)

    setEnviandoImagem(true)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    try {
      await enviarImagem(conversa.id, formData)
    } catch {
      setMensagensFalhadas((prev) => new Set(prev).add(tempId))
    } finally {
      setEnviandoImagem(false)
    }
  }

  async function handleAnexarDocumento(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ""
    if (!arquivo) return

    if (arquivo.size > 100 * 1024 * 1024) {
      alert("Arquivo muito grande. O tamanho máximo é 100 MB.")
      return
    }

    const tempId = `local-doc-${Date.now()}`
    const nova: Mensagem = {
      id: tempId,
      conversaId: conversa.id,
      tipo: "documento",
      direcao: "enviada",
      conteudo: arquivo.name,
      horario: horaAtual(),
      status: "enviado",
    }
    onMensagemEnviada(nova)

    setEnviandoDocumento(true)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    try {
      await enviarDocumento(conversa.id, formData)
    } catch {
      setMensagensFalhadas((prev) => new Set(prev).add(tempId))
    } finally {
      setEnviandoDocumento(false)
    }
  }

  async function handleAnexarVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ""
    if (!arquivo) return

    if (arquivo.size > 16 * 1024 * 1024) {
      alert("Arquivo muito grande. O tamanho máximo é 16 MB.")
      return
    }

    const blobUrl = URL.createObjectURL(arquivo)
    const tempId = `local-vid-${Date.now()}`
    const nova: Mensagem = {
      id: tempId,
      conversaId: conversa.id,
      tipo: "video",
      direcao: "enviada",
      conteudo: blobUrl,
      horario: horaAtual(),
      status: "enviado",
    }
    onMensagemEnviada(nova)

    setEnviandoVideo(true)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    try {
      await enviarVideo(conversa.id, formData)
    } catch {
      setMensagensFalhadas((prev) => new Set(prev).add(tempId))
    } finally {
      setEnviandoVideo(false)
    }
  }

  async function handleIniciarGravacao() {
    if (gravando || enviandoAudio) return
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      alert("Permissão de microfone negada.")
      return
    }
    audioChunksRef.current = []
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    mr.addEventListener("dataavailable", (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    })
    mr.start()
    setGravando(true)
    setDuracaoGravacao(0)
    timerRef.current = setInterval(() => setDuracaoGravacao((d) => d + 1), 1000)
  }

  function handlePararGravacao() {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === "inactive") return
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    mr.addEventListener("stop", async () => {
      const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" })
      mr.stream.getTracks().forEach((t) => t.stop())
      mediaRecorderRef.current = null

      const blobUrl = URL.createObjectURL(blob)
      const tempId = `local-aud-${Date.now()}`
      const nova: Mensagem = {
        id: tempId,
        conversaId: conversa.id,
        tipo: "audio",
        direcao: "enviada",
        conteudo: blobUrl,
        horario: horaAtual(),
        status: "enviado",
      }
      onMensagemEnviada(nova)

      setEnviandoAudio(true)
      const formData = new FormData()
      const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "mp4" : "webm"
      formData.append("arquivo", blob, `audio.${ext}`)
      try {
        await enviarAudio(conversa.id, formData)
      } catch {
        setMensagensFalhadas((prev) => new Set(prev).add(tempId))
      } finally {
        setEnviandoAudio(false)
      }
    }, { once: true })
    mr.stop()
    setGravando(false)
    setDuracaoGravacao(0)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  const mensagensExibidas = mensagens.map((m) =>
    mensagensFalhadas.has(m.id) ? { ...m, status: "falhou" as const } : m
  )

  const mensagensFiltradas = termoBusca.trim()
    ? mensagensExibidas.filter((m) =>
        m.tipo === "texto" || m.tipo === "nota_interna"
          ? m.conteudo.toLowerCase().includes(termoBusca.toLowerCase())
          : false
      )
    : mensagensExibidas

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setPainelContato(true)}
              className="font-semibold text-sm hover:underline truncate text-left"
            >
              {nomeExibido}
            </button>
            {conversa.contato.nome && (
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Phone className="size-3" />
                {conversa.contato.telefone}
              </span>
            )}
            {conversa.atribuidaA && (
              <span className="text-xs text-muted-foreground shrink-0">
                · {conversa.atribuidaA === nomeUsuario ? "Você" : conversa.atribuidaA}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                STATUS_CLASS[conversa.status]
              )}
            >
              {STATUS_LABEL[conversa.status]}
            </span>

            <button
              onClick={() => { setBuscaAberta((v) => !v); setTermoBusca("") }}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <Search className="size-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(ACOES_POR_STATUS[conversa.status] ?? []).map((acao) => {
                  if (acao === "Atribuir" && podeAtribuir) {
                    return (
                      <DropdownMenuSub key="atribuir">
                        <DropdownMenuSubTrigger>Atribuir</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {atendentes.length === 0 ? (
                            <DropdownMenuItem disabled>Nenhum atendente</DropdownMenuItem>
                          ) : (
                            atendentes.map((a) => (
                              <DropdownMenuItem
                                key={a.id}
                                onSelect={async () => {
                                  try {
                                    const { nomeAtribuido } = await atribuirConversa(conversa.id, a.id)
                                    onConversaAtualizada(conversa.id, {
                                      atribuidaA: nomeAtribuido,
                                      status: "em_atendimento",
                                    })
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Erro ao atribuir conversa")
                                  }
                                }}
                              >
                                {a.nome}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  }
                  if (acao === "Transferir") {
                    return (
                      <DropdownMenuSub key="transferir">
                        <DropdownMenuSubTrigger>Transferir</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {atendentesTransferir.length === 0 ? (
                            <DropdownMenuItem disabled>Nenhum atendente</DropdownMenuItem>
                          ) : (
                            atendentesTransferir.map((a) => (
                              <DropdownMenuItem
                                key={a.id}
                                onSelect={async () => {
                                  try {
                                    const { nomeAtribuido } = await transferirConversa(conversa.id, a.id)
                                    onConversaAtualizada(conversa.id, { atribuidaA: nomeAtribuido })
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : "Erro ao transferir conversa")
                                  }
                                }}
                              >
                                {a.nome}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  }
                  if (acao === "Resolver") {
                    return (
                      <DropdownMenuItem
                        key="resolver"
                        onSelect={async () => {
                          try {
                            await resolverConversa(conversa.id)
                            onConversaAtualizada(conversa.id, { status: "resolvida" })
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Erro ao resolver conversa")
                          }
                        }}
                      >
                        Resolver
                      </DropdownMenuItem>
                    )
                  }
                  if (acao === "Reabrir") {
                    return (
                      <DropdownMenuItem
                        key="reabrir"
                        onSelect={async () => {
                          try {
                            const { novoStatus } = await reabrirConversa(conversa.id)
                            onConversaAtualizada(conversa.id, { status: novoStatus })
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Erro ao reabrir conversa")
                          }
                        }}
                      >
                        Reabrir
                      </DropdownMenuItem>
                    )
                  }
                  return <DropdownMenuItem key={acao}>{acao}</DropdownMenuItem>
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Barra de busca interna */}
        {buscaAberta && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar na conversa..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {termoBusca && (
              <>
                <span className="text-xs text-muted-foreground shrink-0">
                  {mensagensFiltradas.length === 0
                    ? "0 resultados"
                    : `${indiceAtual + 1} de ${mensagensFiltradas.length}`}
                </span>
                <button
                  onClick={() => setIndiceAtual((i) => (i - 1 + mensagensFiltradas.length) % mensagensFiltradas.length)}
                  disabled={mensagensFiltradas.length <= 1}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Resultado anterior"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  onClick={() => setIndiceAtual((i) => (i + 1) % mensagensFiltradas.length)}
                  disabled={mensagensFiltradas.length <= 1}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Próximo resultado"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </>
            )}
            <button onClick={() => { setBuscaAberta(false); setTermoBusca("") }}>
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}

        {/* Área de mensagens */}
        <div ref={mensagensRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
          {mensagensExibidas.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda
            </div>
          ) : (
            termoBusca.trim()
              ? mensagensFiltradas.map((msg, i) => (
                  <div key={msg.id} ref={(el) => { resultsRef.current[i] = el }}>
                    <BalaoMensagem mensagem={msg} termoBusca={termoBusca} onResponder={setReplyPara} />
                  </div>
                ))
              : mensagensExibidas.map((msg) => (
                  <BalaoMensagem key={msg.id} mensagem={msg} termoBusca={termoBusca} onResponder={setReplyPara} />
                ))
          )}
        </div>

        {/* Seletor de mensagens rápidas */}
        {seletorMRAberto && (() => {
          const termo = termoBuscaMR.toLowerCase()
          const filtradas = MOCK_MENSAGENS_RAPIDAS.filter(
            (mr) =>
              mr.titulo.toLowerCase().includes(termo) ||
              mr.conteudo.toLowerCase().includes(termo)
          )
          return (
            <div className="border-t bg-background shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b">
                <Search className="size-3.5 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar mensagem rápida..."
                  value={termoBuscaMR}
                  onChange={(e) => setTermoBuscaMR(e.target.value)}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => { setSeletorMRAberto(false); setTermoBuscaMR("") }}>
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtradas.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground">Nenhuma mensagem encontrada</p>
                ) : (
                  filtradas.map((mr) => (
                    <button
                      key={mr.id}
                      onClick={() => {
                        setTexto(mr.conteudo)
                        setSeletorMRAberto(false)
                        setTermoBuscaMR("")
                        setTimeout(() => inputRef.current?.focus(), 0)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex gap-3 items-start border-b last:border-0"
                    >
                      <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5 w-24 truncate">{mr.titulo}</span>
                      <span className="text-xs text-foreground truncate">{mr.conteudo}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )
        })()}

        {/* Barra de input */}
        <div
          className={cn(
            "border-t px-3 py-2 shrink-0 transition-colors",
            modoNota && "bg-amber-50/60 dark:bg-amber-950/20"
          )}
        >
          {replyPara && (
            <div className="flex items-center gap-2 mb-1.5 px-1 py-1 rounded-lg bg-muted/50 border-l-2 border-primary text-xs text-muted-foreground">
              <Reply className="size-3 shrink-0 text-primary" />
              <span className="truncate flex-1">{replyPara.conteudo}</span>
              <button
                onClick={() => { setReplyPara(null); inputRef.current?.focus() }}
                className="shrink-0 hover:text-foreground transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {modoNota && (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1.5 flex items-center gap-1">
              <StickyNote className="size-3" />
              Nota interna — não enviada ao cliente
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAnexarImagem}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.odt,.ods,.odp"
              hidden
              onChange={handleAnexarDocumento}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/3gpp"
              hidden
              onChange={handleAnexarVideo}
            />
            <div className="flex gap-1 shrink-0 pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={enviandoImagem || enviandoDocumento || enviandoVideo}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                    enviandoImagem || enviandoDocumento || enviandoVideo
                      ? "text-muted-foreground opacity-40 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  title="Anexar arquivo"
                >
                  <Paperclip className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top">
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                    Imagem
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => docInputRef.current?.click()}>
                    Documento
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => videoInputRef.current?.click()}>
                    Vídeo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                title="Mensagens rápidas"
                onClick={() => { setSeletorMRAberto((v) => !v); setTermoBuscaMR("") }}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  seletorMRAberto
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Zap className="size-4" />
              </button>
              <button
                title={modoNota ? "Cancelar nota interna" : "Adicionar nota interna"}
                onClick={() => setModoNota((v) => !v)}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  modoNota
                    ? "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <StickyNote className="size-4" />
              </button>
            </div>

            <textarea
              ref={inputRef}
              rows={1}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={modoNota ? "Escreva uma nota interna..." : "Digite uma mensagem..."}
              className={cn(
                "flex-1 resize-none text-sm rounded-lg border px-3 py-1.5 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 placeholder:text-muted-foreground max-h-32 leading-relaxed",
                modoNota
                  ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                  : "bg-transparent border-input"
              )}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />

            <div className="flex items-center gap-1 shrink-0 pb-1">
              {gravando && (
                <span className="text-xs tabular-nums text-destructive font-medium">
                  {String(Math.floor(duracaoGravacao / 60)).padStart(2, "0")}:{String(duracaoGravacao % 60).padStart(2, "0")}
                </span>
              )}
              <button
                title={gravando ? "Solte para enviar" : "Segurar para gravar"}
                onMouseDown={handleIniciarGravacao}
                onMouseUp={handlePararGravacao}
                onMouseLeave={gravando ? handlePararGravacao : undefined}
                onTouchStart={(e) => { e.preventDefault(); handleIniciarGravacao() }}
                onTouchEnd={(e) => { e.preventDefault(); handlePararGravacao() }}
                disabled={enviandoAudio}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  gravando
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : enviandoAudio
                    ? "text-muted-foreground opacity-40 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Mic className="size-4" />
              </button>
              <button
                onClick={enviar}
                disabled={!texto.trim() || enviando}
                className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Painel lateral de contato */}
      {painelContato && (
        <PainelContato
          conversa={conversa}
          conversaId={conversa.id}
          onFechar={() => setPainelContato(false)}
        />
      )}
    </div>
  )
}
