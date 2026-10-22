// B36-02 — Telas legíveis nos dois temas.
// Varre o código das telas atrás de cor escrita direto, que não acompanha o tema
// (texto branco fixo, aviso com texto colorido claro, fundo de cor fixa), e confere o
// contraste das cores de aviso, erro, sucesso e informação nos dois temas.

import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const SRC = path.resolve(__dirname, "..")
const FORA = ["app/loja", "components/ui", "test"].map((p) => path.join(SRC, p))

/** Cor fixa que fica de propósito, com o motivo. */
const EXCECOES: { arquivo: string; padrao: RegExp; motivo: string }[] = [
  { arquivo: "app/(auth)/catalogo/components/editor-produto.tsx", padrao: /bg-black\/70|text-white|hover:bg-black/, motivo: "etiqueta e botão sobre a foto do produto" },
  { arquivo: "app/(auth)/chat/components/balao-mensagem.tsx", padrao: /bg-black\/70|text-white|hover:bg-black\/90/, motivo: "botão de fechar sobre a mídia ampliada" },
  { arquivo: "app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx", padrao: /bg-white/, motivo: "o QR code precisa de fundo branco para o celular ler" },
  { arquivo: "app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx", padrao: /#1877F2|#166FE5|text-white/, motivo: "botão com a cor da marca do Facebook" },
  { arquivo: "app/(auth)/pipeline/components/modal-novo-lead.tsx", padrao: /bg-black\/50/, motivo: "fundo escurecido atrás da janela" },
  { arquivo: "components/shared/sidebar-nav.tsx", padrao: /bg-black\/40/, motivo: "fundo escurecido atrás do menu no celular" },
  { arquivo: "app/(auth)/relatorios/components/coorte-client.tsx", padrao: /text-white|rgba\(|#4caf7d/, motivo: "cor de dado do mapa de calor; texto branco só na célula forte" },
  { arquivo: "app/(auth)/relatorios/components/evolucao-perfis.tsx", padrao: /text-white/, motivo: "etiqueta na cor do perfil RFV" },
  { arquivo: "app/(auth)/relatorios/components/lista-clientes-rfv.tsx", padrao: /text-white/, motivo: "etiqueta na cor do perfil RFV" },
  { arquivo: "app/(auth)/relatorios/components/rfv-client.tsx", padrao: /text-white/, motivo: "célula da matriz na cor do perfil RFV" },
  { arquivo: "app/(auth)/relatorios/components/funil-clientes-client.tsx", padrao: /#fff/, motivo: "rótulo sobre a barra na cor da etapa" },
  { arquivo: "app/(auth)/relatorios/components/grafico-25-meses.tsx", padrao: /#22c55e/, motivo: "cor de série do gráfico" },
  { arquivo: "app/(auth)/relatorios/components/graficos-visao-geral.tsx", padrao: /#[0-9a-f]{6}/i, motivo: "cores de série dos gráficos" },
  { arquivo: "lib/relatorios/rfv.ts", padrao: /#[0-9a-f]{6}/i, motivo: "cor de cada perfil RFV (dado, igual nos dois temas)" },
  { arquivo: "lib/relatorios/funil-clientes.ts", padrao: /#[0-9a-f]{6}/i, motivo: "cor de cada etapa do funil de clientes (dado)" },
  { arquivo: "lib/metricas-dashboard.ts", padrao: /#[0-9a-f]{6}/i, motivo: "cor de cada fatia do gráfico da base (dado)" },
  { arquivo: "lib/relatorios/visao-geral.ts", padrao: /#123/, motivo: "texto de exemplo, não é cor" },
  { arquivo: "app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx", padrao: /#[0-9a-f]{6}/i, motivo: "cores que o usuário escolhe para as etiquetas (dado)" },
  { arquivo: "app/(auth)/catalogo/components/editor-aparencia.tsx", padrao: /#[0-9a-f]{3,6}/i, motivo: "cores da loja pública, que é sempre clara" },
  { arquivo: "app/(auth)/chat/mock-conversas.ts", padrao: /#[0-9a-f]{6}/i, motivo: "dados de exemplo" },
  { arquivo: "app/(auth)/pipeline/mock-pipeline.ts", padrao: /#[0-9a-f]{6}/i, motivo: "dados de exemplo" },
]

const SEMANTICAS = "amber|yellow|red|rose|emerald|green|teal|sky|blue|cyan|zinc|neutral|gray|stone|slate"
const CATEGORICAS = "orange|purple|violet|indigo|fuchsia|pink|lime"
const PROIBIDAS: { nome: string; rx: RegExp }[] = [
  // Cor de aviso, erro, sucesso, informação ou cinza: tem que vir do tema (text-aviso, bg-erro-fundo...).
  { nome: "cor da paleta no lugar da cor do tema", rx: new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:bg|text|border(?:-[trblxyse])?|ring|fill|stroke|outline|divide|decoration)-(?:${SEMANTICAS})-\\d{2,3}(?:/\\d+)?(?![\\w-])`, "g") },
  { nome: "branco ou preto fixo", rx: /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border(?:-[trblxyse])?|ring|fill|stroke|outline|divide)-(?:white|black)(?:\/\d+)?(?![\w-])/g },
  { nome: "cor escrita em código", rx: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?!\d)|rgba?\(/g },
]

function arquivos(dir: string, lista: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = path.join(dir, nome)
    if (FORA.some((f) => caminho.startsWith(f))) continue
    if (statSync(caminho).isDirectory()) arquivos(caminho, lista)
    else if (/\.tsx?$/.test(nome) && !nome.endsWith(".d.ts")) lista.push(caminho)
  }
  return lista
}

function variaveis(css: string, seletor: string): Record<string, string> {
  const inicio = css.indexOf(seletor + " {")
  const bloco = css.slice(inicio, css.indexOf("}", inicio))
  return Object.fromEntries([...bloco.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]))
}
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contraste(a: string, b: string) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

describe("B36-02 — Telas legíveis nos dois temas", () => {
  it("CA-B36-10: should não sobrar cor fixa que some no tema claro, fora as exceções de propósito", () => {
    const achados: string[] = []
    for (const arquivo of arquivos(SRC)) {
      const relativo = path.relative(SRC, arquivo).replace(/\\/g, "/")
      readFileSync(arquivo, "utf-8").split("\n").forEach((linha, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(linha)) return
        for (const { nome, rx } of PROIBIDAS) {
          for (const m of linha.matchAll(rx)) {
            const permitido = EXCECOES.some((e) => e.arquivo === relativo && e.padrao.test(m[0]))
            if (!permitido) achados.push(`${relativo}:${i + 1} ${nome}: ${m[0]}`)
          }
        }
        // Cor categórica (laranja, roxo...) só vale com o par do tema escuro na mesma linha.
        for (const m of linha.matchAll(new RegExp(`(?<![\\w-])((?:[a-z-]+:)*)(bg|text|border(?:-[trblxyse])?)-(${CATEGORICAS})-\\d{2,3}(?:/\\d+)?(?![\\w-])`, "g"))) {
          if (m[1].includes("dark:")) continue
          if (!linha.includes(`dark:${m[2]}-${m[3]}-`)) achados.push(`${relativo}:${i + 1} cor sem o par do escuro: ${m[0]}`)
        }
      })
    }
    expect(achados).toEqual([])
  })

  it("CA-B36-11: should deixar aviso, erro e sucesso legíveis no próprio fundo, nos dois temas", () => {
    const css = readFileSync(path.join(SRC, "app/globals.css"), "utf-8")
    for (const [nome, tema] of [["claro", variaveis(css, ":root,\n.tema-claro")], ["escuro", variaveis(css, ".dark")]] as const) {
      for (const tipo of ["aviso", "erro", "sucesso", "info"]) {
        expect(contraste(tema[tipo], tema[`${tipo}-fundo`]), `${nome}: ${tipo}`).toBeGreaterThanOrEqual(4.5)
        expect(contraste(tema[tipo], tema.background), `${nome}: ${tipo} sobre o fundo da página`).toBeGreaterThanOrEqual(4.5)
        expect(contraste(tema[tipo], tema.card), `${nome}: ${tipo} sobre a superfície`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
