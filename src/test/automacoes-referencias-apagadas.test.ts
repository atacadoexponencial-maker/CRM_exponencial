// B22-27 — escolhas apagadas no fluxo (achado M8 do QA das automações,
// 09/10/2026): etiqueta, time ou mensagem rápida apagados aparecem como "(não
// existe mais)", e não pelo id; o bloco fica marcado; ativar a regra confere.

import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { Fluxo } from "@/lib/fluxo-automacao"
import { referenciasQueSumiram, type OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { fraseBloco } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { alternarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"

const posicao = { x: 0, y: 0 }

const OPCOES: OpcoesEditor = {
  etiquetas: [{ id: "e-vip", nome: "VIP", cor: "#000" }],
  atendentes: [{ id: "u-ana", nome: "Ana" }],
  tags: [],
  times: [{ id: "t-entrada", nome: "Entrada" }],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
}

const fluxo: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "etiqueta_aplicada", parametros: { label_id: "e-apagada" }, posicao },
    {
      id: "c",
      tipo: "condicao",
      verificacoes: [
        { id: "v1", tipo: "etiqueta_conversa", operador: "tem", valor: "e-vip" },
        { id: "v2", tipo: "atendente", operador: "e", valor: "u-desativado" },
      ],
      posicao,
    },
    { id: "a1", tipo: "acao", acao: "atribuir_time", parametros: { time_id: "t-apagado" }, posicao },
    { id: "a2", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "nova-tag" }, posicao },
    { id: "a3", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "e-vip" }, posicao },
  ],
  ligacoes: [],
}

describe("B22-27 — escolhas que sumiram", () => {
  it("marca só os blocos com escolha apagada da empresa", () => {
    expect(referenciasQueSumiram(fluxo, OPCOES)).toEqual({
      g: ["Etiqueta: a opção escolhida foi apagada ou desativada"],
      a1: ["Time: a opção escolhida foi apagada ou desativada"],
    })
  })

  it("atendente desativado numa condição continua valendo (B22-02)", () => {
    expect(referenciasQueSumiram(fluxo, OPCOES).c).toBeUndefined()
  })

  it("a frase mostra '(não existe mais)', e não o id", () => {
    expect(fraseBloco(fluxo.blocos[0], OPCOES)).toBe('Quando a etiqueta "(não existe mais)" for aplicada')
    expect(fraseBloco(fluxo.blocos[2], OPCOES)).toBe("Atribuir ao time (não existe mais)")
  })

  it("tag nova (texto livre) não conta como apagada", () => {
    expect(fraseBloco(fluxo.blocos[3], OPCOES)).toBe('Adicionar a tag "nova-tag"')
  })
})

describe("B22-27 — ativar confere as escolhas", () => {
  /** Banco em que a regra existe e nenhuma etiqueta ou time conferido existe mais. */
  function sessao(f: Fluxo) {
    const atualizou = vi.fn()
    const from = vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "is", "not"]) obj[m] = vi.fn(() => obj)
      obj.update = vi.fn(() => {
        atualizou(tabela)
        return obj
      })
      obj.maybeSingle = vi.fn(async () => ({ data: tabela === "automation_flows" ? { fluxo: f, id: "r1" } : null, error: null }))
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve)
      return obj
    })
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: { from },
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
    return { atualizou }
  }

  const comEtiqueta: Fluxo = {
    blocos: [
      { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
      { id: "a", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "e-apagada" }, posicao },
    ],
    ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
  }

  it("ativar com etiqueta apagada recusa e não grava", async () => {
    const { atualizou } = sessao(comEtiqueta)
    const resposta = await alternarRegra("r1", true)
    expect(resposta.erro).toMatch(/^Não dá para ativar: /)
    expect(atualizou).not.toHaveBeenCalled()
  })

  it("pausar não confere", async () => {
    const { atualizou } = sessao(comEtiqueta)
    await alternarRegra("r1", false)
    expect(atualizou).toHaveBeenCalledWith("automation_flows")
  })
})
