// B24-01 — Landing pública do crmatacado exp em "/".
// A página é de servidor e estática: renderizamos o HTML e conferimos o que o
// visitante (e o analista da Meta) vê. A sanfona é testada com cliques.
import { readFileSync, statSync } from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { fireEvent, render } from "@testing-library/react"
import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("a raiz não pode redirecionar")
  }),
}))

import Home, { metadata } from "@/app/page"
import { Perguntas } from "@/app/_landing/perguntas"
import { middleware } from "@/middleware"
import { ABERTURA, CONEXAO, DOR, EMPRESA, LINK_DEMONSTRACAO, MODULOS, PARA_QUEM, PERGUNTAS, PRINTS, SEUS_DADOS, TITULO_ABA, VIRADA, WHATSAPP_DEMONSTRACAO } from "@/app/_landing/conteudo"

const HTML = renderToStaticMarkup(<Home />)
const TEXTO = HTML.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ")

function links(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => {
    const atributos = m[1]
    const href = /href="([^"]*)"/.exec(atributos)?.[1] ?? ""
    const texto = m[2].replace(/<[^>]+>/g, "").trim()
    return { href, texto, atributos }
  })
}

describe("B24-01 — landing pública", () => {
  it("CA-B24-01 — a raiz mostra a landing sem pedir login: o porteiro deixa '/' passar e a página não redireciona", async () => {
    const resposta = await middleware(new NextRequest("https://crm.exemplo/"))
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("location")).toBeNull()

    expect(TEXTO).toContain(ABERTURA.titulo)
  })

  it("CA-B24-02 — logado, a raiz também mostra a landing (o porteiro não olha a sessão em '/')", async () => {
    const pedido = new NextRequest("https://crm.exemplo/", { headers: { cookie: "sb-abc-auth-token=base64-qualquer" } })
    const resposta = await middleware(pedido)
    expect(resposta.status).toBe(200)
    expect(resposta.headers.get("location")).toBeNull()
    // a página em si não depende de sessão: renderiza igual
    expect(TEXTO).toContain(ABERTURA.titulo)
  })

  it("CA-B24-03 — Entrar leva ao login, no cabeçalho e no rodapé", () => {
    const entrar = links(HTML).filter((l) => l.texto === "Entrar")
    expect(entrar.length).toBeGreaterThanOrEqual(2)
    for (const l of entrar) expect(l.href).toBe("/login")
    expect(HTML).toMatch(/<header[\s\S]*data-botao="entrar"[\s\S]*<\/header>/)
    expect(HTML).toMatch(/<footer[\s\S]*data-botao="entrar"[\s\S]*<\/footer>/)
  })

  it("CA-B24-04 — todo botão Solicitar demonstração abre o WhatsApp certo, em nova aba, com a mensagem pronta", () => {
    const botoes = links(HTML).filter((l) => l.texto === "Solicitar demonstração")
    expect(botoes.length).toBeGreaterThanOrEqual(3) // cabeçalho, abertura e chamada final
    const esperado = `https://wa.me/${WHATSAPP_DEMONSTRACAO.numero}?text=${encodeURIComponent(WHATSAPP_DEMONSTRACAO.mensagem)}`
    expect(LINK_DEMONSTRACAO).toBe(esperado)
    for (const b of botoes) {
      expect(b.href.replace(/&amp;/g, "&")).toBe(esperado)
      expect(b.atributos).toContain('target="_blank"')
      expect(b.atributos).toContain("noopener")
    }
  })

  it("CA-B24-05 — nenhum caminho para criar conta", () => {
    expect(TEXTO).not.toMatch(/criar conta/i)
    expect(TEXTO).not.toMatch(/cadastre-se/i)
    expect(TEXTO).not.toMatch(/teste grátis/i)
    expect(HTML).not.toContain('href="/cadastro"')
  })

  it("CA-B24-06 — todas as seções estão lá, na ordem, com 8 módulos, 4 passos da conexão e 6 perguntas", () => {
    const ordem = [ABERTURA.titulo, DOR.titulo, VIRADA.titulo, MODULOS.titulo, PARA_QUEM.titulo, CONEXAO.titulo, SEUS_DADOS.titulo, PERGUNTAS.titulo, "Organize as vendas do seu atacado", EMPRESA.razaoSocial]
    let posicao = -1
    for (const trecho of ordem) {
      const i = TEXTO.indexOf(trecho, posicao + 1)
      expect(i, `seção "${trecho}" fora de ordem ou ausente`).toBeGreaterThan(posicao)
      posicao = i
    }
    expect(HTML.match(/data-modulo/g)).toHaveLength(8)
    expect(HTML.match(/data-passo-conexao/g)).toHaveLength(4)
    expect(HTML.match(/<details/g)).toHaveLength(6)
    for (const d of DOR.itens) expect(TEXTO).toContain(d.titulo)
    for (const p of VIRADA.passos) expect(TEXTO).toContain(p.titulo)
    for (const p of PARA_QUEM.perfis) expect(TEXTO).toContain(p.titulo)
    for (const t of SEUS_DADOS.itens) expect(TEXTO).toContain(t)
    for (const q of PERGUNTAS.itens) expect(TEXTO).toContain(q.pergunta)
  })

  it("CA-B24-07 — o rodapé identifica a empresa: razão social, CNPJ, endereço, e-mail e links legais", () => {
    const rodape = /<footer[\s\S]*<\/footer>/.exec(HTML)?.[0] ?? ""
    const texto = rodape.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
    expect(texto).toContain("SETE ADS 2 LTDA")
    expect(texto).toContain("53.756.257/0001-34")
    expect(texto).toContain("Hortolândia/SP")
    expect(rodape).toContain('href="mailto:atacadoexponencial@gmail.com"')
    expect(rodape).toContain('href="/politica-de-privacidade"')
    expect(rodape).toContain('href="/termos-de-servico"')
    expect(texto).toContain(`© ${new Date().getFullYear()}`)
  })

  it("CA-B24-08 — o texto respeita as regras da Meta: sem nome colado, QR Code, coexistência, preço, plano, grátis ou logos", () => {
    expect(TEXTO).not.toMatch(/crmatacado exp\s+WhatsApp/i)
    expect(TEXTO).not.toMatch(/crmatacado exp\s+Meta/i)
    expect(TEXTO).not.toMatch(/QR Code/i)
    expect(TEXTO).not.toMatch(/coexist/i)
    expect(TEXTO).not.toMatch(/preço/i)
    expect(TEXTO).not.toMatch(/\bplanos?\b/i)
    expect(TEXTO).not.toMatch(/grátis/i)
    const imagens = [...HTML.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    for (const img of imagens) {
      expect(img).not.toMatch(/src="[^"]*(meta|whatsapp)[^"]*"/i)
      expect(img).not.toMatch(/alt="[^"]*(logo da meta|logo do whatsapp)[^"]*"/i)
    }
  })

  it("CA-B24-09 — âncoras do cabeçalho e 'Ver como funciona' apontam para seções que existem", () => {
    for (const id of ["modulos", "como-funciona", "para-quem", "perguntas"]) {
      expect(HTML).toContain(`data-ancora="${id}" `)
      expect(HTML).toMatch(new RegExp(`data-ancora="${id}"[^>]*href="#${id}"|href="#${id}"[^>]*data-ancora="${id}"`))
      expect(HTML).toContain(`id="${id}"`)
    }
    expect(HTML).toMatch(/href="#como-funciona"[^>]*data-ancora="ver-como-funciona"|data-ancora="ver-como-funciona"[^>]*href="#como-funciona"/)
  })

  it("CA-B24-10 — a sanfona abre uma pergunta por vez", () => {
    const { container } = render(<Perguntas itens={PERGUNTAS.itens} />)
    const abertas = () => [...container.querySelectorAll("details")].filter((d) => d.open).map((d) => d.dataset.pergunta)
    expect(abertas()).toEqual(["0"])

    fireEvent.click(container.querySelectorAll("summary")[2])
    expect(abertas()).toEqual(["2"])

    fireEvent.click(container.querySelectorAll("summary")[5])
    expect(abertas()).toEqual(["5"])

    // clicar na que está aberta fecha tudo
    fireEvent.click(container.querySelectorAll("summary")[5])
    expect(abertas()).toEqual([])
  })

  it("CA-B24-11 — título da aba, descrição e imagem de compartilhamento", () => {
    expect(metadata.title).toEqual({ absolute: TITULO_ABA })
    expect(TITULO_ABA).toBe("crmatacado exp — CRM para atacadistas que vendem pelo WhatsApp")
    expect(typeof metadata.description).toBe("string")
    expect((metadata.description as string).length).toBeGreaterThan(20)
    const og = metadata.openGraph as { images: Array<{ url: string }> }
    expect(og.images[0].url).toMatch(/^\/landing\//)
  })

  it("CA-B24-12 — os quatro prints existem em public/landing, pesam menos de 250 KB e toda imagem declara largura e altura", () => {
    const pasta = path.resolve(__dirname, "../../public/landing")
    for (const nome of ["caixa-de-entrada.png", "funil.png", "catalogo.png", "conexao.png"]) {
      const arquivo = path.join(pasta, nome)
      const tamanho = statSync(arquivo).size
      expect(tamanho, `${nome} pesa ${tamanho} bytes`).toBeLessThan(250 * 1024)
      // assinatura PNG: é imagem de verdade, não um arquivo vazio
      expect(readFileSync(arquivo).subarray(1, 4).toString()).toBe("PNG")
    }
    // next/image serve pelo otimizador: o caminho vai codificado dentro de /_next/image?url=...
    for (const foto of Object.values(PRINTS)) expect(HTML).toContain(encodeURIComponent(foto.src))
    const imagens = [...HTML.matchAll(/<img\b[^>]*>/g)].map((m) => m[0])
    expect(imagens.length).toBeGreaterThanOrEqual(4)
    for (const img of imagens) {
      expect(img, img).toMatch(/\swidth="\d+"/)
      expect(img, img).toMatch(/\sheight="\d+"/)
    }
  })
})
