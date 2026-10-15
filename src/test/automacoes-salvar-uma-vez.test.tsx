// B22-31 — três cliques seguidos em Salvar criavam três regras (baixo do QA das
// automações, 09/10/2026): só um salvamento roda por vez.

import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { EditorFluxo } from "@/app/(auth)/configuracoes/automacoes/components/editor-fluxo"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"

// O React Flow mede o canvas com ResizeObserver, que o jsdom não tem
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const OPCOES: OpcoesEditor = {
  etiquetas: [],
  atendentes: [],
  tags: [],
  times: [],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
}

const posicao = { x: 0, y: 0 }

describe("B22-31 — Salvar uma vez só", () => {
  it("três cliques antes da resposta: um salvamento", async () => {
    let responder: (v: { aviso?: string }) => void = () => {}
    const salvar = vi.fn(() => new Promise<{ aviso?: string }>((resolve) => (responder = resolve)))
    render(
      <EditorFluxo
        regraInicial={{
          nome: "Boas-vindas",
          repeticao: { modo: "sempre" },
          fluxo: {
            blocos: [
              { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
              { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 200 } },
            ],
            ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
          },
        }}
        opcoes={OPCOES}
        buscarContatos={vi.fn(async () => [])}
        salvar={salvar}
        simular={vi.fn()}
        guardarArquivo={vi.fn()}
        onVoltar={vi.fn()}
        chaveRascunho="teste:b22-31"
        regraNova
      />
    )

    const botao = screen.getByRole("button", { name: "Salvar" })
    act(() => {
      fireEvent.click(botao)
      fireEvent.click(botao)
      fireEvent.click(botao)
    })
    expect(salvar).toHaveBeenCalledTimes(1)

    await act(async () => responder({ aviso: "Automação salva" }))
    fireEvent.click(botao)
    expect(salvar).toHaveBeenCalledTimes(2)
  })
})
