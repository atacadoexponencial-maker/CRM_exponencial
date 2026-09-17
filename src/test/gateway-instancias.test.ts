// Criação e listagem de conexões do canal direto (B2-02).
// Gateway e banco falsos: sem rede e sem escrita no Supabase.

import { describe, expect, it } from "vitest"
import { GatewayIndisponivel, GatewayRecusou, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import {
  criarConexaoDoGateway,
  listarConexoes,
  type BancoDeConexoes,
} from "@/lib/whatsapp/gateway/instancias"

const WORKSPACE = "ws_abc"
const WEBHOOK = "https://crm-exponencial.vercel.app/api/webhooks/gateway"

const CRIADA = {
  instance_id: "inst_01HZX8P7A3",
  instance_token: "token-secreto-da-instancia",
  state: "pairing",
}

function gatewayFalso(resposta: unknown = CRIADA) {
  const chamadas: Array<{ caminho: string; corpo?: unknown }> = []
  const cliente: ClienteGateway = {
    async comServico(pedido) {
      chamadas.push(pedido)
      if (resposta instanceof Error) throw resposta
      return resposta as never
    },
    async comInstancia() {
      throw new Error("Criar instância usa a credencial de serviço.")
    },
  }
  return { cliente, chamadas }
}

function bancoFalso({
  linhas = [] as Array<Record<string, unknown>>,
  erroNoInsert = false,
} = {}) {
  const inseridas: Array<Record<string, unknown>> = []
  const colunasLidas: string[] = []

  const banco = {
    from() {
      return {
        select(colunas: string) {
          colunasLidas.push(colunas)
          return {
            eq() {
              return {
                order: async () => ({ data: linhas, error: null }),
              }
            },
          }
        },
        async insert(linha: Record<string, unknown>) {
          if (erroNoInsert) return { error: { message: "violação de constraint" } }
          inseridas.push(linha)
          return { error: null }
        },
      }
    },
  } as unknown as BancoDeConexoes

  return { banco, inseridas, colunasLidas }
}

describe("criar conexão pelo canal direto", () => {
  it("cria a instância no gateway e grava id, token e estado", async () => {
    const gateway = gatewayFalso()
    const { banco, inseridas } = bancoFalso()

    const resultado = await criarConexaoDoGateway({
      cliente: gateway.cliente,
      supabase: banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(resultado).toEqual({ ok: true, instanceId: CRIADA.instance_id })
    expect(gateway.chamadas[0]).toEqual({
      caminho: "/instances",
      metodo: "POST",
      corpo: { workspace_id: WORKSPACE, webhook_url: WEBHOOK },
    })
    expect(inseridas[0]).toEqual({
      workspace_id: WORKSPACE,
      canal: "gateway",
      instance_id: CRIADA.instance_id,
      instance_token: CRIADA.instance_token,
      status: "pairing",
    })
  })

  it("não grava número nem nome: os dois só existem depois de conectar", async () => {
    const { banco, inseridas } = bancoFalso()

    await criarConexaoDoGateway({
      cliente: gatewayFalso().cliente,
      supabase: banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(inseridas[0]).not.toHaveProperty("phone_number")
    expect(inseridas[0]).not.toHaveProperty("display_name")
  })

  it("limite do workspace tem mensagem própria, não a genérica do gateway", async () => {
    const gateway = gatewayFalso(
      new GatewayRecusou("workspace_instance_limit_reached", "Limite atingido.", 409)
    )
    const { banco, inseridas } = bancoFalso()

    const resultado = await criarConexaoDoGateway({
      cliente: gateway.cliente,
      supabase: banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(resultado).toEqual({
      ok: false,
      erro: "Este workspace já atingiu o limite de números conectados pelo canal direto.",
    })
    expect(inseridas).toEqual([])
  })

  it("recusa sem mensagem própria repassa a do gateway, que é legível", async () => {
    const gateway = gatewayFalso(new GatewayRecusou("invalid_payload", "Corpo malformado.", 400))

    const resultado = await criarConexaoDoGateway({
      cliente: gateway.cliente,
      supabase: bancoFalso().banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(resultado).toEqual({ ok: false, erro: "Corpo malformado." })
  })

  it("gateway fora do ar: nada é gravado e o admin sabe que nada foi conectado", async () => {
    const gateway = gatewayFalso(new GatewayIndisponivel("O gateway não respondeu."))
    const { banco, inseridas } = bancoFalso()

    const resultado = await criarConexaoDoGateway({
      cliente: gateway.cliente,
      supabase: banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(resultado.ok).toBe(false)
    expect(inseridas).toEqual([])
    if (!resultado.ok) expect(resultado.erro).toMatch(/Nenhum número foi conectado/)
  })

  it("gravação que falha é reportada como falha: o token é irrecuperável", async () => {
    const resultado = await criarConexaoDoGateway({
      cliente: gatewayFalso().cliente,
      supabase: bancoFalso({ erroNoInsert: true }).banco,
      workspaceId: WORKSPACE,
      webhookUrl: WEBHOOK,
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.erro).toMatch(/criada no gateway/)
  })
})

describe("listar conexões do workspace", () => {
  it("devolve todas, com o canal de cada uma", async () => {
    const { banco } = bancoFalso({
      linhas: [
        {
          id: "c1",
          canal: "meta",
          phone_number: "5511999998888",
          display_name: "Oficial",
          status: "connected",
          state_reason: null,
        },
        {
          id: "c2",
          canal: "gateway",
          phone_number: null,
          display_name: null,
          status: "pairing",
          state_reason: null,
        },
      ],
    })

    const conexoes = await listarConexoes(banco, WORKSPACE)

    expect(conexoes).toHaveLength(2)
    expect(conexoes.map((c) => c.canal)).toEqual(["meta", "gateway"])
    expect(conexoes[1]).toEqual({
      id: "c2",
      canal: "gateway",
      phoneNumber: null,
      displayName: null,
      status: "pairing",
      stateReason: null,
    })
  })

  it("conexão anterior à B1-02, sem canal preenchido, é da Meta", async () => {
    const { banco } = bancoFalso({
      linhas: [
        {
          id: "c1",
          canal: null,
          phone_number: "5511999998888",
          display_name: "Antiga",
          status: "connected",
          state_reason: null,
        },
      ],
    })

    expect((await listarConexoes(banco, WORKSPACE))[0].canal).toBe("meta")
  })

  it("nunca seleciona as colunas de credencial", async () => {
    const { banco, colunasLidas } = bancoFalso()

    await listarConexoes(banco, WORKSPACE)

    expect(colunasLidas[0]).not.toContain("instance_token")
    expect(colunasLidas[0]).not.toContain("access_token")
  })

  it("workspace sem conexão devolve lista vazia, não erro", async () => {
    expect(await listarConexoes(bancoFalso().banco, WORKSPACE)).toEqual([])
  })
})
