// B22-23 — mensagem recebida pela API Oficial com o texto de cada tipo (achado M3
// do QA das automações, 09/10/2026): resposta de botão, de lista e cartão de
// contato chegavam vazios e como "desconhecido".

import { describe, expect, it } from "vitest"
import { lerMensagemMeta } from "@/lib/whatsapp/mensagem-meta"

describe("B22-23 — o que a mensagem da Meta diz", () => {
  it("texto", () => {
    expect(lerMensagemMeta({ type: "text", text: { body: "oi" } })).toEqual({ conteudo: "oi", tipo: "texto", textoDoCliente: "oi" })
  })

  it("resposta a botão de modelo", () => {
    expect(lerMensagemMeta({ type: "button", button: { text: "Quero o catálogo" } })).toEqual({
      conteudo: "Quero o catálogo",
      tipo: "texto",
      textoDoCliente: "Quero o catálogo",
    })
  })

  it("resposta a botão interativo", () => {
    const lida = lerMensagemMeta({ type: "interactive", interactive: { type: "button_reply", button_reply: { title: "Sim" } } })
    expect(lida).toEqual({ conteudo: "Sim", tipo: "texto", textoDoCliente: "Sim" })
  })

  it("resposta a lista", () => {
    const lida = lerMensagemMeta({
      type: "interactive",
      interactive: { type: "list_reply", list_reply: { title: "Atacado", description: "Pedido acima de 50 peças" } },
    })
    expect(lida).toEqual({ conteudo: "Atacado", tipo: "texto", textoDoCliente: "Atacado" })
  })

  it("cartão de contato: o CRM monta o texto, e as regras não leem texto nele", () => {
    const lida = lerMensagemMeta({
      type: "contacts",
      contacts: [{ name: { formatted_name: "Maria Lima" }, phones: [{ phone: "+55 11 99999-0000" }] }],
    })
    expect(lida).toEqual({ conteudo: "👤 Maria Lima\n+55 11 99999-0000", tipo: "contato", textoDoCliente: "" })
  })

  it("localização", () => {
    const lida = lerMensagemMeta({ type: "location", location: { latitude: -23.5, longitude: -46.6, name: "Loja" } })
    expect(lida.tipo).toBe("localizacao")
    expect(lida.conteudo).toBe("📍 Loja\nhttps://www.google.com/maps?q=-23.5,-46.6")
    expect(lida.textoDoCliente).toBe("")
  })

  it("foto com legenda: a legenda é o texto", () => {
    expect(lerMensagemMeta({ type: "image", image: { caption: "esse modelo" } })).toEqual({
      conteudo: "esse modelo",
      tipo: "imagem",
      textoDoCliente: "esse modelo",
    })
  })

  it("tipo que o CRM não conhece continua 'desconhecido'", () => {
    expect(lerMensagemMeta({ type: "order" }).tipo).toBe("desconhecido")
  })
})
