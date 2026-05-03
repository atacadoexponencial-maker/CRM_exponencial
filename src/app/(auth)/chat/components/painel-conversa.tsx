"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import {
  Search, Paperclip, Mic, Zap, StickyNote, Send, X, MoreVertical, Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BalaoMensagem } from "./balao-mensagem"
import { PainelContato } from "./painel-contato"
import { enviarMensagem } from "../actions"
import { MOCK_CONVERSAS } from "../mock-conversas"
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
}

export function PainelConversa({ conversa, mensagens, onMensagemEnviada }: PainelConversaProps) {
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [termoBusca, setTermoBusca] = useState("")
  const [modoNota, setModoNota] = useState(false)
  const [painelContato, setPainelContato] = useState(false)
  const [texto, setTexto] = useState("")
  const [seletorMRAberto, setSeletorMRAberto] = useState(false)
  const [termoBuscaMR, setTermoBuscaMR] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [mensagensFalhadas, setMensagensFalhadas] = useState<Set<string>>(new Set())
  const mensagensRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
  }, [conversa.id])

  useEffect(() => {
    if (mensagensRef.current) {
      mensagensRef.current.scrollTop = mensagensRef.current.scrollHeight
    }
  }, [mensagens])

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
    }
    onMensagemEnviada(nova)
    setTexto("")
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
                · {conversa.atribuidaA}
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
                {(ACOES_POR_STATUS[conversa.status] ?? []).map((acao) => (
                  <DropdownMenuItem key={acao}>{acao}</DropdownMenuItem>
                ))}
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
              <span className="text-xs text-muted-foreground shrink-0">
                {mensagensFiltradas.length} resultado{mensagensFiltradas.length !== 1 ? "s" : ""}
              </span>
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
            (termoBusca.trim() ? mensagensFiltradas : mensagensExibidas).map((msg) => (
              <BalaoMensagem key={msg.id} mensagem={msg} termoBusca={termoBusca} />
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
          {modoNota && (
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1.5 flex items-center gap-1">
              <StickyNote className="size-3" />
              Nota interna — não enviada ao cliente
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex gap-1 shrink-0 pb-1">
              <button
                title="Anexar (indisponível no protótipo)"
                disabled
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-40 cursor-not-allowed"
              >
                <Paperclip className="size-4" />
              </button>
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

            <div className="flex gap-1 shrink-0 pb-1">
              <button
                title="Gravar áudio (indisponível no protótipo)"
                disabled
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground opacity-40 cursor-not-allowed"
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
          todasConversas={MOCK_CONVERSAS}
          onFechar={() => setPainelContato(false)}
        />
      )}
    </div>
  )
}
