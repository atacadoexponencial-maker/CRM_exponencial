// Auditoria de segurança run-2 (06/11/2026): pistas 1, 2 e 4 corrigidas.
// 1. Excluir pelo card segue a regra de excluir pelo contato (conversa ou card do atendente).
// 2. Editar template só manda à Meta o id de um template da própria conta.
// 4. Apagar de vez não leva o arquivo da automação, que é da empresa.
// O banco, o Storage e a Meta são falsos.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
let sessao: { supabase: unknown; user: { id: string } | null; perfil: { role: string; workspace_id: string } | null }
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn(async () => sessao) }))
let servico: unknown
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => servico) }))
vi.mock("@/lib/whatsapp/realtime", () => ({
  transmitirContatoExcluido: vi.fn().mockResolvedValue(undefined),
  transmitirContatoRestaurado: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/automacoes/esperas", () => ({ CONTATO_NA_LIXEIRA: "contato_na_lixeira", cancelarEsperasDoContato: vi.fn().mockResolvedValue(undefined) }))

import { excluirContatoPorCard, resumoExclusaoPorCard } from "@/app/(auth)/contatos/lixeira/actions"
import { editarTemplate } from "@/app/(auth)/configuracoes/templates/actions"
import { arquivosDoContato } from "@/lib/lixeira"
import { partesDoTemplate } from "@/lib/templates-da-meta"
import type { createServiceClient } from "@/integrations/supabase/service"

/** Consulta falsa: guarda os filtros e responde pelo que a função passada decidir. */
function consulta(responder: (tabela: string, filtros: Record<string, unknown>, opcoes: { head?: boolean; unica?: boolean }) => unknown, tabela: string) {
  const filtros: Record<string, unknown> = {}
  const opcoes: { head?: boolean; unica?: boolean } = {}
  const q: Record<string, unknown> = {}
  q.select = vi.fn((_c?: string, o?: { head?: boolean }) => { if (o?.head) opcoes.head = true; return q })
  for (const m of ["eq", "is", "not", "in", "neq", "order", "limit"]) q[m] = vi.fn((campo: string, valor: unknown) => { filtros[`${m}:${campo}`] = valor; return q })
  q.update = vi.fn((linha: unknown) => { filtros.update = linha; return q })
  q.maybeSingle = vi.fn(async () => { opcoes.unica = true; return responder(tabela, filtros, opcoes) })
  q.then = (r: (v: unknown) => void, f?: (e: unknown) => void) => Promise.resolve(responder(tabela, filtros, opcoes)).then(r, f)
  return q
}

// ── Pista 1 ──────────────────────────────────────────────────────────

describe("Auditoria run-2, pista 1: excluir contato pelo card", () => {
  let lixeira: unknown[]

  /** Card visível pelo RLS (sem responsável) do contato c1; o atendente tem `meus` conversas e cards dele. */
  function cenario(papel: string, meus: { conversas: number; cards: number }) {
    lixeira = []
    sessao = {
      user: { id: "u-a" },
      perfil: { role: papel, workspace_id: "ws-1" },
      supabase: {
        from: (tabela: string) =>
          consulta((t, filtros, opcoes) => {
            if (t === "pipeline_cards" && opcoes.unica) return { data: { contact_id: "c1" }, error: null }
            if (t === "contacts") return { data: { id: "c1", name: "Cliente do colega", phone_number: "5511999990000" }, error: null }
            if (t === "conversations" && opcoes.head) return { count: filtros["eq:assigned_to"] === "u-a" ? meus.conversas : 0 }
            if (t === "pipeline_cards" && opcoes.head) return { count: filtros["eq:atendente_id"] === "u-a" ? meus.cards : 0 }
            return { data: [], error: null }
          }, tabela),
      },
    }
    servico = {
      from: (tabela: string) =>
        consulta((t, filtros) => {
          if (t === "contacts" && filtros.update) lixeira.push({ id: filtros["eq:id"], ...(filtros.update as object) })
          return { data: [], error: null, count: 0 }
        }, tabela),
      rpc: vi.fn(async () => ({ data: [], error: null })),
    }
  }

  it("atendente sem conversa nem card dele não manda para a lixeira o contato de um card sem responsável", async () => {
    cenario("atendente", { conversas: 0, cards: 0 })

    expect(await excluirContatoPorCard("card-sem-dono")).toEqual({ erro: "Você não pode excluir este contato." })
    expect(lixeira).toEqual([])
  })

  it("atendente sem conversa nem card dele não abre o resumo da exclusão pelo card", async () => {
    cenario("atendente", { conversas: 0, cards: 0 })

    expect(await resumoExclusaoPorCard("card-sem-dono")).toEqual({ erro: "Você não pode excluir este contato." })
  })

  it("atendente com card próprio do contato continua excluindo pelo card", async () => {
    cenario("atendente", { conversas: 0, cards: 1 })

    expect(await excluirContatoPorCard("card-dele")).toEqual({ ok: true })
    expect(lixeira).toHaveLength(1)
  })

  it("atendente com conversa atribuída a ele continua excluindo pelo card", async () => {
    cenario("atendente", { conversas: 1, cards: 0 })

    expect(await excluirContatoPorCard("card-sem-dono")).toEqual({ ok: true })
    expect(lixeira).toHaveLength(1)
  })

  it.each(["admin", "gerente"])("%s continua excluindo qualquer contato da empresa pelo card", async (papel) => {
    cenario(papel, { conversas: 0, cards: 0 })

    expect(await excluirContatoPorCard("card-sem-dono")).toEqual({ ok: true })
    expect(lixeira).toEqual([expect.objectContaining({ id: "c1", excluido_por: "u-a" })])
  })
})

// ── Pista 2 ──────────────────────────────────────────────────────────

describe("Auditoria run-2, pista 2: editar template", () => {
  let chamadas: Array<{ url: string; method: string }>
  const partes = partesDoTemplate([{ type: "BODY", text: "Olá, temos novidades." }])!

  beforeEach(() => {
    chamadas = []
    sessao = { user: { id: "u-g" }, perfil: { role: "gerente", workspace_id: "ws-1" }, supabase: {} }
    servico = { from: (tabela: string) => consulta(() => ({ data: { waba_id: "waba-1", access_token: "tk-1" }, error: null }), tabela) }
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url: String(url), method: init?.method ?? "GET" })
      if (String(url).includes("/waba-1/message_templates")) {
        return new Response(JSON.stringify({
          data: [
            { id: "111", name: "boas_vindas", status: "APPROVED", category: "MARKETING", language: "pt_BR" },
            // id com caractere reservado: prova que o id vai codificado na URL
            { id: "333/x?y", name: "estranho", status: "APPROVED", category: "MARKETING", language: "pt_BR" },
          ],
        }))
      }
      return new Response(JSON.stringify({ success: true }))
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("id que não é template da conta (caminho para outro ponto da Meta) é recusado sem nenhum POST", async () => {
    const r = await editarTemplate({ id: "999/deregister", category: "MARKETING", partes })

    expect(r).toEqual({ erro: "Template não encontrado." })
    expect(chamadas.filter((c) => c.method === "POST")).toEqual([])
  })

  it("id de outro template, fora da conta, também é recusado sem POST", async () => {
    expect(await editarTemplate({ id: "222", category: "MARKETING", partes })).toEqual({ erro: "Template não encontrado." })
    expect(chamadas.filter((c) => c.method === "POST")).toEqual([])
  })

  it("template da conta segue para a Meta pelo próprio id", async () => {
    expect(await editarTemplate({ id: "111", category: "MARKETING", partes })).toEqual({})
    const post = chamadas.find((c) => c.method === "POST")!
    expect(new URL(post.url).pathname).toMatch(/\/111$/)
  })

  it("o id vai codificado na URL: barra e interrogação não mudam o caminho nem empurram o token", async () => {
    expect(await editarTemplate({ id: "333/x?y", category: "MARKETING", partes })).toEqual({})
    const post = chamadas.find((c) => c.method === "POST")!
    expect(post.url).toContain("/333%2Fx%3Fy?access_token=tk-1")
    expect(new URL(post.url).pathname).toMatch(/\/333%2Fx%3Fy$/)
    expect(new URL(post.url).searchParams.get("access_token")).toBe("tk-1")
  })
})

// ── Pista 4 ──────────────────────────────────────────────────────────

describe("Auditoria run-2, pista 4: apagar de vez", () => {
  it("não leva os arquivos de automação nem de campanha; leva os da conversa e a mídia recebida do contato", async () => {
    const pasta = "https://projeto.supabase.co/storage/v1/object/public/chat-attachments"
    const conteudos = [
      `${pasta}/ws-1/automacoes/1730000000000-catalogo.pdf`,
      `${pasta}/ws-1/campanhas/1730000000000-promo.jpg`,
      `${pasta}/ws-1/conv-1/1730000000001.jpg`,
      `${pasta}/ws-1/recebidas/1730000000002-abc.jpg`,
      `${pasta}/ws-2/conv-9/1730000000003.jpg`,
    ]
    const svc = {
      from: (tabela: string) =>
        consulta((t) => (t === "conversations" ? { data: [{ id: "conv-1" }], error: null } : { data: conteudos.map((content) => ({ content })), error: null }), tabela),
    } as unknown as ReturnType<typeof createServiceClient>

    expect(await arquivosDoContato(svc, "ws-1", "c1")).toEqual(["ws-1/conv-1/1730000000001.jpg", "ws-1/recebidas/1730000000002-abc.jpg"])
  })
})
