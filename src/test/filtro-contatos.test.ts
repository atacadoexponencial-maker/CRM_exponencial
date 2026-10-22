// B37-01 — catálogo do filtro avançado de contatos.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { CAMPOS_DO_FILTRO, COLUNAS_FORA_DO_FILTRO } from "@/lib/filtro-contatos"

/** Colunas de `contacts` como estão no tipo gerado do banco. */
function colunasDeContacts(): string[] {
  const tipos = readFileSync(resolve(__dirname, "../integrations/supabase/types.ts"), "utf8")
  const inicio = tipos.indexOf("      contacts: {")
  const row = tipos.indexOf("Row: {", inicio)
  const fim = tipos.indexOf("}", row)
  return tipos
    .slice(row + "Row: {".length, fim)
    .split("\n")
    .map((l) => l.trim().match(/^(\w+):/)?.[1])
    .filter((c): c is string => !!c)
}

describe("B37-01 — catálogo do filtro de contatos", () => {
  it("CA-B37-04: should exigir que toda coluna do contato esteja no filtro ou marcada como fora dele", () => {
    const colunas = colunasDeContacts()
    expect(colunas.length).toBeGreaterThan(10)

    const decididas = new Set<string>([...CAMPOS_DO_FILTRO.map((c) => c.coluna), ...COLUNAS_FORA_DO_FILTRO])
    const semDecisao = colunas.filter((c) => !decididas.has(c))
    expect(semDecisao, `colunas novas fora do filtro: ${semDecisao.join(", ")}`).toEqual([])

    // E o catálogo não aponta para coluna que não existe.
    const inexistentes = CAMPOS_DO_FILTRO.map((c) => c.coluna).filter((c) => !colunas.includes(c))
    expect(inexistentes).toEqual([])
  })
})
