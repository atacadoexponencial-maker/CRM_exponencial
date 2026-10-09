// @vitest-environment node
// B22-01 — a proteção de repetição só gasta a vez quando alguma ação deu certo
// (achado G1 do QA das automações, 09/10/2026). Roda `motivoParaIgnorar` contra o
// banco real: o filtro que decide é o `caminho @> ...` do PostgREST, que um banco
// falso não confere. Grava com a service role, numa empresa criada só para o teste.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { motivoParaIgnorar, type PassoGravado, type RegraDaExecucao } from "@/lib/automacoes/execucoes"
import type { ServiceClient } from "@/lib/automacoes/contexto"
import type { Repeticao } from "@/lib/fluxo-automacao"

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const REGRA_ID = crypto.randomUUID()
const OUTRA_REGRA_ID = crypto.randomUUID()
const HORA_EM_MS = 3_600_000

let workspaceId = ""
const contatos: Record<string, string> = {}

// Passos do caminho como o motor grava (ver passosDoCaminho)
const posicao = { x: 0, y: 0 }
const gatilho: PassoGravado = { bloco: { id: "g", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao } }
const condicaoNao: PassoGravado = {
  bloco: { id: "c", tipo: "condicao", verificacoes: [{ tipo: "texto", operador: "contem", valor: "catálogo" }], posicao },
  saida: "nao",
} as unknown as PassoGravado
const acao = (ok: boolean): PassoGravado => ({
  bloco: { id: `a-${ok}`, tipo: "acao", acao: "adicionar_tag", parametros: { tag: "catalogo" }, posicao },
  ok,
  ...(ok ? {} : { motivo: "Erro ao gravar a tag" }),
})

async function gravarExecucao(dados: {
  contato: string
  resultado: "concluida" | "falhou" | "ignorada"
  caminho: PassoGravado[]
  regraId?: string
  horasAtras?: number
}) {
  const { error } = await service.from("automation_runs").insert({
    workspace_id: workspaceId,
    regra_id: dados.regraId ?? REGRA_ID,
    regra_origem: "fluxo",
    regra_nome: "Catálogo B22-01",
    contact_id: contatos[dados.contato],
    evento: { tipo: "mensagem_recebida" },
    resultado: dados.resultado,
    caminho: dados.caminho as unknown as never,
    created_at: new Date(Date.now() - (dados.horasAtras ?? 0) * HORA_EM_MS).toISOString(),
  })
  if (error) throw error
}

const regra = (repeticao: Repeticao): RegraDaExecucao => ({ id: REGRA_ID, nome: "Catálogo B22-01", repeticao })
const UMA_VEZ: Repeticao = { modo: "uma_vez_por_contato" }
const conferir = (repeticao: Repeticao, contato: string) =>
  motivoParaIgnorar(service as unknown as ServiceClient, regra(repeticao), contatos[contato])

beforeAll(async () => {
  workspaceId = (await service.from("workspaces").insert({ name: `Proteção B22-01 ${ts}` }).select("id").single()).data!.id
  const nomes = ["comAcao", "soNao", "acoesFalharam", "umaFalhouOutraNao", "falhouSemCaminho", "outraRegra", "soIgnorada", "janela"]
  for (const [i, nome] of nomes.entries()) {
    const { data, error } = await service
      .from("contacts")
      .insert({ workspace_id: workspaceId, name: nome, phone_number: `5500${String(ts).slice(-8)}${i}` })
      .select("id")
      .single()
    if (error) throw error
    contatos[nome] = data.id
  }

  await gravarExecucao({ contato: "comAcao", resultado: "concluida", caminho: [gatilho, acao(true)] })
  await gravarExecucao({ contato: "soNao", resultado: "concluida", caminho: [gatilho, condicaoNao] })
  await gravarExecucao({ contato: "acoesFalharam", resultado: "falhou", caminho: [gatilho, acao(false), acao(false)] })
  await gravarExecucao({ contato: "umaFalhouOutraNao", resultado: "falhou", caminho: [gatilho, acao(false), acao(true)] })
  await gravarExecucao({ contato: "falhouSemCaminho", resultado: "falhou", caminho: [] })
  await gravarExecucao({ contato: "outraRegra", resultado: "concluida", caminho: [gatilho, acao(true)], regraId: OUTRA_REGRA_ID })
  await gravarExecucao({ contato: "soIgnorada", resultado: "ignorada", caminho: [] })
  // Uma execução com ação há 10 horas e uma sem ação há 1 hora
  await gravarExecucao({ contato: "janela", resultado: "concluida", caminho: [gatilho, acao(true)], horasAtras: 10 })
  await gravarExecucao({ contato: "janela", resultado: "concluida", caminho: [gatilho, condicaoNao], horasAtras: 1 })
}, 60_000)

afterAll(async () => {
  if (!workspaceId) return
  await service.from("automation_runs").delete().eq("workspace_id", workspaceId)
  await service.from("contacts").delete().eq("workspace_id", workspaceId)
  await service.from("workspaces").delete().eq("id", workspaceId)
}, 60_000)

describe("B22-01 — 'uma vez por contato' só gasta a vez com ação que deu certo", () => {
  it("execução anterior com ação que deu certo: ignora", async () => {
    expect(await conferir(UMA_VEZ, "comAcao")).toBe("Já rodou para este contato (proteção: uma vez por contato)")
  })

  it("execução anterior que só saiu pelo 'não', sem ação: roda (o caso do QA)", async () => {
    expect(await conferir(UMA_VEZ, "soNao")).toBeNull()
  })

  it("execução anterior em que todas as ações falharam: roda", async () => {
    expect(await conferir(UMA_VEZ, "acoesFalharam")).toBeNull()
  })

  it("execução anterior com uma ação que falhou e outra que deu certo: ignora", async () => {
    expect(await conferir(UMA_VEZ, "umaFalhouOutraNao")).not.toBeNull()
  })

  it("execução que falhou antes de percorrer o fluxo (sem caminho): roda", async () => {
    expect(await conferir(UMA_VEZ, "falhouSemCaminho")).toBeNull()
  })

  it("ação de outra regra para o mesmo contato: roda", async () => {
    expect(await conferir(UMA_VEZ, "outraRegra")).toBeNull()
  })

  it("só execução ignorada antes: roda", async () => {
    expect(await conferir(UMA_VEZ, "soIgnorada")).toBeNull()
  })
})

describe("B22-01 — 'a cada N horas' só conta execuções com ação dentro da janela", () => {
  it("ação há 10 horas e janela de 24: ignora", async () => {
    expect(await conferir({ modo: "a_cada_horas", horas: 24 }, "janela")).toBe(
      "Já rodou para este contato nas últimas 24 horas (proteção de repetição)"
    )
  })

  it("ação há 10 horas, execução sem ação há 1 hora e janela de 6: roda", async () => {
    expect(await conferir({ modo: "a_cada_horas", horas: 6 }, "janela")).toBeNull()
  })
})
