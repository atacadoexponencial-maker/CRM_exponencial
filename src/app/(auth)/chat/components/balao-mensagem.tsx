"use client"

import { Check, CheckCheck, AlertTriangle, FileText, Play, Mic, Film, Download, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogTrigger, DialogPopup, DialogClose } from "@/components/ui/dialog"
import type { Mensagem, StatusMensagem } from "../mock-mensagens"

function textoComDestaque(texto: string, termo: string) {
  if (!termo.trim()) return <>{texto}</>
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const partes = texto.split(new RegExp(`(${escapado})`, "gi"))
  return (
    <>
      {partes.map((parte, i) =>
        parte.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
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
  if (status === "lido") return <CheckCheck className="size-3 text-blue-400" />
  if (status === "entregue") return <CheckCheck className="size-3 opacity-60" />
  return <Check className="size-3 opacity-60" />
}

function ConteudoMensagem({ mensagem, termoBusca }: { mensagem: Mensagem; termoBusca: string }) {
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
    case "video":
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
        return <audio src={mensagem.conteudo} controls className="w-48" />
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
        const nomeArquivo = decodeURIComponent(
          mensagem.conteudo.split("/").pop()?.replace(/^\d+-/, "") ?? "Documento"
        )
        return (
          <a
            href={mensagem.conteudo}
            target="_blank"
            rel="noopener noreferrer"
            download={nomeArquivo}
            title="Baixar documento"
            className="flex items-center gap-2 w-52 hover:opacity-80"
          >
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="size-4 text-primary" />
            </div>
            <span className="text-xs truncate flex-1">{nomeArquivo}</span>
            <Download className="size-3 shrink-0 text-muted-foreground" />
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
}

export function BalaoMensagem({ mensagem, termoBusca = "" }: BalaoMensagemProps) {
  const isEnviada = mensagem.direcao === "enviada"
  const isNota = mensagem.tipo === "nota_interna"

  if (isNota) {
    return (
      <div className="flex justify-center my-1">
        <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <span className="font-medium block mb-0.5 text-amber-600 dark:text-amber-400">Nota interna</span>
          {textoComDestaque(mensagem.conteudo, termoBusca)}
          <span className="block text-right text-[10px] opacity-60 mt-0.5">{mensagem.horario}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex my-1", isEnviada ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
          isEnviada
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {mensagem.replyDe && (
          <div
            className={cn(
              "text-xs rounded-lg px-2 py-1 mb-1.5 border-l-2 opacity-80",
              isEnviada
                ? "bg-primary-foreground/10 border-primary-foreground"
                : "bg-muted-foreground/10 border-muted-foreground"
            )}
          >
            <p className="truncate">{mensagem.replyDe.texto}</p>
          </div>
        )}

        <ConteudoMensagem mensagem={mensagem} termoBusca={termoBusca} />

        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={cn("text-[10px]", isEnviada ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {mensagem.horario}
          </span>
          {isEnviada && <IconeStatus status={mensagem.status} />}
        </div>
      </div>
    </div>
  )
}
