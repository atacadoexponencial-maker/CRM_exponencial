// B46-03: o botão de menu de cada linha diz de qual linha é, e a confirmação de
// apagar mostra o nome em destaque.

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/etiquetas/actions", () => ({
  criarEtiqueta: vi.fn(),
  editarEtiqueta: vi.fn(),
  excluirEtiqueta: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/mensagens-rapidas/actions", () => ({
  criarMensagemRapida: vi.fn(),
  editarMensagemRapida: vi.fn(),
  excluirMensagemRapida: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/times/actions", () => ({
  editarNomeTime: vi.fn(),
  excluirTime: vi.fn(),
  gerenciarMembrosTime: vi.fn(),
}))
vi.mock("@/app/(auth)/configuracoes/usuarios/actions", () => ({
  editarPapel: vi.fn(),
  gerenciarTimes: vi.fn(),
  desativarUsuario: vi.fn(),
  reativarUsuario: vi.fn(),
}))

import { EtiquetasClient } from "@/app/(auth)/configuracoes/etiquetas/etiquetas-client"
import { MensagensRapidasClient } from "@/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client"
import { AcoesTime } from "@/app/(auth)/configuracoes/times/acoes-time"
import { AcoesUsuario } from "@/app/(auth)/configuracoes/usuarios/acoes-usuario"

const ETIQUETAS = [
  { id: "e1", nome: "Interessado", cor: "#22c55e", conversas: 2 },
  { id: "e2", nome: "Cliente", cor: "#3b82f6", conversas: 0 },
]

describe("B46-03: menu de cada linha com o nome", () => {
  it("CA-B46-06: os botões de menu das etiquetas dizem de qual etiqueta são", () => {
    render(<EtiquetasClient etiquetasIniciais={ETIQUETAS} />)
    expect(screen.getByRole("button", { name: "Abrir menu de Interessado" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Abrir menu de Cliente" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Abrir menu" })).toBeNull()
  })

  it("CA-B46-06: mensagens rápidas, times e usuários também levam o nome da linha", () => {
    render(
      <>
        <MensagensRapidasClient mensagensIniciais={[{ id: "m1", titulo: "/ola", conteudo: "Olá!" }]} />
        <AcoesTime timeId="t1" nomeAtual="Entrada" isDefault membrosAtuaisIds={[]} todosUsuarios={[]} />
        <AcoesUsuario usuario={{ id: "u1", name: "Ana Souza", role: "atendente", status: "ativo", timesIds: [] }} ehEuMesmo={false} times={[]} />
      </>
    )
    expect(screen.getByRole("button", { name: "Abrir menu de /ola" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Abrir menu de Entrada" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Abrir menu de Ana Souza" })).toBeTruthy()
  })

  it("CA-B46-07: a confirmação de apagar mostra o nome da etiqueta em negrito", async () => {
    render(<EtiquetasClient etiquetasIniciais={ETIQUETAS} />)
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu de Interessado" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: /Excluir/ }))
    const dialogo = await screen.findByRole("dialog")
    const destaque = within(dialogo).getByText("Interessado")
    expect(destaque.tagName).toBe("STRONG")
    expect(within(dialogo).getByRole("button", { name: "Excluir" })).toBeTruthy()
  })
})
