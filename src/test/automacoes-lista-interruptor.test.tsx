// B22-21 — interruptor de ativar e pausar na lista de automações (achado M18 do
// QA das automações, 09/10/2026): muda na hora e mostra "Salvando…" até o
// servidor responder. A action é uma promessa que o teste resolve.

import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { ListaRegras, type RegraListada } from "@/app/(auth)/configuracoes/automacoes/components/lista-regras"

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

const REGRA: RegraListada = {
  id: "r1",
  nome: "Boas-vindas",
  ativa: true,
  fluxo: { blocos: [{ id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } }], ligacoes: [] },
  execucoes7dias: 0,
  ultimaExecucao: null,
}

describe("B22-21 — interruptor com 'Salvando…'", () => {
  it("muda na hora, fica 'salvando' e desabilitado até o servidor responder", async () => {
    let responder: (v: unknown) => void = () => {}
    const onAlternar = vi.fn(() => new Promise((resolve) => (responder = resolve)))
    render(
      <ListaRegras
        regras={[REGRA]}
        opcoes={OPCOES}
        historicoDisponivel
        onNova={vi.fn()}
        onEditar={vi.fn()}
        onAlternar={onAlternar}
        onDuplicar={vi.fn()}
        onVerHistorico={vi.fn()}
        onExcluir={vi.fn(async () => ({}))}
      />
    )

    fireEvent.click(screen.getByRole("switch", { name: "Pausar Boas-vindas" }))
    const interruptor = await screen.findByRole("switch", { name: "Ativar Boas-vindas" })
    expect(interruptor.getAttribute("aria-checked")).toBe("false")
    expect(interruptor.getAttribute("aria-busy")).toBe("true")
    expect((interruptor as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText("Salvando…")).toBeTruthy()
    expect(onAlternar).toHaveBeenCalledWith("r1", false)

    // Resposta sem a lista nova (erro): volta ao que veio do servidor
    await act(async () => responder({ erro: "falhou" }))
    expect(screen.queryByText("Salvando…")).toBeNull()
    expect(screen.getByRole("switch", { name: "Pausar Boas-vindas" }).getAttribute("aria-checked")).toBe("true")
  })
})
