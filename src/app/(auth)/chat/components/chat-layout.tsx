"use client"

import { useState, useTransition, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { createClient } from "@/integrations/supabase/client"
import { formatarHorarioDaLista } from "@/lib/datas"
import { FiltrosCaixa } from "./filtros-caixa"
import { PainelConversa } from "./painel-conversa"
import { buscarConversa, buscarMensagens, carregarMaisConversas, marcarComoLidas } from "../actions"
import type { Conversa, StatusConversa } from "../mock-conversas"
import type { Mensagem } from "../mock-mensagens"

interface ChatLayoutProps {
  conversas: Conversa[]
  /** A primeira página veio cheia: há mais para carregar ao rolar. */
  temMaisConversas?: boolean
  papel: string
  nomeUsuario: string
  workspaceId: string
  atendentes: Array<{ id: string; nome: string }>
  atendentesTransferir: Array<{ id: string; nome: string }>
  etiquetasDisponiveis: Array<{ id: string; nome: string; cor: string }>
  mensagensRapidas: Array<{ id: string; titulo: string; conteudo: string }>
  conversaInicialId?: string | null
}

export function ChatLayout({ conversas, temMaisConversas = false, papel, nomeUsuario, workspaceId, atendentes, atendentesTransferir, etiquetasDisponiveis, mensagensRapidas, conversaInicialId }: ChatLayoutProps) {
  const [conversasState, setConversasState] = useState<Conversa[]>(conversas)
  const [temMais, setTemMais] = useState(temMaisConversas)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null)
  const [mensagensLocais, setMensagensLocais] = useState<Record<string, Mensagem[]>>({})
  const [erroConversaId, setErroConversaId] = useState<string | null>(null)
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            last_message_text: string
            last_message_at: string
            unread_count: number
            status: string
          }

          setConversasState((prev) => {
            const idx = prev.findIndex((c) => c.id === row.id)
            if (idx === -1) return prev
            const atualizada: Conversa = {
              ...prev[idx],
              ultimaMensagem: {
                texto: row.last_message_text,
                horario: formatarHorarioDaLista(row.last_message_at),
              },
              naoLidas: row.unread_count,
              status: row.status as StatusConversa,
            }
            return [atualizada, ...prev.filter((c) => c.id !== row.id)]
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          // A primeira mensagem de um número cria a conversa, e a criação não
          // passa pelo UPDATE acima. Os dados da lista vêm do servidor, que
          // aplica as mesmas regras da carga da página.
          const { id } = payload.new as { id: string }
          buscarConversa(id)
            .then((nova) => {
              if (!nova) return
              setConversasState((prev) =>
                prev.some((c) => c.id === nova.id) ? prev : [nova, ...prev]
              )
            })
            .catch(() => {})
        }
      )
      .on(
        "broadcast",
        { event: "nova_mensagem" },
        (payload) => {
          const row = payload.payload as {
            id: string
            conversation_id: string
            workspace_id: string
            type: string
            direction: string
            content: string
            created_at: string
            status: string | null
          }
          const novaMensagem: Mensagem = {
            id: row.id,
            conversaId: row.conversation_id,
            tipo: row.type as Mensagem["tipo"],
            direcao: row.direction as Mensagem["direcao"],
            conteudo: row.content,
            horario: row.created_at,
            status: row.status as Mensagem["status"] | undefined,
          }
          setMensagensLocais((prev) => {
            const lista = prev[row.conversation_id]
            if (lista === undefined) return prev
            if (lista.some((m) => m.id === row.id)) return prev
            return { ...prev, [row.conversation_id]: [...lista, novaMensagem] }
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; conversation_id: string }
          setMensagensLocais((prev) => {
            const lista = prev[row.conversation_id]
            if (!lista) return prev
            return {
              ...prev,
              [row.conversation_id]: lista.map((m) =>
                m.id === row.id ? { ...m, status: row.status as Mensagem["status"] } : m
              ),
            }
          })
        }
      )

    // O canal precisa entrar com a credencial do usuário. Sem ela, entra como
    // anônimo, e o RLS esconde todo `postgres_changes` de conversas e
    // mensagens — só o broadcast, que não passa por RLS, chegava. A sessão lida
    // dos cookies não é repassada ao tempo real sozinha; renovações do token,
    // sim, pelo próprio cliente.
    let encerrado = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await supabase.realtime.setAuth(session.access_token)
      if (!encerrado) channel.subscribe()
    })

    return () => {
      encerrado = true
      supabase.removeChannel(channel)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!conversaInicialId) return
    const existe = conversas.find((c) => c.id === conversaInicialId)
    if (existe) handleConversaClick(conversaInicialId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversaInicialId])

  const conversasComLeitura = conversasState.map((c) =>
    abertas.has(c.id) ? { ...c, naoLidas: 0 } : c
  )

  const conversaAtiva = conversaAtivaId
    ? conversasComLeitura.find((c) => c.id === conversaAtivaId) ?? null
    : null

  function handleConversaClick(id: string) {
    setConversaAtivaId(id)
    setAbertas((prev) => new Set(prev).add(id))
    setErroConversaId(null)
    marcarComoLidas(id).catch(() => {})

    if (mensagensLocais[id] !== undefined) return

    startTransition(async () => {
      try {
        const msgs = await buscarMensagens(id)
        setMensagensLocais((prev) => {
          if (prev[id] !== undefined) return prev
          return { ...prev, [id]: msgs }
        })
      } catch {
        setErroConversaId(id)
      }
    })
  }

  // B10-04: página seguinte da caixa. O cursor é a atividade mais antiga já
  // carregada; ids repetidos (conversa que subiu ao vivo) são ignorados.
  async function handleCarregarMais() {
    if (carregandoMais || !temMais) return
    const maisAntiga = conversasState.reduce<string | null>(
      (min, c) => (c.atividadeEm && (min === null || c.atividadeEm < min) ? c.atividadeEm : min),
      null
    )
    if (!maisAntiga) return
    setCarregandoMais(true)
    try {
      const pagina = await carregarMaisConversas(maisAntiga)
      setConversasState((prev) => {
        const ids = new Set(prev.map((c) => c.id))
        return [...prev, ...pagina.filter((c) => !ids.has(c.id))]
      })
      if (pagina.length < 50) setTemMais(false)
    } catch {
      // Mantém o que já tem; rolar de novo tenta outra vez.
    } finally {
      setCarregandoMais(false)
    }
  }

  function handleMensagemEnviada(msg: Mensagem) {
    setMensagensLocais((prev) => ({
      ...prev,
      [msg.conversaId]: [...(prev[msg.conversaId] ?? []), msg],
    }))
  }

  function handleConversaAtualizada(id: string, updates: Partial<Conversa>) {
    setConversasState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const carregando = isPending && conversaAtivaId !== null && mensagensLocais[conversaAtivaId] === undefined

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
      <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h1 className="text-sm font-semibold">Caixa de Entrada</h1>
        </div>
        <FiltrosCaixa
          conversas={conversasComLeitura}
          conversaAtivaId={conversaAtivaId}
          onConversaClick={handleConversaClick}
          papel={papel}
          nomeUsuario={nomeUsuario}
          etiquetasDisponiveis={etiquetasDisponiveis}
          temMais={temMais}
          carregandoMais={carregandoMais}
          onFimDaLista={handleCarregarMais}
        />
      </aside>

      <main className="flex-1 flex overflow-hidden">
        {conversaAtiva && carregando ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="size-4 animate-spin" />
            Carregando mensagens...
          </div>
        ) : conversaAtiva && erroConversaId === conversaAtiva.id ? (
          <div className="flex-1 flex items-center justify-center text-sm text-destructive">
            Erro ao carregar mensagens
          </div>
        ) : conversaAtiva ? (
          <PainelConversa
            key={conversaAtiva.id}
            conversa={conversaAtiva}
            mensagens={mensagensLocais[conversaAtiva.id] ?? []}
            onMensagemEnviada={handleMensagemEnviada}
            podeAtribuir={papel !== "atendente"}
            atendentes={atendentes}
            atendentesTransferir={atendentesTransferir}
            onConversaAtualizada={handleConversaAtualizada}
            nomeUsuario={nomeUsuario}
            onNavegar={handleConversaClick}
            etiquetasDisponiveis={etiquetasDisponiveis}
            mensagensRapidas={mensagensRapidas}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione uma conversa para começar
          </div>
        )}
      </main>
    </div>
  )
}
