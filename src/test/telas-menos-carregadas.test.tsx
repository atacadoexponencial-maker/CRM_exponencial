// B48-19 — telas menos carregadas: filtros do Chat num seletor e um botão, um Editar
// só na ficha do contato, o painel do card aberto depois de mover, alertas agrupados
// por tipo e o filtro do Dashboard com os grupos separados. As actions são falsas.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"
import type { CardLead } from "@/app/(auth)/pipeline/mock-pipeline"
import type { CampoComValor } from "@/app/(auth)/contatos/campos-personalizados"
import type { AlertaComConversa } from "@/app/(auth)/alertas/actions"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const atualizarDadosContato = vi.fn(async () => ({}))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: (...a: unknown[]) => atualizarDadosContato(...(a as [])),
  adicionarTagContato: vi.fn(), removerTagContato: vi.fn(), listarTagsContato: vi.fn(async () => []), atualizarObservacoesContato: vi.fn(),
}))
const salvarCamposDoContato = vi.fn(async () => ({}))
vi.mock("@/app/(auth)/contatos/campos-personalizados", () => ({
  salvarCamposDoContato: (...a: unknown[]) => salvarCamposDoContato(...(a as [])),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({
  resumoExclusaoContato: vi.fn(), resumoExclusaoPorCard: vi.fn(), excluirContato: vi.fn(), excluirContatoPorCard: vi.fn(), restaurarContato: vi.fn(),
}))
const buscarDadosPainel = vi.fn()
const moverCard = vi.fn(async () => ({}))
vi.mock("@/app/(auth)/pipeline/actions", () => ({
  buscarDadosPainel: (...a: unknown[]) => buscarDadosPainel(...a),
  moverCard: (...a: unknown[]) => moverCard(...(a as [])),
  atribuirAtendente: vi.fn(), adicionarNota: vi.fn(), removerCardDoFunil: vi.fn(),
}))
vi.mock("@/app/(auth)/alertas/actions", () => ({ dispensarAlerta: vi.fn(), salvarConfigAlertas: vi.fn() }))

import { FiltrosCaixa } from "@/app/(auth)/chat/components/filtros-caixa"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"
import { PainelCard } from "@/app/(auth)/pipeline/components/painel-card"
import { AlertasClient } from "@/app/(auth)/alertas/alertas-client"
import { FiltroPorCampoControle } from "@/components/shared/filtro-por-campo"
import { CONFIG_ALERTAS_PADRAO } from "@/lib/alertas"

const VIP = { id: "e-vip", nome: "VIP", cor: "#f00" }
const conversa = (id: string, nome: string, status: Conversa["status"], atribuidaA: string | null, etiquetas: Conversa["etiquetas"] = []): Conversa => ({
  id, contato: { nome, telefone: `55119${id.padStart(8, "0")}`, contactId: null }, ultimaMensagem: { texto: "oi", horario: "10:00" },
  naoLidas: 0, status, etiquetas, atribuidaA, dataPrimeiroContato: "2026-10-20",
  canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
})
const CONVERSAS = [
  conversa("1", "Ana", "em_espera", "Admin", [VIP]),
  conversa("2", "Bruno", "em_atendimento", "Admin"),
  conversa("3", "Carla", "em_espera", "Outra"),
]
const caixa = (papel = "admin") =>
  render(<FiltrosCaixa conversas={CONVERSAS} conversaAtivaId={null} onConversaClick={vi.fn()} papel={papel} nomeUsuario="Admin" etiquetasDisponiveis={[VIP]} />)
const nomesNaLista = () => ["Ana", "Bruno", "Carla"].filter((n) => screen.queryByText(n))

const CAMPOS: CampoComValor[] = [{ id: "c-cnpj", nome: "CNPJ", tipo: "texto", opcoes: [], valor: null }]
const CONTATO: ContatoPerfil = {
  id: "c-1", nome: "Ana Souza", telefone: "5511999998888", classificacao: "ativo", tipo: null, cidade: null, atendente: null,
  created_at: "2026-10-20T10:00:00Z", perfilRfv: null, icp: null, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
}
const CARD: CardLead = {
  id: "card-1", contactId: null, contato: { nome: "Ana", telefone: "5511999990000" }, etapa: "lead", atendente: null,
  tempoNaEtapa: "3d", dataEntradaEtapa: "25/10/2026", tempoNoFunil: "3d", etiquetas: [], conversaId: null,
}
const alerta = (i: number, tipo: AlertaComConversa["tipo"], tipoLabel: string): AlertaComConversa => ({
  cardId: `card-${tipo}-${i}`, contactId: null, tipo, tipoLabel, contatoNome: `${tipoLabel} ${i}`, etapaLabel: "Lead",
  diasSemAtividade: 4, atendenteNome: null, referencia: "2026-10-24T10:00:00Z", conversaId: null,
})

beforeEach(() => vi.clearAllMocks())

describe("B48-19 — Telas menos carregadas", () => {
  it("CA-B48-46: should juntar \"Minhas / Meu time / Todas\" e o status num seletor só", () => {
    caixa()
    const mostrar = screen.getByRole("combobox", { name: "Mostrar" }) as HTMLSelectElement
    expect(Array.from(mostrar.querySelectorAll("optgroup")).map((g) => g.label)).toEqual(["Minhas", "Meu time", "Todas"])
    // os botões soltos de status e de visibilidade saíram
    for (const nome of ["Em espera", "Em atendimento", "Resolvidas", "Minhas", "Meu time"]) {
      expect(screen.queryByRole("button", { name: nome })).toBeNull()
    }
    expect(nomesNaLista()).toEqual(["Ana", "Bruno", "Carla"])
    fireEvent.change(mostrar, { target: { value: "minhas:em_espera" } })
    expect(nomesNaLista()).toEqual(["Ana"])
  })

  it("CA-B48-46: o Atendente não tem o grupo \"Todas\"", () => {
    caixa("atendente")
    const mostrar = screen.getByRole("combobox", { name: "Mostrar" })
    expect(Array.from(mostrar.querySelectorAll("optgroup")).map((g) => g.label)).toEqual(["Minhas", "Meu time"])
  })

  it("CA-B48-46: should deixar as etiquetas atrás do botão \"Etiquetas\"", () => {
    caixa()
    expect(screen.queryByRole("group", { name: "Etiquetas" })).toBeNull()
    const botao = screen.getByRole("button", { name: "Etiquetas" })
    expect(botao.getAttribute("aria-expanded")).toBe("false")
    fireEvent.click(botao)
    fireEvent.click(within(screen.getByRole("group", { name: "Etiquetas" })).getByRole("button", { name: "VIP" }))
    expect(nomesNaLista()).toEqual(["Ana"])
    expect(screen.getByRole("button", { name: "Etiquetas · VIP" })).toBeTruthy()
  })

  it("CA-B48-47: should abrir dados e campos personalizados num Editar só, com um Salvar", async () => {
    render(<PerfilContato contato={CONTATO} papel="admin" contactId="c-1" camposPersonalizados={CAMPOS} />)
    expect(screen.queryByRole("button", { name: "Editar campos personalizados" })).toBeNull()
    const dados = screen.getByText("Dados do contato").closest("section") as HTMLElement
    fireEvent.click(within(dados).getByRole("button", { name: "Editar" }))
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "Niterói" } })
    fireEvent.change(screen.getByLabelText("CNPJ"), { target: { value: "12.345.678/0001-90" } })
    expect(screen.getAllByRole("button", { name: "Salvar" })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))
    await waitFor(() => expect(salvarCamposDoContato).toHaveBeenCalled())
    expect(atualizarDadosContato).toHaveBeenCalledWith("c-1", expect.objectContaining({ cidade: "Niterói" }))
    expect(salvarCamposDoContato).toHaveBeenCalledWith("c-1", expect.objectContaining({ "c-cnpj": expect.anything() }))
    await waitFor(() => expect(screen.queryByLabelText("CNPJ")).toBeNull())
  })

  it("CA-B48-48: should manter o painel aberto ao mover, com a etapa nova e o histórico atualizado", async () => {
    buscarDadosPainel
      .mockResolvedValueOnce({ historico: [], notas: [] })
      .mockResolvedValueOnce({ historico: [{ deEtapa: "Lead", etapa: "Sondagem", data: "28/10/2026 10:00" }], notas: [] })
    const onFechar = vi.fn()
    const onMover = vi.fn()
    render(<PainelCard card={CARD} onFechar={onFechar} onMover={onMover} papel="admin" />)
    await screen.findByText(/Ainda sem movimentação/)
    fireEvent.click(screen.getByRole("button", { name: /Mover para etapa/ }))
    fireEvent.click(screen.getByRole("button", { name: "Sondagem" }))
    await waitFor(() => expect(screen.getByText("→")).toBeTruthy())
    expect(moverCard).toHaveBeenCalledWith("card-1", "sondagem")
    expect(onFechar).not.toHaveBeenCalled()
    expect(onMover).toHaveBeenCalled()
    expect(screen.getByText("Etapa:").nextElementSibling?.textContent).toBe("Sondagem")
    expect(screen.queryByText(/Ainda sem movimentação/)).toBeNull()
  })

  it("CA-B48-49: should agrupar os alertas por tipo, com \"Ver mais\"", () => {
    const leads = Array.from({ length: 46 }, (_, i) => alerta(i, "lead_sem_resposta", "Lead sem resposta"))
    render(<AlertasClient alertasIniciais={[...leads, alerta(0, "card_parado", "Card parado")]} configInicial={CONFIG_ALERTAS_PADRAO} papel="admin" />)
    const grupo = screen.getByRole("region", { name: "Lead sem resposta" })
    expect(within(grupo).getByRole("heading").textContent).toContain("46")
    expect(within(grupo).getAllByRole("button", { name: "Dispensar" })).toHaveLength(5)
    fireEvent.click(within(grupo).getByRole("button", { name: "Ver mais 41" }))
    expect(within(grupo).getAllByRole("button", { name: "Dispensar" })).toHaveLength(46)
    expect(within(screen.getByRole("region", { name: "Card parado" })).getAllByRole("button", { name: "Dispensar" })).toHaveLength(1)
  })

  it("CA-B48-49: should separar no filtro do Dashboard os grupos de contato dos campos", () => {
    render(
      <FiltroPorCampoControle
        campos={[{ id: "f-1", nome: "Segmento", tipo: "lista", opcoes: [{ id: "o-1", nome: "Varejo" }] } as never]}
        valor={null}
        onChange={vi.fn()}
      />
    )
    const select = screen.getByRole("combobox", { name: "Campo personalizado" })
    const grupos = Array.from(select.querySelectorAll("optgroup")).map((g) => ({
      label: g.label,
      opcoes: Array.from(g.querySelectorAll("option")).map((o) => o.textContent),
    }))
    expect(grupos).toEqual([
      { label: "Contatos", opcoes: ["Todos os contatos"] },
      { label: "Por campo personalizado", opcoes: ["Segmento"] },
    ])
  })
})
