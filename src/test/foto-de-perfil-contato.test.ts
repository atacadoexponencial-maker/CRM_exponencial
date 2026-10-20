// @vitest-environment node
// B29-02 — a busca e a guarda da foto de perfil do contato. O banco, o storage e o
// gateway são falsos: o teste confere o que foi pedido ao gateway e o que foi gravado.

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirContatoFoto: vi.fn().mockResolvedValue(undefined) }))

import { transmitirContatoFoto } from "@/lib/whatsapp/realtime"
import { buscarEGuardarFotoDoContato, caminhoDaFoto, BUCKET_FOTOS } from "@/lib/whatsapp/foto-de-perfil"
import type { createServiceClient } from "@/integrations/supabase/service"

const WS = "ws-1"
const CONTATO = "contato-1"
const FOTO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer
const BASE = "https://gateway.teste/v1"

type Conexao = { id: string; canal: string; status: string; instance_id: string | null; instance_token: string | null; created_at: string }

const GATEWAY: Conexao = { id: "cx-gw", canal: "gateway", status: "connected", instance_id: "inst_1", instance_token: "tok-1", created_at: "2026-10-01" }
const META: Conexao = { id: "cx-meta", canal: "meta", status: "connected", instance_id: null, instance_token: null, created_at: "2026-09-01" }

/** Banco falso: devolve as conexões que passam no filtro e registra os updates. */
function bancoFalso({ conexoes = [GATEWAY], checkedAt = null as string | null, uploadFalha = false } = {}) {
  const updates: Array<Record<string, unknown>> = []
  const uploads: Array<{ bucket: string; caminho: string; tamanho: number; opcoes: unknown }> = []
  const filtros: Record<string, unknown> = {}

  const svc = {
    from: vi.fn((tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "order", "limit"]) obj[m] = vi.fn(() => obj)
      obj.eq = vi.fn((col: string, val: unknown) => { filtros[col] = val; return obj })
      obj.not = vi.fn((col: string) => { filtros[`${col}!=null`] = true; return obj })
      obj.maybeSingle = vi.fn(async () => (tabela === "contacts" ? { data: { photo_checked_at: checkedAt } } : { data: null }))
      obj.update = vi.fn((linha: Record<string, unknown>) => {
        updates.push(linha)
        return { eq: vi.fn(async () => ({ error: null })) }
      })
      // A consulta de conexões é aguardada depois do limit: filtra como o banco filtraria.
      obj.then = (r: (v: unknown) => void) => {
        const data = tabela === "whatsapp_connections"
          ? conexoes.filter((c) => c.canal === "gateway" && c.status === "connected" && c.instance_id && c.instance_token)
          : []
        return Promise.resolve({ data }).then(r)
      }
      return obj
    }),
    storage: {
      from: vi.fn((bucket: string) => ({
        upload: vi.fn(async (caminho: string, corpo: ArrayBuffer, opcoes: unknown) => {
          uploads.push({ bucket, caminho, tamanho: corpo.byteLength, opcoes })
          return { error: uploadFalha ? { message: "storage fora" } : null }
        }),
        createSignedUrl: vi.fn(async (caminho: string) => ({ data: { signedUrl: `https://assinada/${caminho}?token=x` } })),
      })),
    },
  }
  return { svc: svc as unknown as ReturnType<typeof createServiceClient>, updates, uploads, filtros }
}

/** Gateway falso: registra o que foi pedido e responde como mandado. */
function gatewayFalso(resposta: () => Response | Promise<Response>) {
  const pedidos: Array<{ url: string; token: string | undefined }> = []
  const buscar = (async (entrada: string | URL | Request, init?: RequestInit) => {
    pedidos.push({ url: String(entrada), token: (init?.headers as Record<string, string> | undefined)?.["X-Instance-Token"] })
    return resposta()
  }) as unknown as typeof fetch
  return { buscar, pedidos }
}

const comFoto = () => new Response(FOTO, { status: 200, headers: { "content-type": "image/jpeg" } })
const semFoto = () => new Response(null, { status: 204 })

beforeEach(() => vi.mocked(transmitirContatoFoto).mockClear())

