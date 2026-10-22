// B36-14 — a série mudou a aparência de todas as telas; nenhuma função pode sumir.
// A prova é a suíte inteira de testes que o sistema já tinha passando (o resultado vai
// na issue B36-14). Este arquivo garante a parte mecânica: nenhum arquivo de teste de
// antes da série foi apagado e nenhum teste foi pulado para a suíte passar.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const RAIZ = path.resolve(__dirname, "../..")
/** Arquivos de teste no master antes da B36 (commit e9de5a4). */
const TESTES_DE_ANTES: string[] = JSON.parse(readFileSync(path.join(__dirname, "b36-testes-de-antes.json"), "utf-8"))

function arquivosDeTeste(dir: string, lista: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = path.join(dir, nome)
    if (statSync(caminho).isDirectory()) arquivosDeTeste(caminho, lista)
    else if (/\.(test|spec)\.(ts|tsx|mjs)$/.test(nome)) lista.push(caminho)
  }
  return lista
}

describe("B36-14 — Nenhuma função some", () => {
  it("CA-B36-28: should manter todos os arquivos de teste de antes da série e nenhum teste pulado", () => {
    expect(TESTES_DE_ANTES.length).toBeGreaterThan(150)
    expect(TESTES_DE_ANTES.filter((arquivo) => !existsSync(path.join(RAIZ, arquivo)))).toEqual([])

    const pulados: string[] = []
    for (const arquivo of [...arquivosDeTeste(path.join(RAIZ, "src/test")), ...arquivosDeTeste(path.join(RAIZ, "e2e"))]) {
      const relativo = path.relative(RAIZ, arquivo).replace(/\\/g, "/")
      readFileSync(arquivo, "utf-8").split("\n").forEach((linha, i) => {
        // O teste do auditor escreve um teste pulado de propósito, como dado (já existia).
        if (relativo === "src/test/auditor.test.mjs" && linha.includes("it.skip('CA-EX1-02")) return
        if (relativo === "src/test/b36-nenhuma-funcao-some.test.ts") return
        if (/\b(?:it|test|describe)\.(?:skip|only|todo|skipIf)\(|\bx(?:it|describe)\(/.test(linha)) pulados.push(`${relativo}:${i + 1}`)
      })
    }
    expect(pulados).toEqual([])
  })
})
