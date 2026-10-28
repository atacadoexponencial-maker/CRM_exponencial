// B47-08: no editor, "Salvar e ativar" salva e liga pela mesma action do botão da
// lista; "Salvar" sozinho deixa desligada; a regra ligada não mostra o botão.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const substituir = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: substituir, push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/automacoes/actions", () => ({
  alternarRegra: vi.fn(async () => ({})),
  salvarRegra: vi.fn(async () => ({ id: "regra-nova" })),
  buscarContatosTeste: vi.fn(async () => []),
  contarEsperasQueSaem: vi.fn(async () => 0),
  guardarArquivoDaAutomacao: vi.fn(),
  simularRegra: vi.fn(),
}))

import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { Fluxo } from "@/lib/fluxo-automacao"
import { alternarRegra, salvarRegra } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { EditorClient } from "@/app/(auth)/configuracoes/automacoes/[id]/editor-client"
import { AVISO_SALVA_DESLIGADA, AVISO_SALVA_LIGADA, avisoDoPrimeiroSalvamento } from "@/app/(auth)/configuracoes/automacoes/[id]/avisos-do-salvar"

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
const FLUXO: Fluxo = {
  blocos: [
    { id: "g", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao },
    { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: { x: 0, y: 150 } },
  ],
  ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
}

function abrir(regra: { id: string | null; ativa: boolean }) {
  render(
    <EditorClient
      regra={{ ...regra, nome: "Boas-vindas", fluxo: FLUXO, repeticao: { modo: "uma_vez_por_contato" } }}
      opcoes={OPCOES}
      usuarioId={`u-${Math.random()}`}
    />
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe("B47-08: Salvar e ativar no editor", () => {
  it("CA-B47-19: Salvar uma automação nova não liga e avisa que está desligada", async () => {
    abrir({ id: null, ativa: false })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    await waitFor(() => expect(salvarRegra).toHaveBeenCalledTimes(1))
    expect(alternarRegra).not.toHaveBeenCalled()
    expect(substituir).toHaveBeenCalledWith("/configuracoes/automacoes/regra-nova?salva=1")
    expect(avisoDoPrimeiroSalvamento("1")).toBe(AVISO_SALVA_DESLIGADA)
  })

  it("CA-B47-20: Salvar e ativar salva e liga pela action do botão da lista", async () => {
    abrir({ id: null, ativa: false })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar e ativar" })))
    await waitFor(() => expect(alternarRegra).toHaveBeenCalledWith("regra-nova", true))
    expect(vi.mocked(salvarRegra).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(alternarRegra).mock.invocationCallOrder[0])
    expect(substituir).toHaveBeenCalledWith("/configuracoes/automacoes/regra-nova?salva=ativa")
    expect(avisoDoPrimeiroSalvamento("ativa")).toBe(AVISO_SALVA_LIGADA)
  })

  it("CA-B47-20: se a conferência recusa ligar, diz que foi salva e continua desligada", async () => {
    vi.mocked(alternarRegra).mockResolvedValueOnce({ erro: "Não dá para ativar: a etiqueta escolhida não existe mais." })
    abrir({ id: "regra-1", ativa: false })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar e ativar" })))
    expect(await screen.findByText(/A automação foi salva, mas continua desligada\. Não dá para ativar/)).toBeTruthy()
  })

  it("CA-B47-21: a automação ligada não mostra Salvar e ativar, e Salvar não chama o liga/desliga", async () => {
    abrir({ id: "regra-1", ativa: true })
    expect(screen.queryByRole("button", { name: "Salvar e ativar" })).toBeNull()
    vi.mocked(salvarRegra).mockResolvedValueOnce({ id: "regra-1" })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar" })))
    await waitFor(() => expect(salvarRegra).toHaveBeenCalledTimes(1))
    expect(alternarRegra).not.toHaveBeenCalled()
  })
})
