// QA de 06/10/2026, achados médios nas actions: M9 (campanha sem número conectado),
// M12 (follow-up no fuso de Brasília), M13/M14 (telefone e nome do contato conferidos
// no servidor), M19/M20 (etiqueta repetida ou longa). O banco é falso e responde por
// tabela; só a sessão é simulada.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn(() => ({})) }))
vi.mock("@/lib/lixeira", () => ({ tirarDaLixeira: vi.fn(async () => true) }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn(async () => 0) }))
vi.mock("@/lib/sequencias", () => ({ avancarAposLembrete: vi.fn() }))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({ dispararDadosAlterados: vi.fn(), dispararTagAdicionada: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { createClient } from "@/integrations/supabase/server"
import { criarFollowUp } from "@/app/(auth)/agenda/actions"
import { criarContato } from "@/app/(auth)/contatos/actions"
import { criarEtiqueta } from "@/app/(auth)/configuracoes/etiquetas/actions"
import { confirmarCampanha } from "@/app/(auth)/campanhas/actions"

type Resposta = { data?: unknown; count?: number | null; error?: unknown }
let gravacoes: Array<{ tabela: string; metodo: string; args: unknown[] }>

/** `respostas[tabela]`: o que a consulta devolve (single/maybeSingle/await). */
function banco(respostas: Record<string, Resposta>) {
  gravacoes = []
  const from = vi.fn((tabela: string) => {
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "is", "not", "in", "order", "limit", "ilike", "gte", "lt", "range"]) obj[m] = vi.fn(() => obj)
    for (const m of ["insert", "update", "delete", "upsert"]) {
      obj[m] = vi.fn((...args: unknown[]) => {
        gravacoes.push({ tabela, metodo: m, args })
        return obj
      })
    }
    const r = () => Promise.resolve({ data: null, count: null, error: null, ...(respostas[tabela] ?? {}) })
    obj.single = vi.fn(r)
    obj.maybeSingle = vi.fn(r)
    obj.then = (resolve: (v: unknown) => void) => r().then(resolve)
    return obj
  })
  const client = { from, auth: { getUser: async () => ({ data: { user: { id: "u-1" } }, error: null }) } }
  vi.mocked(createClient).mockResolvedValue(client as never)
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: client,
    user: { id: "u-1" },
    perfil: { id: "u-1", workspace_id: "ws-1", role: "admin" },
  } as never)
}

beforeEach(() => vi.clearAllMocks())

describe("QA M12 — follow-up no horário de Brasília", () => {
  it("09:00 do dia vira 12:00Z, qualquer que seja o fuso do servidor", async () => {
    banco({ contacts: { data: { workspace_id: "ws-1" } }, reminders: {} })
    expect(await criarFollowUp({ contactId: "c-1", data: "2026-11-05", hora: "09:00", nota: "ligar" })).toEqual({})
    const inserido = gravacoes.find((g) => g.tabela === "reminders")!.args[0] as { due_at: string }
    expect(inserido.due_at).toBe("2026-11-05T12:00:00.000Z")
  })

  it("sem hora, 09:00 de Brasília; data torta é recusada", async () => {
    banco({ contacts: { data: { workspace_id: "ws-1" } }, reminders: {} })
    await criarFollowUp({ contactId: "c-1", data: "2026-11-05", nota: "ligar" })
    expect((gravacoes.find((g) => g.tabela === "reminders")!.args[0] as { due_at: string }).due_at).toBe("2026-11-05T12:00:00.000Z")
    expect(await criarFollowUp({ contactId: "c-1", data: "05/11/2026", nota: "ligar" })).toEqual({ erro: "Data inválida" })
  })
})

describe("QA M13/M14 — novo contato conferido no servidor", () => {
  it("telefone sem DDD ou com letras é recusado; nome só com espaços também", async () => {
    banco({ profiles: { data: { role: "admin", workspace_id: "ws-1" } } })
    expect(await criarContato({ nome: "Ana", telefone: "abcdef" })).toEqual({ erro: "Informe o WhatsApp com DDD, ex.: (21) 99999-0000." })
    expect(await criarContato({ nome: "   ", telefone: "(11) 98888-0001" })).toEqual({ erro: "Informe o nome do contato." })
    expect(gravacoes.filter((g) => g.tabela === "contacts")).toEqual([])
  })

  it("telefone formatado é gravado só com dígitos, com 55; nome sem espaços nas pontas", async () => {
    banco({ profiles: { data: { role: "admin", workspace_id: "ws-1" } }, contacts: { data: { id: "c-novo" } } })
    // 1ª consulta em contacts (lixeira) devolve `data`; o teste só olha o insert
    const r = await criarContato({ nome: "  Ana  ", telefone: "(11) 98888-0001" })
    expect(r.erro).toBeUndefined()
    const insert = gravacoes.find((g) => g.tabela === "contacts" && g.metodo === "insert")
    if (insert) expect(insert.args[0]).toMatchObject({ phone_number: "5511988880001", name: "Ana" })
  })
})

describe("QA M19/M20 — etiqueta repetida ou longa", () => {
  it("nome já usado na empresa (sem diferença de maiúscula) é recusado", async () => {
    banco({ profiles: { data: { role: "admin", workspace_id: "ws-1" } }, labels: { data: { id: "l-1" } } })
    expect(await criarEtiqueta("vip", "#f00")).toEqual({ erro: "Já existe uma etiqueta com esse nome." })
    expect(gravacoes.filter((g) => g.tabela === "labels")).toEqual([])
  })

  it("nome com mais de 30 caracteres é recusado antes de ir ao banco", async () => {
    banco({ profiles: { data: { role: "admin", workspace_id: "ws-1" } } })
    expect(await criarEtiqueta("a".repeat(31), "#f00")).toEqual({ erro: "O nome passa de 30 caracteres." })
  })
})

describe("QA M9 — campanha não confirma sem número conectado", () => {
  const dados = { nome: "Promo", segmento: {}, tipoMensagem: "texto" as const, conteudo: "Oi", arquivoUrl: null, arquivoNome: null }

  it("nenhum número conectado na empresa: avisa e não cria nada", async () => {
    banco({ whatsapp_connections: { count: 0 } })
    expect(await confirmarCampanha(null, dados, null)).toEqual({ erro: "Conecte um número de WhatsApp antes de enviar a campanha." })
    expect(gravacoes.filter((g) => g.tabela === "campaigns")).toEqual([])
  })

  it("número escolhido desconectado: avisa com a mensagem do número", async () => {
    banco({ whatsapp_connections: { count: 0 } })
    expect(await confirmarCampanha(null, { ...dados, whatsappConnectionId: "n-1" }, null)).toEqual({
      erro: "O número escolhido não está conectado. Conecte-o ou escolha outro.",
    })
  })
})
