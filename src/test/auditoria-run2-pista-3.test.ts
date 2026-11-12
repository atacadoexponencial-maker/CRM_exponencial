// Auditoria de segurança run-2 (06/11/2026), pista 3: reação, edição e exclusão que
// chegam pelo gateway só mexem em mensagem das conversas de quem mandou o evento, e
// edição e exclusão só na mensagem que esse remetente escreveu. O banco é falso: uma
// tabela pequena de contatos, conversas e mensagens, com os filtros aplicados de verdade.

import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn() }))

import { receberMensagem, type EventoMensagemRecebida } from "@/lib/whatsapp/recebimento"

type Linha = Record<string, unknown>
const WS = "ws-1"
const MARIA = "5511999990001"
const JOAO = "5511999990002"

function bancoFalso() {
  const tabelas: Record<string, Linha[]> = {
    contacts: [
      { id: "c-maria", workspace_id: WS, phone_number: MARIA },
      { id: "c-joao", workspace_id: WS, phone_number: JOAO },
    ],
    conversations: [
      { id: "conv-maria", workspace_id: WS, contact_id: "c-maria" },
      { id: "conv-joao", workspace_id: WS, contact_id: "c-joao" },
    ],
    messages: [
      { id: "m-empresa-para-maria", workspace_id: WS, conversation_id: "conv-maria", direction: "enviada", wamid: "W-EMPRESA", content: "Preço: R$ 100" },
      { id: "m-da-maria", workspace_id: WS, conversation_id: "conv-maria", direction: "recebida", wamid: "W-MARIA", content: "quero 2" },
      { id: "m-do-joao", workspace_id: WS, conversation_id: "conv-joao", direction: "recebida", wamid: "W-JOAO", content: "quero 5" },
    ],
  }

  const supabase = {
    from: (tabela: string) => {
      const filtros: Array<(l: Linha) => boolean> = []
      let mudanca: Linha | null = null
      const linhas = () => (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l)))
      const aplicar = () => {
        const achadas = linhas()
        if (mudanca) for (const l of achadas) Object.assign(l, mudanca)
        return achadas
      }
      const q: Record<string, unknown> = {
        select: () => q,
        update: (m: Linha) => { mudanca = m; return q },
        eq: (campo: string, valor: unknown) => { filtros.push((l) => l[campo] === valor); return q },
        in: (campo: string, valores: unknown[]) => { filtros.push((l) => valores.includes(l[campo])); return q },
        maybeSingle: async () => ({ data: aplicar()[0] ?? null, error: null }),
        then: (r: (v: unknown) => void) => Promise.resolve({ data: aplicar(), error: null }).then(r),
      }
      return q
    },
  }
  const mensagem = (id: string) => tabelas.messages.find((m) => m.id === id)!
  return { supabase: supabase as never, mensagem }
}

const evento = (from: string, extra: Partial<EventoMensagemRecebida>): EventoMensagemRecebida => ({
  message_id: `evt-${Math.random()}`, from, from_is_lid: false, type: "unknown", ...extra,
})
const QUANDO = "2026-11-06T12:00:00.000Z"

describe("Auditoria run-2, pista 3: evento do gateway preso ao remetente", () => {
  it("cliente não edita a mensagem que a empresa mandou para ele", async () => {
    const b = bancoFalso()

    const r = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "edited", target_message_id: "W-EMPRESA", new_text: "Preço: R$ 1" } }) })

    expect(r).toEqual({ tratamento: "edicao", alvoEncontrado: false })
    expect(b.mensagem("m-empresa-para-maria")).toMatchObject({ content: "Preço: R$ 100" })
    expect(b.mensagem("m-empresa-para-maria").edited_at).toBeUndefined()
  })

  it("cliente não apaga a mensagem que a empresa mandou para ele", async () => {
    const b = bancoFalso()

    const r = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "deleted", target_message_id: "W-EMPRESA" } }) })

    expect(r).toEqual({ tratamento: "exclusao", alvoEncontrado: false })
    expect(b.mensagem("m-empresa-para-maria").deleted_at).toBeUndefined()
  })

  it("cliente não edita, não apaga nem reage na mensagem de outro cliente", async () => {
    const b = bancoFalso()

    const edicao = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "edited", target_message_id: "W-JOAO", new_text: "quero 0" } }) })
    const exclusao = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "deleted", target_message_id: "W-JOAO" } }) })
    const reacao = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { reaction: { emoji: "💀", target_message_id: "W-JOAO" } }) })

    expect([edicao, exclusao, reacao].map((r) => "alvoEncontrado" in r && r.alvoEncontrado)).toEqual([false, false, false])
    expect(b.mensagem("m-do-joao")).toEqual({ id: "m-do-joao", workspace_id: WS, conversation_id: "conv-joao", direction: "recebida", wamid: "W-JOAO", content: "quero 5" })
  })

  it("número sem contato na empresa não acha alvo nenhum", async () => {
    const b = bancoFalso()

    const r = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento("5511900000000", { system: { action: "deleted", target_message_id: "W-MARIA" } }) })

    expect(r).toEqual({ tratamento: "exclusao", alvoEncontrado: false })
    expect(b.mensagem("m-da-maria").deleted_at).toBeUndefined()
  })

  it("cliente continua editando e apagando a própria mensagem", async () => {
    const b = bancoFalso()

    const edicao = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "edited", target_message_id: "W-MARIA", new_text: "quero 3" } }) })
    expect(edicao).toEqual({ tratamento: "edicao", alvoEncontrado: true })
    expect(b.mensagem("m-da-maria")).toMatchObject({ content: "quero 3", edited_at: QUANDO })

    const exclusao = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { system: { action: "deleted", target_message_id: "W-MARIA" } }) })
    expect(exclusao).toEqual({ tratamento: "exclusao", alvoEncontrado: true })
    expect(b.mensagem("m-da-maria").deleted_at).toBe(QUANDO)
  })

  it("cliente continua reagindo à mensagem da empresa na conversa dele", async () => {
    const b = bancoFalso()

    const r = await receberMensagem({ supabase: b.supabase, workspaceId: WS, recebidoEm: QUANDO, evento: evento(MARIA, { reaction: { emoji: "👍", target_message_id: "W-EMPRESA" } }) })

    expect(r).toEqual({ tratamento: "reacao", alvoEncontrado: true })
    expect(b.mensagem("m-empresa-para-maria").reaction_emoji).toBe("👍")
  })
})
