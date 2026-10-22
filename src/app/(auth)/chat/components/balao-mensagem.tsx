"use client"

import { useState, useRef } from "react"
import { Check, CheckCheck, Clock, AlertTriangle, FileText, Play, Pause, Mic, Film, Download, X, Reply, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogTrigger, DialogPopup, DialogClose } from "@/components/ui/dialog"
import type { Mensagem, StatusMensagem } from "../mock-mensagens"

function formatarTempo(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

function PlayerAudio({ src, isEnviada }: { src: string; isEnviada?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [tempoAtual, setTempoAtual] = useState(0)
  const [duracao, setDuracao] = useState(0)

  function handleToggle() {
    const audio = audioRef.current
    if (!audio) return
    if (tocando) {
      audio.pause()
    } else {
      audio.play()
    }
    setTocando(!tocando)
  }

  function handleTimeUpdate() {
    setTempoAtual(audioRef.current?.currentTime ?? 0)
  }

  function handleLoadedMetadata() {
    setDuracao(audioRef.current?.duration ?? 0)
  }

  function handleEnded() {
    setTocando(false)
    setTempoAtual(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  function handleBarraClick(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duracao) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    audio.currentTime = pos * duracao
    setTempoAtual(audio.currentTime)
  }

  const progresso = duracao > 0 ? (tempoAtual / duracao) * 100 : 0

  const btnClass = isEnviada
    ? "h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 hover:bg-foreground/15 transition-colors"
    : "h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 hover:bg-primary/20 transition-colors"
  const iconClass = "size-4 text-primary fill-primary"
  const trackClass = "flex-1 h-1.5 rounded-full bg-muted-foreground/30 cursor-pointer relative"
  const fillClass = "absolute left-0 top-0 h-full rounded-full bg-primary/60"
  const timeClass = "text-xs text-muted-foreground shrink-0 tabular-nums"

  return (
    <div className="flex items-center gap-2 w-52">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button onClick={handleToggle} className={btnClass}>
        {tocando
          ? <Pause className={iconClass} />
          : <Play className={iconClass} />
        }
      </button>
      <div className={trackClass} onClick={handleBarraClick}>
        <div className={fillClass} style={{ width: `${progresso}%` }} />
      </div>
      <span className={timeClass}>
        {formatarTempo(tocando || tempoAtual > 0 ? tempoAtual : duracao)}
      </span>
    </div>
  )
}

function textoComDestaque(texto: string, termo: string) {
  if (!termo.trim()) return <>{texto}</>
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const partes = texto.split(new RegExp(`(${escapado})`, "gi"))
  return (
    <>
      {partes.map((parte, i) =>
        parte.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="bg-aviso-fundo rounded-sm px-0.5">
            {parte}
          </mark>
        ) : (
          parte
        )
      )}
    </>
  )
}

function IconeStatus({ status }: { status?: StatusMensagem }) {
  if (!status) return null
  if (status === "falhou") return <AlertTriangle className="size-3 text-destructive" />
  // B26-02: aceita pela fila do número do canal direto, ainda não saiu
  if (status === "na_fila") {
    return (
      <span className="flex items-center gap-1 text-[11px] opacity-70">
        <Clock className="size-3" />
        Na fila do número
      </span>
    )
  }
  if (status === "lido") return <CheckCheck className="size-3 text-info" />
  if (status === "entregue") return <CheckCheck className="size-3 opacity-60" />
  return <Check className="size-3 opacity-60" />
}

function ConteudoMensagem({ mensagem, termoBusca, isEnviada }: { mensagem: Mensagem; termoBusca: string; isEnviada: boolean }) {
  switch (mensagem.tipo) {
    case "imagem":
      if (mensagem.conteudo.startsWith("http") || mensagem.conteudo.startsWith("blob:")) {
        return (
          <Dialog>
            <DialogTrigger className="cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mensagem.conteudo}
                alt="imagem"
                className="w-48 rounded-lg object-cover"
              />
            </DialogTrigger>
            <DialogPopup className="bg-transparent border-none shadow-none p-0 max-w-none w-auto">
              <div className="relative">
                <DialogClose className="absolute -top-3 -right-3 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors">
                  <X className="size-4" />
                </DialogClose>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mensagem.conteudo}
                  alt="imagem ampliada"
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                />
              </div>
            </DialogPopup>
          </Dialog>
        )
      }
      return (
        <div className="w-48 h-32 rounded-lg bg-muted flex flex-col items-center justify-center gap-1 border">
          <Film className="size-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate max-w-40">{mensagem.conteudo}</span>
        </div>
      )
    case "figurinha":
      // GIF e figurinha chegam como .webp (animado ou não); antes caía no texto e
      // mostrava a URL (relato dela, 20/10/2026).
      if (mensagem.conteudo.startsWith("http")) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={mensagem.conteudo} alt="figurinha" className="w-32 rounded-lg" />
      }
      return <>{textoComDestaque(mensagem.conteudo, termoBusca)}</>
    case "video":
      if (/codecs=(hvc1|hev1)/.test(mensagem.tipoDoArquivo ?? "")) {
        // HEVC: o navegador toca só o áudio com a tela preta; melhor avisar e dar o arquivo.
        return (
          <div className="w-56 rounded-lg border bg-muted/40 p-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Este vídeo veio num formato (HEVC) que o navegador não reproduz. Baixe para assistir.
            </p>
            <a
              href={mensagem.conteudo}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            >
              <Download className="size-3.5" />
              Baixar vídeo
            </a>
          </div>
        )
      }
      if (mensagem.conteudo.startsWith("http") || mensagem.conteudo.startsWith("blob:")) {
        return (
          <video
            src={mensagem.conteudo}
            controls
            className="w-48 rounded-lg"
          />
        )
      }
      return (
        <div className="w-48 h-32 rounded-lg bg-muted flex flex-col items-center justify-center gap-1 border relative">
          <div className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center">
            <Play className="size-4 text-foreground fill-foreground" />
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-40">{mensagem.conteudo}</span>
        </div>
      )
    case "audio":
      if (mensagem.conteudo.startsWith("blob:") || mensagem.conteudo.startsWith("http")) {
        return <PlayerAudio src={mensagem.conteudo} isEnviada={isEnviada} />
      }
      return (
        <div className="flex items-center gap-2 w-48">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mic className="size-4 text-primary" />
          </div>
          <div className="flex-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="text-xs text-muted-foreground shrink-0">{mensagem.conteudo}</span>
        </div>
      )
    case "documento":
      if (mensagem.conteudo.startsWith("http") || mensagem.conteudo.startsWith("blob:")) {
        // Nome original quando o temos (20/10/2026); senão, o do caminho, que é
        // gerado por nós, com os sublinhados do envio virando espaço.
        const nomeArquivo =
          mensagem.nomeDoArquivo ??
          decodeURIComponent(mensagem.conteudo.split("/").pop()?.replace(/^\d+-/, "") ?? "Documento").replace(/_/g, " ")
        return (
          <a
            href={mensagem.conteudo}
            target="_blank"
            rel="noopener noreferrer"
            download={nomeArquivo}
            title="Baixar documento"
            className="flex flex-col gap-2 w-52 hover:opacity-80"
          >
            {mensagem.miniatura && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mensagem.miniatura} alt={`Prévia de ${nomeArquivo}`} className="w-full rounded-md object-cover max-h-40" />
            )}
            <span className="flex items-center gap-2">
              <span className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="size-4 text-primary" />
              </span>
              <span className="text-xs truncate flex-1">{nomeArquivo}</span>
              <Download className="size-3 shrink-0 text-muted-foreground" />
            </span>
          </a>
        )
      }
      return (
        <div className="flex items-center gap-2 w-52">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="size-4 text-primary" />
          </div>
          <span className="text-xs truncate flex-1">{mensagem.conteudo}</span>
        </div>
      )
    default:
      return <>{textoComDestaque(mensagem.conteudo, termoBusca)}</>
  }
}

