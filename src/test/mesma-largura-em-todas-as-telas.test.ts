// B48-12: todas as telas logadas usam o mesmo contêiner de página. Antes, cada
// uma tinha a sua largura centralizada, e o título mudava de lugar ao navegar.

import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

const PASTA = path.resolve(__dirname, "../app/(auth)")

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return nome.endsWith(".tsx") ? [caminho] : []
  })
}

describe("B48-12 — mesma margem e largura em todas as telas", () => {
  it("CA-B48-29: nenhuma tela monta o próprio contêiner centralizado; todas usam o da página", () => {
    const comLarguraPropria: string[] = []
    const usamOContainer: string[] = []
    for (const arquivo of arquivos(PASTA)) {
      const texto = readFileSync(arquivo, "utf8")
      if (/mx-auto[^"`]*max-w-[3-7]xl|max-w-[3-7]xl[^"`]*mx-auto/.test(texto)) comLarguraPropria.push(path.relative(PASTA, arquivo))
      if (texto.includes("CLASSE_DA_PAGINA")) usamOContainer.push(arquivo)
    }
    expect(comLarguraPropria).toEqual([])
    // As telas de lista, configuração, relatório e catálogo, e os carregamentos delas
    expect(usamOContainer.length).toBeGreaterThanOrEqual(36)
    expect(CLASSE_DA_PAGINA).toContain("max-w-6xl")
  })
})
