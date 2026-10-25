// B28-03 — bloco "esperar" pelas mensagens, no motor: a mensagem do contato e a do
// time seguem a espera pela saída delas, antes das regras do evento; a mensagem que
// começou a regra, a de outro contato e a de automação não mudam nada; as condições
// depois da espera leem a mensagem nova; e o teto de 30 dias expira. O banco é falso.

import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))

import { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes, type GatilhoAutomacao } from "@/lib/automacoes"
import { ESPERA_EXPIROU, seguirEsperasVencidas } from "@/lib/automacoes/esperas"
import type { PassoGravado } from "@/lib/automacoes/execucoes"
import type { BlocoEspera, Fluxo } from "@/lib/fluxo-automacao"

const DIA = 86_400_000
const posicao = { x: 0, y: 0 }

const espera = (mudancas: Partial<BlocoEspera>): BlocoEspera => ({
  id: "e",
  tipo: "espera",
  tempo: { quantidade: "2", unidade: "dias" },
  recebeuMensagem: false,
  atendenteEnviou: false,
  limite: "30_dias",
  posicao,
  ...mudancas,
})
const etiqueta = (id: string) => ({ id, tipo: "acao" as const, acao: "aplicar_etiqueta" as const, parametros: { label_id: `etiqueta-${id}` }, posicao })

/** gatilho → esperar → uma ação por saída ligada: "tempo", "recebeu" e "atendente". */
function fluxoDeEspera(bloco: BlocoEspera, gatilho: Fluxo["blocos"][number] = cardMovido): Fluxo {
  const saidas = [
    { saida: "tempo" as const, acao: "tempo", ligada: !!bloco.tempo },
    { saida: "recebeu_mensagem" as const, acao: "recebeu", ligada: bloco.recebeuMensagem },
    { saida: "atendente_enviou" as const, acao: "atendente", ligada: bloco.atendenteEnviou },
  ].filter((s) => s.ligada)
  return {
    blocos: [gatilho, bloco, ...saidas.map((s) => etiqueta(s.acao))],
    ligacoes: [{ de: "g", saida: "proximo", para: "e" }, ...saidas.map((s) => ({ de: "e", saida: s.saida, para: s.acao }))],
  }
}

const cardMovido = { id: "g", tipo: "gatilho" as const, gatilho: "card_movido" as const, parametros: { funil: "entrada" }, posicao }
const eventoDoCard: GatilhoAutomacao = { tipo: "card_movido", workspaceId: "ws-1", contactId: "contato-1", cardId: "card-1", funil: "entrada", etapa: "lead" }

const mensagem = (tipo: "mensagem_recebida" | "mensagem_enviada_time", texto: string, extra: Partial<{ contactId: string; messageId: string }> = {}) =>
  ({
    tipo,
    workspaceId: "ws-1",
    contactId: extra.contactId ?? "contato-1",
    conversationId: "conv-1",
    messageId: extra.messageId ?? "msg-2",
    tipoMensagem: "texto",
    texto,
  }) as GatilhoAutomacao

/** A execução esperando no bloco, como o motor grava. */
function esperando(fluxo: Fluxo, opcoes: { gatilho?: GatilhoAutomacao; desdeHaDias?: number } = {}) {
  const desde = new Date(Date.now() - (opcoes.desdeHaDias ?? 0) * DIA).toISOString()
  const caminho: PassoGravado[] = [{ bloco: fluxo.blocos[0] }, { bloco: fluxo.blocos[1], desde }]
  return { id: "execucao-1", regra_id: "regra-1", contact_id: "contato-1", gatilho: opcoes.gatilho ?? eventoDoCard, caminho, created_at: desde }
}

/**
 * Banco falso. `regra`: o fluxo de `automation_flows` (para o motor e para seguir
 * a espera). `esperandoNoContato`: as execuções esperando que a busca por contato acha.
 * `vencidas`: o que o relógio reivindica.
 */