interface BalaoMensagemProps {
  mensagem: Mensagem
  termoBusca?: string
  onResponder?: (mensagem: Mensagem) => void
}

export function BalaoMensagem({ mensagem, termoBusca = "", onResponder }: BalaoMensagemProps) {
  const [hover, setHover] = useState(false)
  const isEnviada = mensagem.direcao === "enviada"
  const isNota = mensagem.tipo === "nota_interna"
  const podeResponder = mensagem.tipo === "texto" && !isNota

  if (isNota) {
    return (
      <div className="flex justify-center my-1">
        <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-aviso-fundo border border-aviso/30 text-aviso">
          <span className="font-medium block mb-0.5 text-aviso">Nota interna</span>
          {textoComDestaque(mensagem.conteudo, termoBusca)}
          <span className="block text-right text-[10px] opacity-60 mt-0.5">{mensagem.horario}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("flex my-1 group", isEnviada ? "justify-end" : "justify-start")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {podeResponder && !isEnviada && hover && (
        <button
          onClick={() => onResponder?.(mensagem)}
          className="self-center mr-1 h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
          title="Responder"
        >
          <Reply className="size-3.5" />
        </button>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          // B36-06: balões do Caderno — o enviado no tom do item ativo, o recebido na
          // superfície; os dois com a linha fina e o texto do tema.
          isEnviada
            ? "bg-secondary text-secondary-foreground border border-border rounded-br-sm"
            : "bg-card text-card-foreground border border-border rounded-bl-sm"
        )}
      >
        {isEnviada && mensagem.enviadaPeloCelular && (
          <span className="flex items-center gap-1 mb-1 text-[10px] font-medium text-muted-foreground">
            <Smartphone className="size-3" />
            Enviada pelo celular
          </span>
        )}

        {mensagem.replyDe && (
          <div
            className={cn(
              "text-xs rounded-lg px-2 py-1 mb-1.5 border-l-2 opacity-80",
              isEnviada
                ? "bg-foreground/5 border-muted-foreground"
                : "bg-muted-foreground/10 border-muted-foreground"
            )}
          >
            <p className="truncate">{mensagem.replyDe.texto}</p>
          </div>
        )}

        <ConteudoMensagem mensagem={mensagem} termoBusca={termoBusca} isEnviada={isEnviada} />

        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={cn("text-[10px]", "numero text-muted-foreground")}>
            {mensagem.horario}
          </span>
          {isEnviada && <IconeStatus status={mensagem.status} />}
        </div>
        {mensagem.status === "falhou" && mensagem.motivoFalha && (
          <p className="mt-1 text-[11px] text-erro">{mensagem.motivoFalha}</p>
        )}
      </div>
      {podeResponder && isEnviada && hover && (
        <button
          onClick={() => onResponder?.(mensagem)}
          className="self-center ml-1 h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
          title="Responder"
        >
          <Reply className="size-3.5" />
        </button>
      )}
    </div>
  )
}
