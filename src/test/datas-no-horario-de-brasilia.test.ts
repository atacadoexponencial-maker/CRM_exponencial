// B48-01: as datas da tela saem no horário de Brasília, mesmo montadas no servidor
// da Vercel, que roda em UTC. O processo do teste roda em UTC, como lá.
process.env.TZ = "UTC"

import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it, expect, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))

import { createClient } from "@/integrations/supabase/server"
import { buscarDadosPainel } from "@/app/(auth)/pipeline/actions"
import { formatarDataDoCalendario } from "@/lib/datas"

/** Banco falso: cada tabela devolve as linhas dela, com qualquer filtro. */
function banco(linhas: Record<string, unknown[]>) {
  return {
    from: (tabela: string) => {
      const obj: Record<string, unknown> = {}
      for (const m of ["select", "eq", "in", "order"]) obj[m] = () => obj
      obj.maybeSingle = () => Promise.resolve({ data: (linhas[tabela] ?? [])[0] ?? null, error: null })
      obj.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: linhas[tabela] ?? [], error: null }).then(resolve)
      return obj
    },
  }
}

/** Arquivos de código das telas e das bibliotecas. */
function arquivosDeCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho)
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : []
  })
}

/** Trecho dos argumentos da chamada que começa em `inicio`, até o parêntese que a fecha. */
function argumentos(texto: string, inicio: number): string {
  let profundidade = 0
  for (let i = texto.indexOf("(", inicio); i < texto.length; i++) {
    if (texto[i] === "(") profundidade++
    if (texto[i] === ")" && --profundidade === 0) return texto.slice(inicio, i + 1)
  }
  return texto.slice(inicio)
}

describe("B48-01: datas no horário de Brasília", () => {
  it("CA-B48-01: o histórico do card mostra 15:00 para um movimento das 18:00 UTC", async () => {
    vi.mocked(createClient).mockResolvedValue(
      banco({
        pipeline_card_history: [{ de_etapa: "lead", para_etapa: "sondagem", created_at: "2026-10-27T18:00:00.000Z", alterado_por: { name: "Ana" } }],
        pipeline_card_notes: [{ id: "n1", texto: "Ligar", created_at: "2026-10-28T01:30:00.000Z", autor: { name: "Ana" } }],
        pipeline_cards: [{ funil: "entrada" }],
      }) as never
    )
    const { historico, notas } = await buscarDadosPainel("card-1")
    expect(historico[0].data).toContain("15:00")
    expect(historico[0].data).not.toContain("18:00")
    expect(historico[0].data).toContain("27/10/2026")
    // 01:30 UTC do dia 28 ainda é dia 27 em Brasília
    expect(notas[0].data).toBe("27/10/2026")
  })

  it("CA-B48-01: data de calendário sem hora não muda de dia", () => {
    expect(formatarDataDoCalendario("2026-10-27")).toBe("27/10/2026")
  })

  it("CA-B48-02: nenhuma data das telas é formatada sem fuso", () => {
    const raiz = path.resolve(__dirname, "..")
    const semFuso: string[] = []
    const chamada = /\.toLocaleDateString\(|\.toLocaleTimeString\(|new Date\([^()]*(?:\([^()]*\)[^()]*)*\)\.toLocaleString\(|\bdata\.toLocaleString\(|new Intl\.DateTimeFormat\(/g
    for (const pasta of ["app", "components", "lib"]) {
      for (const arquivo of arquivosDeCodigo(path.join(raiz, pasta))) {
        const texto = readFileSync(arquivo, "utf8")
        for (const achado of texto.matchAll(chamada)) {
          if (!argumentos(texto, achado.index!).includes("timeZone")) {
            const linha = texto.slice(0, achado.index).split("\n").length
            semFuso.push(`${path.relative(raiz, arquivo)}:${linha}`)
          }
        }
      }
    }
    expect(semFuso).toEqual([])
  })
})
