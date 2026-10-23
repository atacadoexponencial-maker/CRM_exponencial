// B41-03 — na tela, a ficha do contato no chat mostra o funil da empresa com a etapa, e
// o aviso de exclusão lista o card de cada funil, com o nome dele.

import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"

vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(async () => ({})),
  adicionarTagContato: vi.fn(async () => ({})),
  removerTagContato: vi.fn(async () => ({})),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: vi.fn(async () => ({
    dataPrimeiroContato: "23 de out. de 2026",
    cadastro: {
      contactId: "c-1",
      classificacao: "lead",
      tipo: null,
      cidade: null,
      uf: null,
      icp: null,
      atendente: null,
      tags: [],
      funis: [
        { funil: "entrada", etapa: "Sondagem" },
        { funil: "f-feira", etapa: "Confirmou", nome: "Feira de Março" },
      ],
    },
  })),
  atualizarNomeContato: vi.fn(),
}))

import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"
import { DialogoExcluirContato } from "@/app/(auth)/contatos/components/dialogo-excluir-contato"

const CONVERSA: Conversa = {
  id: "conv-1",
  contato: { nome: "Loja Março", telefone: "5521970690000", contactId: "c-1" },
  ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0,
  status: "em_atendimento",
  etiquetas: [],
  atribuidaA: null,
  dataPrimeiroContato: "2026-10-23",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
}

describe("B41-03 — Funis da empresa na ficha e no aviso de exclusão", () => {
  it("CA-B41-25: should mostrar na ficha do chat o Funil de Entrada e o funil novo, cada um com a etapa", async () => {
    render(<PainelContato conversa={CONVERSA} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} />)
    await waitFor(() => expect(screen.getByText("Feira de Março")).toBeTruthy())
    expect(screen.getByText("Funil de Entrada").nextElementSibling?.textContent).toBe("Sondagem")
    expect(screen.getByText("Feira de Março").nextElementSibling?.textContent).toBe("Confirmou")
  })

  it("CA-B41-27: should listar no aviso de exclusão os 3 cards, com o nome de cada funil", () => {
    render(
      <DialogoExcluirContato
        aberto
        onAbertoChange={vi.fn()}
        nome="Loja Março"
        telefone="5521970690000"
        funis={["entrada", "f-feira", "f-lanc"]}
        nomesDosFunis={{ "f-feira": "Feira de Março", "f-lanc": "Lançamento" }}
        funilDeOrigem="entrada"
        conversas={0}
        mensagens={0}
        onConfirmar={vi.fn()}
      />
    )
    expect(screen.getByText("O card no Funil de Entrada")).toBeTruthy()
    expect(screen.getByText("O card no Feira de Março")).toBeTruthy()
    expect(screen.getByText("O card no Lançamento")).toBeTruthy()
    expect(screen.getByText("Os cards em Feira de Março, Lançamento também vão para a lixeira.")).toBeTruthy()
  })
})
