// Número de origem em todo envio (B7-01). Banco mockado: o que se mede é qual
// conexão a resolução escolhe, e o degrau de queda quando não há uma.

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  resolverProvider,
  resolverProviderDaConversa,
  resolverProviderDoContato,
} from "@/lib/whatsapp"
import type { ClienteSupabase } from "@/lib/whatsapp"

const DA_META = {
  canal: "meta",
  phone_number_id: "1167696503100575",
  access_token: "token-meta",
  instance_id: null,
  instance_token: null,
}

const DO_GATEWAY = {
  canal: "gateway",
  phone_number_id: null,
  access_token: null,
  instance_id: "inst_01HZX8P7A3",
  instance_token: "token-da-instancia",
}

/**
 * Supabase falso com duas tabelas: a conversa (com a conexão embutida, como o
 * select com join devolve) e a conexão conectada do workspace.
 */
function bancoFalso({
  conversa = null as Record<string, unknown> | null,
  doWorkspace = null as Record<string, unknown> | null,
} = {}) {
  const tabelasLidas: string[] = []

  const encadeado = (dado: Record<string, unknown> | null) => {
    const elo: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "in", "order", "limit"]) {
      elo[metodo] = () => elo
    }
    elo.maybeSingle = async () => ({ data: dado, error: null })
    return elo
  }

  return {
    tabelasLidas,
    banco: {
      from(tabela: string) {
        tabelasLidas.push(tabela)
        return encadeado(tabela === "conversations" ? conversa : doWorkspace)
      },
    } as unknown as ClienteSupabase,
  }
}

beforeEach(() => {
  vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
  vi.stubEnv("GATEWAY_SERVICE_KEY", "chave-de-servico")
})

describe("resolução pela conversa", () => {
  it("usa o número da conversa, e não o primeiro do workspace", async () => {
    // A conversa é do gateway; o workspace tem a Meta como primeira conexão.
    const { banco } = bancoFalso({
      conversa: { whatsapp_connection_id: "c2", conexao: DO_GATEWAY },
      doWorkspace: DA_META,
    })

    const provider = await resolverProviderDaConversa(banco, "conv_1", "ws_1")

    expect(provider?.canal).toBe("gateway")
  })

  it("conversa da Meta continua na Meta, com o gateway conectado no mesmo workspace", async () => {
    const { banco } = bancoFalso({
      conversa: { whatsapp_connection_id: "c1", conexao: DA_META },
      doWorkspace: DO_GATEWAY,
    })

    expect((await resolverProviderDaConversa(banco, "conv_1", "ws_1"))?.canal).toBe("meta")
  })

  it("conversa antiga sem número gravado cai no número do workspace", async () => {
    const { banco } = bancoFalso({
      conversa: { whatsapp_connection_id: null, conexao: null },
      doWorkspace: DA_META,
    })

    expect((await resolverProviderDaConversa(banco, "conv_1", "ws_1"))?.canal).toBe("meta")
  })

  it("conexão gravada mas incompleta cai no número do workspace, em vez de virar erro", async () => {
    const { banco } = bancoFalso({
      // Conexão do gateway sem token: não dá para enviar por ela.
      conversa: { whatsapp_connection_id: "c2", conexao: { ...DO_GATEWAY, instance_token: null } },
      doWorkspace: DA_META,
    })

    expect((await resolverProviderDaConversa(banco, "conv_1", "ws_1"))?.canal).toBe("meta")
  })

  it("sem conversa e sem número no workspace, devolve null — o chamador trata como sempre", async () => {
    const { banco } = bancoFalso()

    expect(await resolverProviderDaConversa(banco, "conv_1", "ws_1")).toBeNull()
  })
})

describe("resolução pelo contato", () => {
  it("usa o número da conversa aberta do contato", async () => {
    const { banco } = bancoFalso({
      conversa: { whatsapp_connection_id: "c2", conexao: DO_GATEWAY },
      doWorkspace: DA_META,
    })

    const provider = await resolverProviderDoContato(banco, "ws_1", "contato_1")

    expect(provider?.canal).toBe("gateway")
  })

  it("contato sem conversa aberta cai no número do workspace: a conversa vai nascer agora", async () => {
    const { banco } = bancoFalso({ conversa: null, doWorkspace: DO_GATEWAY })

    expect((await resolverProviderDoContato(banco, "ws_1", "contato_1"))?.canal).toBe("gateway")
  })
})

describe("resolução pelo workspace continua igual", () => {
  it("devolve o provider da conexão conectada", async () => {
    const { banco } = bancoFalso({ doWorkspace: DA_META })

    expect((await resolverProvider(banco, "ws_1"))?.canal).toBe("meta")
  })

  it("workspace sem conexão devolve null", async () => {
    expect(await resolverProvider(bancoFalso().banco, "ws_1")).toBeNull()
  })

  it("lê whatsapp_connections, e não conversations: quem só tem workspace não paga join", async () => {
    const { banco, tabelasLidas } = bancoFalso({ doWorkspace: DA_META })

    await resolverProvider(banco, "ws_1")

    expect(tabelasLidas).toEqual(["whatsapp_connections"])
  })
})
