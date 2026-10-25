// Lote 3 das correções do QA das automações (09/10/2026): a página de histórico
// de execuções, pela tela, sem rede. Cada bloco de testes é de uma issue B22.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { ExecucaoListada, FiltrosDoHistorico } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))

import { HistoricoClient } from "@/app/(auth)/configuracoes/automacoes/historico/historico-client"

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

const TODAS: FiltrosDoHistorico = { dias: 30 }

function execucao(mudancas: Partial<ExecucaoListada> = {}): ExecucaoListada {
  return {
    id: "e1",
    quando: "2026-10-14T13:00:00.000Z",
    regraId: "r1",
    regraNome: "Boas-vindas",
    regraExcluida: false,
    contato: { id: "c1", nome: "Ana Souza" },
    evento: { tipo: "conversa_criada" },
    resultado: "concluida",
    motivo: null,
    caminho: [],
    ...mudancas,
  }
}

function abrir(execucoes = [execucao()], filtros = TODAS) {
  return render(
    <HistoricoClient execucoes={execucoes} regras={[{ id: "r1", nome: "Boas-vindas" }]} filtros={filtros} opcoes={OPCOES} />
  )
}

describe("B22-15 — detalhe da execução com botão de fechar (M12)", () => {
  it("o detalhe tem 'Fechar', e ele fecha", async () => {
    abrir()
    fireEvent.click(screen.getByText("Boas-vindas", { selector: "button" }))
    const fechar = await screen.findByRole("button", { name: "Fechar" })
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(fechar)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("B22-16 — histórico no celular (M13)", () => {
  it("o contato aparece também embaixo do nome da automação, para o celular", () => {
    abrir()
    const celulaDaAutomacao = screen.getByText("Boas-vindas", { selector: "button" }).closest("td")!
    expect(celulaDaAutomacao.textContent).toContain("Ana Souza")
  })

  it("sem contato, a linha diz 'Sem contato'", () => {
    abrir([execucao({ contato: null })])
    const celulaDaAutomacao = screen.getByText("Boas-vindas", { selector: "button" }).closest("td")!
    expect(celulaDaAutomacao.textContent).toContain("Sem contato")
  })
})

describe("B22-17 — contato com link no histórico (M14)", () => {
  it("o nome do contato leva ao perfil dele", () => {
    abrir()
    const links = screen.getAllByRole("link", { name: "Ana Souza" })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link.getAttribute("href")).toBe("/contatos/c1")
  })

  it("clicar no contato não abre o detalhe da execução", () => {
    abrir()
    fireEvent.click(screen.getAllByRole("link", { name: "Ana Souza" })[0])
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("sem contato, não há link", () => {
    abrir([execucao({ contato: null })])
    expect(screen.queryAllByRole("link", { name: "Ana Souza" })).toHaveLength(0)
  })
})

describe("B22-20 — lista vazia por causa do filtro (M17)", () => {
  it("sem filtro: diz que não houve execução", () => {
    abrir([])
    expect(screen.getByText("Nenhuma execução nos últimos 30 dias")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull()
  })

  it("com filtro: diz que é o filtro, e 'Limpar filtros' tira automação e resultado e mantém o período", () => {
    push.mockClear()
    abrir([], { dias: 7, regraId: "r1", resultado: "falhou" })
    expect(screen.getByText("Nenhuma execução com esses filtros nos últimos 7 dias")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }))
    expect(push).toHaveBeenCalledWith("/configuracoes/automacoes/historico?dias=7")
  })
})

describe("B28-03 — a execução esperando e, depois, o caminho inteiro", () => {
  const posicaoDoBloco = { x: 0, y: 0 }
  const gatilhoDoCard = { id: "g", tipo: "gatilho" as const, gatilho: "card_movido" as const, parametros: { funil: "entrada" }, posicao: posicaoDoBloco }
  const blocoEspera = {
    id: "e",
    tipo: "espera" as const,
    tempo: { quantidade: "2", unidade: "dias" as const },
    recebeuMensagem: true,
    atendenteEnviou: false,
    limite: "30_dias" as const,
    posicao: posicaoDoBloco,
  }
  // 14:03 e 15:20 no horário de Brasília
  const desde = "2026-10-25T17:03:00.000Z"
  const em = "2026-10-25T18:20:00.000Z"

  it("CA-B28-21: esperando, diz o que espera e desde quando; depois, por onde saiu e a hora", async () => {
    const tela = abrir([
      execucao({ resultado: "esperando", caminho: [{ bloco: gatilhoDoCard }, { bloco: blocoEspera, desde }] }),
    ])
    fireEvent.click(screen.getByText("Boas-vindas", { selector: "button" }))
    expect(await screen.findByText("Esperando: recebeu mensagem ou 2 dias, desde 14:03")).toBeTruthy()
    tela.unmount()

    abrir([
      execucao({
        resultado: "concluida",
        caminho: [
          { bloco: gatilhoDoCard },
          { bloco: blocoEspera, desde, saida: "recebeu_mensagem", em },
          { bloco: { id: "a", tipo: "acao", acao: "resolver_conversa", parametros: {}, posicao: posicaoDoBloco }, ok: true },
        ],
      }),
    ])
    fireEvent.click(screen.getByText("Boas-vindas", { selector: "button" }))
    expect(await screen.findByText("Saiu por: recebeu mensagem, às 15:20")).toBeTruthy()
    expect(screen.queryByText(/^Esperando:/)).toBeNull()
    // O caminho inteiro: gatilho, a espera e a ação depois dela
    expect(within(screen.getByRole("dialog")).getAllByRole("listitem")).toHaveLength(3)
  })
})