describe("B29-02 — busca e guarda da foto de perfil", () => {
  it("CA-B29-05: pede a foto ao número do canal direto da mensagem, guarda a cópia e aponta o contato para ela", async () => {
    const b = bancoFalso()
    const g = gatewayFalso(comFoto)

    const r = await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", connectionId: "cx-gw", buscar: g.buscar, baseUrl: BASE })

    expect(r).toBe("guardada")
    expect(g.pedidos).toEqual([{ url: `${BASE}/instances/inst_1/contacts/5511999998888/photo`, token: "tok-1" }])
    expect(b.uploads).toEqual([{ bucket: BUCKET_FOTOS, caminho: caminhoDaFoto(WS, CONTATO), tamanho: 4, opcoes: { contentType: "image/jpeg", upsert: true } }])
    expect(b.updates).toEqual([{ photo_path: `${WS}/${CONTATO}.jpg`, photo_checked_at: expect.any(String) }])
    // O chat aberto fica sabendo, com um endereço assinado.
    expect(transmitirContatoFoto).toHaveBeenCalledWith(WS, CONTATO, expect.stringContaining("https://assinada/"))
  })

  it("CA-B29-06: contato que chegou pela Meta ganha a foto pelo número do canal direto da empresa", async () => {
    const b = bancoFalso({ conexoes: [META, GATEWAY] })
    const g = gatewayFalso(comFoto)

    const r = await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", connectionId: "cx-meta", buscar: g.buscar, baseUrl: BASE })

    expect(r).toBe("guardada")
    expect(g.pedidos[0]?.url).toContain("/instances/inst_1/")
    expect(b.filtros).toMatchObject({ workspace_id: WS, canal: "gateway", status: "connected" })
  })

  it("CA-B29-08: sem foto visível, anota a conferência sem caminho; contato já conferido não vai ao gateway", async () => {
    const b = bancoFalso()
    const g = gatewayFalso(semFoto)

    expect(await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", buscar: g.buscar, baseUrl: BASE })).toBe("sem_foto")
    expect(b.uploads).toEqual([])
    expect(b.updates).toEqual([{ photo_path: null, photo_checked_at: expect.any(String) }])
    expect(transmitirContatoFoto).not.toHaveBeenCalled()

    // A segunda mensagem do mesmo contato: já conferido, nenhuma consulta.
    const b2 = bancoFalso({ checkedAt: "2026-10-20T10:00:00Z" })
    const g2 = gatewayFalso(comFoto)
    expect(await buscarEGuardarFotoDoContato({ svc: b2.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", buscar: g2.buscar, baseUrl: BASE })).toBe("ja_conferida")
    expect(g2.pedidos).toEqual([])
    expect(b2.updates).toEqual([])
  })

  it("CA-B29-09: empresa sem número do canal direto conectado não chama o gateway nem grava nada", async () => {
    const desconectado = { ...GATEWAY, status: "disconnected" }
    for (const conexoes of [[], [META], [desconectado]]) {
      const b = bancoFalso({ conexoes })
      const g = gatewayFalso(comFoto)
      expect(await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", buscar: g.buscar, baseUrl: BASE })).toBe("sem_canal")
      expect(g.pedidos).toEqual([])
      expect(b.updates).toEqual([])
      expect(b.uploads).toEqual([])
    }
  })

  it("CA-B29-10: gateway com erro, sem resposta ou upload que falha: nada é marcado, e a próxima chamada tenta de novo", async () => {
    const casos: Array<{ nome: string; banco: ReturnType<typeof bancoFalso>; gateway: ReturnType<typeof gatewayFalso> }> = [
      { nome: "erro 500", banco: bancoFalso(), gateway: gatewayFalso(() => new Response("x", { status: 500 })) },
      { nome: "rede caiu", banco: bancoFalso(), gateway: gatewayFalso(() => { throw new TypeError("fetch failed") }) },
      { nome: "upload falhou", banco: bancoFalso({ uploadFalha: true }), gateway: gatewayFalso(comFoto) },
    ]
    for (const c of casos) {
      const r = await buscarEGuardarFotoDoContato({ svc: c.banco.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", buscar: c.gateway.buscar, baseUrl: BASE })
      expect(r, c.nome).toBe("falhou")
      expect(c.banco.updates, c.nome).toEqual([])
      expect(transmitirContatoFoto).not.toHaveBeenCalled()
    }

    // Tenta de novo: o contato continua sem `photo_checked_at`, então consulta outra vez.
    const b = bancoFalso()
    const g = gatewayFalso(comFoto)
    expect(await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "5511999998888", buscar: g.buscar, baseUrl: BASE })).toBe("guardada")
    expect(g.pedidos).toHaveLength(1)
  })

  it("identificador que não é telefone (LID) não vai ao gateway nem é marcado", async () => {
    const b = bancoFalso()
    const g = gatewayFalso(comFoto)
    expect(await buscarEGuardarFotoDoContato({ svc: b.svc, workspaceId: WS, contactId: CONTATO, telefone: "lid:123456789012345", buscar: g.buscar, baseUrl: BASE })).toBe("sem_telefone")
    expect(g.pedidos).toEqual([])
    expect(b.updates).toEqual([])
  })
})