function montarBanco(opcoes: { regra: Fluxo; gatilhoDaRegra?: string; esperandoNoContato?: unknown[]; vencidas?: unknown[] }) {
  const inseridas: Array<Record<string, unknown>> = []
  const atualizacoes: Array<{ valores: Record<string, unknown>; filtros: unknown[][] }> = []
  const buscasPorContato: unknown[][][] = []
  const etiquetas: string[] = []
  let entregou = false
  const linhaDaRegra = { id: "regra-1", nome: "Esperar resposta", ativa: true, fluxo: opcoes.regra, created_at: "2026-10-01T10:00:00Z", repeticao: { modo: "sempre" } }

  const from = vi.fn((tabela: string) => {
    const filtros: unknown[][] = []
    let atualizando: Record<string, unknown> | null = null
    const obj: Record<string, unknown> = {}
    for (const m of ["select", "eq", "neq", "is", "not", "in", "contains", "gte", "order", "limit"]) {
      obj[m] = vi.fn((...args: unknown[]) => {
        filtros.push([m, ...args])
        return obj
      })
    }
    obj.update = vi.fn((valores: Record<string, unknown>) => {
      atualizando = valores
      atualizacoes.push({ valores, filtros })
      return obj
    })
    obj.insert = vi.fn((linha: Record<string, unknown>) => {
      inseridas.push(linha)
      return Promise.resolve({ error: null })
    })
    obj.upsert = vi.fn((linha: { label_id: string }) => {
      etiquetas.push(linha.label_id)
      return Promise.resolve({ error: null })
    })
    obj.maybeSingle = vi.fn(() =>
      // O contato tem uma conversa aberta, onde a etiqueta é aplicada
      Promise.resolve({ data: tabela === "automation_flows" ? linhaDaRegra : tabela === "conversations" ? { id: "conv-1" } : null, error: null })
    )
    obj.then = (resolve: (v: unknown) => void) => {
      let data: unknown = []
      if (tabela === "automation_flows") {
        const gatilho = filtros.find((f) => f[0] === "eq" && f[1] === "gatilho_tipo")?.[2]
        data = !opcoes.gatilhoDaRegra || gatilho === opcoes.gatilhoDaRegra ? [linhaDaRegra] : []
      } else if (tabela === "automation_runs" && atualizando) {
        // A reivindicação pela mensagem pega a execução livre
        data = filtros.some((f) => f[0] === "is" && f[1] === "retomada_em") ? [{ id: "execucao-1" }] : null
      } else if (tabela === "automation_runs" && filtros.some((f) => f[0] === "is" && f[1] === "retomada_em")) {
        buscasPorContato.push(filtros)
        const contato = filtros.find((f) => f[0] === "eq" && f[1] === "contact_id")?.[2]
        data = (opcoes.esperandoNoContato ?? []).filter((e) => (e as { contact_id: string }).contact_id === contato)
      }
      return Promise.resolve({ data, error: null }).then(resolve)
    }
    return obj
  })
  const rpc = vi.fn((nome: string) => {
    if (nome === "reivindicar_esperas_vencidas") {
      const data = entregou ? [] : (opcoes.vencidas ?? [])
      entregou = true
      return Promise.resolve({ data, error: null })
    }
    return Promise.resolve({ data: false, error: null })
  })
  vi.mocked(createServiceClient).mockReturnValue({ from, rpc } as unknown as ReturnType<typeof createServiceClient>)
  /** A atualização que encerra ou segue a execução (a que grava o caminho ou o resultado). */
  const final = () => atualizacoes.filter((a) => "resultado" in a.valores || "caminho" in a.valores).at(-1)?.valores
  return { inseridas, atualizacoes, buscasPorContato, etiquetas, final }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("B28-03 — a mensagem segue a espera", () => {
  it("CA-B28-09: a mensagem do contato segue pela saída 'Recebeu mensagem'; a de outro contato não muda nada; o tempo não roda mais", async () => {
    const fluxo = fluxoDeEspera(espera({ recebeuMensagem: true }))
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido", esperandoNoContato: [esperando(fluxo)] })

    // Mensagem de outro contato: a busca é pelo contato dela, e a espera do contato-1 fica
    await processarAutomacoes(mensagem("mensagem_recebida", "oi", { contactId: "contato-2" }))
    expect(banco.etiquetas).toEqual([])
    expect(banco.final()).toBeUndefined()

    await processarAutomacoes(mensagem("mensagem_recebida", "pode mandar"))
    expect(banco.etiquetas).toEqual(["etiqueta-recebeu"])
    const final = banco.final()!
    expect(final).toMatchObject({ resultado: "concluida", retomar_em: null, retomada_em: null })
    const caminho = final.caminho as PassoGravado[]
    expect(caminho.map((p) => [p.bloco.id, p.saida ?? null])).toEqual([
      ["g", null],
      ["e", "recebeu_mensagem"],
      ["recebeu", null],
    ])
    // Fora de "esperando", o relógio (que só reivindica as esperando) não a pega depois dos 2 dias
    expect(final.resultado).not.toBe("esperando")
  })

  it("CA-B28-10: a mensagem do time segue pela saída 'Atendente enviou'", async () => {
    const fluxo = fluxoDeEspera(espera({ tempo: null, atendenteEnviou: true }))
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido", esperandoNoContato: [esperando(fluxo)] })

    await processarAutomacoes(mensagem("mensagem_enviada_time", "Oi, tudo bem?"))

    expect(banco.etiquetas).toEqual(["etiqueta-atendente"])
    expect((banco.final()!.caminho as PassoGravado[])[1].saida).toBe("atendente_enviou")
  })

  it("CA-B28-10: a mensagem do contato não segue a espera que só espera o time", async () => {
    const fluxo = fluxoDeEspera(espera({ tempo: null, atendenteEnviou: true }))
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido", esperandoNoContato: [esperando(fluxo)] })

    await processarAutomacoes(mensagem("mensagem_recebida", "oi"))

    expect(banco.etiquetas).toEqual([])
    // A execução foi pega e devolvida, livre
    expect(banco.atualizacoes.at(-1)!.valores).toEqual({ retomada_em: null })
  })

  it("CA-B28-11: o envio das automações e o das campanhas não chamam o motor, e evento que não é de mensagem não procura espera", async () => {
    const raiz = path.resolve(__dirname, "..")
    for (const arquivo of ["lib/whatsapp-envio.ts", "lib/campanhas.ts", "lib/automacoes/envio.ts"]) {
      const fonte = readFileSync(path.join(raiz, arquivo), "utf8")
      expect(fonte, arquivo).not.toMatch(/dispararAutomacoes|processarAutomacoes|seguirEsperasPorMensagem|dispararMensagemEnviadaPeloTime/)
    }

    const fluxo = fluxoDeEspera(espera({ atendenteEnviou: true }))
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "nenhum", esperandoNoContato: [esperando(fluxo)] })
    await processarAutomacoes(eventoDoCard)
    expect(banco.buscasPorContato).toHaveLength(0)
    expect(banco.etiquetas).toEqual([])
  })

  it("CA-B28-12: a mensagem que dispara a regra deixa o contato esperando; só a seguinte faz seguir", async () => {
    const gatilhoMensagem = { id: "g", tipo: "gatilho" as const, gatilho: "mensagem_recebida" as const, parametros: {}, posicao }
    const fluxo = fluxoDeEspera(espera({ tempo: null, recebeuMensagem: true }), gatilhoMensagem)
    const primeira = mensagem("mensagem_recebida", "quero saber o preço", { messageId: "msg-1" })

    // A primeira mensagem: nenhuma espera ainda; a regra roda e fica esperando
    const inicio = montarBanco({ regra: fluxo, gatilhoDaRegra: "mensagem_recebida" })
    await processarAutomacoes(primeira)
    expect(inicio.inseridas[0]).toMatchObject({ resultado: "esperando" })
    expect(inicio.etiquetas).toEqual([])

    // A mesma mensagem de novo (reentrega) não segue a espera que ela começou
    const reentrega = montarBanco({ regra: fluxo, gatilhoDaRegra: "nenhum", esperandoNoContato: [esperando(fluxo, { gatilho: primeira })] })
    await processarAutomacoes(primeira)
    expect(reentrega.etiquetas).toEqual([])
    expect(reentrega.atualizacoes).toHaveLength(0)

    // A mensagem seguinte faz o caminho seguir
    const seguinte = montarBanco({ regra: fluxo, gatilhoDaRegra: "nenhum", esperandoNoContato: [esperando(fluxo, { gatilho: primeira })] })
    await processarAutomacoes(mensagem("mensagem_recebida", "e o frete?", { messageId: "msg-2" }))
    expect(seguinte.etiquetas).toEqual(["etiqueta-recebeu"])
  })

  it("CA-B28-13: num gatilho 'card movido', a condição 'texto contém sim' depois da espera olha a resposta", async () => {
    const fluxo: Fluxo = {
      blocos: [
        cardMovido,
        espera({ tempo: null, recebeuMensagem: true }),
        { id: "c", tipo: "condicao", verificacoes: [{ id: "v", tipo: "texto_mensagem", operador: "contem", valor: "sim" }], posicao },
        etiqueta("sim"),
        etiqueta("nao"),
      ],
      ligacoes: [
        { de: "g", saida: "proximo", para: "e" },
        { de: "e", saida: "recebeu_mensagem", para: "c" },
        { de: "c", saida: "sim", para: "sim" },
        { de: "c", saida: "nao", para: "nao" },
      ],
    }
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido", esperandoNoContato: [esperando(fluxo)] })

    await processarAutomacoes(mensagem("mensagem_recebida", "sim, pode mandar"))

    expect(banco.etiquetas).toEqual(["etiqueta-sim"])
    expect((banco.final()!.caminho as PassoGravado[]).find((p) => p.bloco.id === "c")?.saida).toBe("sim")
  })
})

