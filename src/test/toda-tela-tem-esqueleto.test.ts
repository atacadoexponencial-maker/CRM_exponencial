// Pendência 7: sem loading.tsx próprio, o clique não muda nada na tela até o
// servidor terminar (medido: 0,7–1,6 s em WhatsApp → Saúde). O esqueleto de
// `(auth)/loading.tsx` não cobre navegação dentro da mesma seção, então cada
// tela precisa do seu.

import { existsSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const RAIZ = path.resolve(__dirname, "../app/(auth)")

function pastasComPagina(pasta: string): string[] {
  const filhas = readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory())
  const aqui = existsSync(path.join(pasta, "page.tsx")) ? [pasta] : []
  return [...aqui, ...filhas.flatMap((f) => pastasComPagina(path.join(pasta, f.name)))]
}

describe("resposta na hora do clique", () => {
  it("toda tela logada tem o próprio esqueleto de carregamento", () => {
    const telas = pastasComPagina(RAIZ)
    expect(telas.length).toBeGreaterThan(30)

    const semEsqueleto = telas
      .filter((tela) => !existsSync(path.join(tela, "loading.tsx")))
      .map((tela) => path.relative(RAIZ, tela))

    expect(semEsqueleto).toEqual([])
  })
})
