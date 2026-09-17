// Canal visível e recurso indisponível (B7-02).
//
// O que se mede aqui é a fonte única: os recursos que a interface exibe saem do
// mesmo mapa que o provider usa em `suporta()`. Se os dois divergirem, a tela
// passa a oferecer o que o canal recusa.

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  motivoDoRecursoIndisponivel,
  nomeDoCanal,
  providerDaConexao,
  recursosDoCanal,
} from "@/lib/whatsapp"

const DA_META = {
  canal: "meta" as const,
  phone_number_id: "1167696503100575",
  access_token: "token-meta",
  instance_id: null,
  instance_token: null,
}

const DO_GATEWAY = {
  canal: "gateway" as const,
  phone_number_id: null,
  access_token: null,
  instance_id: "inst_1",
  instance_token: "token-instancia",
}

beforeEach(() => {
  vi.stubEnv("GATEWAY_BASE_URL", "https://gateway.exemplo.com/v1")
  vi.stubEnv("GATEWAY_SERVICE_KEY", "chave-de-servico")
})

describe("recursos por canal", () => {
  it("API Oficial tem templates; canal direto não", () => {
    expect(recursosDoCanal("meta").templates).toBe(true)
    expect(recursosDoCanal("gateway").templates).toBe(false)
  })

  it("os dois canais enviam mídia e confirmam leitura", () => {
    for (const canal of ["meta", "gateway"] as const) {
      expect(recursosDoCanal(canal).midia).toBe(true)
      expect(recursosDoCanal(canal).marcar_lida).toBe(true)
    }
  })

  it("canal nulo é da Meta: é o default da coluna", () => {
    expect(recursosDoCanal(null)).toEqual(recursosDoCanal("meta"))
  })

  it("o que a interface exibe é o que o provider responde em suporta()", () => {
    for (const conexao of [DA_META, DO_GATEWAY]) {
      const provider = providerDaConexao(conexao)!
      const recursos = recursosDoCanal(conexao.canal)

      for (const recurso of ["templates", "midia", "marcar_lida"] as const) {
        expect(provider.suporta(recurso)).toBe(recursos[recurso])
      }
    }
  })

  it("alterar o mapa exportado não afeta quem já leu: a cópia é defensiva", () => {
    const recursos = recursosDoCanal("meta")
    recursos.templates = false

    expect(recursosDoCanal("meta").templates).toBe(true)
  })
})

describe("nome do canal", () => {
  it("tem nome que o atendente entende, não o valor da coluna", () => {
    expect(nomeDoCanal("meta")).toBe("API Oficial")
    expect(nomeDoCanal("gateway")).toBe("Canal direto")
    expect(nomeDoCanal(null)).toBe("API Oficial")
  })
})

describe("motivo do recurso indisponível", () => {
  it("recurso disponível não tem motivo", () => {
    expect(motivoDoRecursoIndisponivel("templates", "meta")).toBeNull()
    expect(motivoDoRecursoIndisponivel("midia", "gateway")).toBeNull()
  })

  it("templates no canal direto: diz qual recurso, por quê, e o que fazer", () => {
    const motivo = motivoDoRecursoIndisponivel("templates", "gateway")!

    expect(motivo).toContain("Templates")
    expect(motivo).toContain("API Oficial")
    expect(motivo).toContain("Canal direto")
    // Nada de erro técnico na tela.
    expect(motivo).not.toMatch(/error|null|undefined|500/i)
  })
})
