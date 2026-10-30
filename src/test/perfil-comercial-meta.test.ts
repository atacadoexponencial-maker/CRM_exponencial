// Perfil comercial do número da API Oficial (30/10/2026): leitura, gravação e
// troca de foto na Graph API, com `fetch` simulado.

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  esquemaPerfilComercial,
  lerPerfilComercial,
  montarAlteracoes,
  salvarPerfilComercial,
  type PerfilComercial,
  trocarFotoDoPerfil,
} from "@/lib/whatsapp/perfil-comercial-meta"

const cred = { phoneNumberId: "123", accessToken: "tok" }
const vazio: PerfilComercial = { about: "", description: "", address: "", email: "", websites: [], vertical: "UNDEFINED", fotoUrl: null }

function responde(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } })
}

afterEach(() => vi.unstubAllGlobals())

describe("perfil comercial da Meta", () => {
  it("lê o perfil e mapeia os campos; o que faltar vira vazio", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      responde({ data: [{ about: "Oi", websites: ["https://a.com"], vertical: "RETAIL", profile_picture_url: "https://f.jpg" }] })
    )
    vi.stubGlobal("fetch", fetchMock)

    const r = await lerPerfilComercial(cred)
    expect(r).toEqual({
      perfil: { about: "Oi", description: "", address: "", email: "", websites: ["https://a.com"], vertical: "RETAIL", fotoUrl: "https://f.jpg" },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain("/123/whatsapp_business_profile?fields=")
    expect(init.headers.Authorization).toBe("Bearer tok")
  })

  it("categoria desconhecida vira 'Sem categoria'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responde({ data: [{ vertical: "XPTO" }] })))
    const r = await lerPerfilComercial(cred)
    expect("perfil" in r && r.perfil.vertical).toBe("UNDEFINED")
  })

  it("erro da Meta volta com a mensagem dela", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responde({ error: { message: "Invalid OAuth" } }, 400)))
    expect(await lerPerfilComercial(cred)).toEqual({ erro: "Invalid OAuth" })
  })

  it("salvar manda só o que tem valor, com messaging_product whatsapp (131000 em 30/10)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responde({ success: true }))
    vi.stubGlobal("fetch", fetchMock)

    const dados = esquemaPerfilComercial.parse({
      about: " Oi ", description: "", address: "Rua 1", email: "", websites: ["https://a.com", ""], vertical: "RETAIL",
    })
    expect(await salvarPerfilComercial(cred, vazio, dados)).toEqual({})

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://graph.facebook.com/v21.0/123/whatsapp_business_profile")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: "whatsapp",
      about: "Oi",
      address: "Rua 1",
      websites: ["https://a.com"],
      vertical: "RETAIL",
    })
  })

  it("campo que tinha valor e foi apagado vai vazio, para limpar", () => {
    const atual: PerfilComercial = { ...vazio, email: "a@b.com", websites: ["https://a.com"], vertical: "RETAIL" }
    const dados = esquemaPerfilComercial.parse({ ...vazio, vertical: "UNDEFINED" })
    expect(montarAlteracoes(atual, dados)).toEqual({ messaging_product: "whatsapp", email: "", websites: [], vertical: "UNDEFINED" })
  })

  it("sem nada para mandar, não chama a Meta", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const dados = esquemaPerfilComercial.parse({ ...vazio })
    expect(await salvarPerfilComercial(cred, vazio, dados)).toEqual({})
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("a foto faz os três passos: sessão no app, bytes com o OAuth e handle no perfil", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responde({ id: "upload:abc" }))
      .mockResolvedValueOnce(responde({ h: "handle-1" }))
      .mockResolvedValueOnce(responde({ success: true }))
    vi.stubGlobal("fetch", fetchMock)

    const bytes = new Uint8Array([1, 2, 3]).buffer
    expect(await trocarFotoDoPerfil(cred, "APP", { bytes, tipo: "image/png" })).toEqual({})

    const [u1, i1] = fetchMock.mock.calls[0]
    expect(u1).toBe("https://graph.facebook.com/v21.0/APP/uploads?file_length=3&file_type=image%2Fpng")
    expect(i1.method).toBe("POST")

    const [u2, i2] = fetchMock.mock.calls[1]
    expect(u2).toBe("https://graph.facebook.com/v21.0/upload:abc")
    expect(i2.headers.Authorization).toBe("OAuth tok")
    expect(i2.headers.file_offset).toBe("0")
    expect(i2.body).toBe(bytes)

    const [u3, i3] = fetchMock.mock.calls[2]
    expect(u3).toBe("https://graph.facebook.com/v21.0/123/whatsapp_business_profile")
    expect(JSON.parse(i3.body)).toEqual({ messaging_product: "whatsapp", profile_picture_handle: "handle-1" })
  })

  it("se a sessão de upload falha, para ali", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(responde({ error: { message: "nope" } }, 400))
    vi.stubGlobal("fetch", fetchMock)
    expect(await trocarFotoDoPerfil(cred, "APP", { bytes: new ArrayBuffer(1), tipo: "image/jpeg" })).toEqual({ erro: "nope" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("validação do perfil comercial (servidor)", () => {
  const base = { about: "", description: "", address: "", email: "", websites: [], vertical: "UNDEFINED" }

  it("recado acima de 139 caracteres é recusado", () => {
    const r = esquemaPerfilComercial.safeParse({ ...base, about: "a".repeat(140) })
    expect(r.success).toBe(false)
    expect(!r.success && r.error.issues[0].message).toBe("O recado passa de 139 caracteres.")
  })

  it("e-mail inválido é recusado; vazio é aceito", () => {
    expect(esquemaPerfilComercial.safeParse({ ...base, email: "nao-eh" }).success).toBe(false)
    expect(esquemaPerfilComercial.safeParse({ ...base, email: "" }).success).toBe(true)
  })

  it("site sem https:// é recusado; o terceiro site também", () => {
    expect(esquemaPerfilComercial.safeParse({ ...base, websites: ["meusite.com"] }).success).toBe(false)
    expect(esquemaPerfilComercial.safeParse({ ...base, websites: ["https://a.com", "https://b.com", "https://c.com"] }).success).toBe(false)
  })

  it("categoria fora da lista da Meta é recusada", () => {
    expect(esquemaPerfilComercial.safeParse({ ...base, vertical: "PADARIA" }).success).toBe(false)
  })
})