describe("B28-03 — limite sem o tempo", () => {
  it("CA-B28-14: 30 dias sem nada, a espera termina sem seguir, e o histórico diz que expirou", async () => {
    const fluxo = fluxoDeEspera(espera({ tempo: null, recebeuMensagem: true, limite: "30_dias" }))
    const banco = montarBanco({ regra: fluxo, vencidas: [esperando(fluxo, { desdeHaDias: 30 })] })

    await seguirEsperasVencidas()

    expect(banco.etiquetas).toEqual([])
    expect(banco.final()).toMatchObject({ resultado: "concluida", motivo: ESPERA_EXPIROU, retomar_em: null })
    expect(ESPERA_EXPIROU).toBe("A espera expirou depois de 30 dias")
  })

  it("CA-B28-15: sem limite, a espera nasce sem hora para o relógio, e há 31 dias continua esperando", async () => {
    const fluxo = fluxoDeEspera(espera({ tempo: null, recebeuMensagem: true, limite: "sem_limite" }))

    const inicio = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido" })
    await processarAutomacoes(eventoDoCard)
    expect(inicio.inseridas[0]).toMatchObject({ resultado: "esperando", retomar_em: null })

    // Mesmo entregue pelo relógio, há 31 dias, ela não expira: volta a esperar, sem hora
    const relogio = montarBanco({ regra: fluxo, vencidas: [esperando(fluxo, { desdeHaDias: 31 })] })
    await seguirEsperasVencidas()
    expect(relogio.final()).toBeUndefined()
    expect(relogio.atualizacoes.at(-1)!.valores).toMatchObject({ retomar_em: null, retomada_em: null })
    expect(relogio.etiquetas).toEqual([])
  })

  it("com o teto, a espera nasce com a hora do relógio 30 dias depois", async () => {
    const fluxo = fluxoDeEspera(espera({ tempo: null, recebeuMensagem: true, limite: "30_dias" }))
    const banco = montarBanco({ regra: fluxo, gatilhoDaRegra: "card_movido" })
    await processarAutomacoes(eventoDoCard)
    const linha = banco.inseridas[0]
    const desde = new Date((linha.caminho as PassoGravado[])[1].desde!).getTime()
    expect(new Date(linha.retomar_em as string).getTime() - desde).toBe(30 * DIA)
  })
})
