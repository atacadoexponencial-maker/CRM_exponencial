// B43-03 — o gatilho "Entrou no perfil RFV" no editor de automações: o horário nasce
// em 9h, destino e origem são caixas de marcar, e sem destino o painel avisa.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { pendenciasDoFluxo, type BlocoGatilho, type Fluxo } from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"

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

const gatilho = (tipo: BlocoGatilho["gatilho"], parametros: Record<string, string>): BlocoGatilho => ({
  id: "g",
  tipo: "gatilho",
  gatilho: tipo,
  parametros,
  posicao: { x: 0, y: 0 },
})

function abrir(bloco: BlocoGatilho, pendencias: string[] = []) {
  const onMudar = vi.fn()
  const tela = render(
    <PainelBloco
      bloco={bloco}
      gatilho={bloco.gatilho}
      repeticao={{ modo: "sempre" }}
      onMudarRepeticao={vi.fn()}
      opcoes={OPCOES}
      pendencias={pendencias}
      guardarArquivo={vi.fn()}
      onMudar={onMudar}
      onRemover={vi.fn()}
      onDuplicar={vi.fn()}
      onFechar={vi.fn()}
    />
  )
  return { onMudar, tela }
}

const grupo = (nome: string) => screen.getByRole("group", { name: nome })
const ultimo = (onMudar: ReturnType<typeof vi.fn>) => onMudar.mock.calls.at(-1)![0] as BlocoGatilho

describe("B43-03 — gatilho Entrou no perfil RFV no editor", () => {
  it("CA-B43-13: should nascer às 9h e guardar destino e origem marcados, que voltam marcados ao abrir de novo", async () => {
    // Escolher o gatilho já traz o horário 9h
    const primeiro = abrir(gatilho("card_movido", { funil: "entrada" }))
    fireEvent.click(screen.getByRole("combobox", { name: "Quando" }))
    // O item do Select do Base UI só confirma a escolha destacado, como com o mouse em cima
    const opcao = await screen.findByRole("option", { name: "Entrou no perfil RFV" })
    fireEvent.mouseMove(opcao)
    fireEvent.pointerMove(opcao, { pointerType: "mouse" })
    await waitFor(() => expect(opcao.hasAttribute("data-highlighted")).toBe(true))
    fireEvent.click(opcao)
    await waitFor(() => expect(primeiro.onMudar).toHaveBeenCalled())
    const escolhido = ultimo(primeiro.onMudar)
    expect(escolhido.gatilho).toBe("entrou_perfil_rfv")
    expect(escolhido.parametros).toEqual({ hora: "9" })
    primeiro.tela.unmount()

    // Marca Em Risco no destino
    const segundo = abrir(escolhido)
    expect(screen.getByRole("combobox", { name: "Horário de disparo" }).textContent).toContain("9h")
    fireEvent.click(within(grupo("Perfis de destino")).getByRole("checkbox", { name: "🔥 Em Risco" }))
    const comDestino = ultimo(segundo.onMudar)
    expect(comDestino.parametros).toEqual({ hora: "9", destinos: "em_risco" })
    segundo.tela.unmount()

    // Marca Campeão em "Vindo de"; Em Risco, que é destino, não dá para marcar lá
    const terceiro = abrir(comDestino)
    const origem = grupo("Vindo de (opcional)")
    expect((within(origem).getByRole("checkbox", { name: "🔥 Em Risco" }) as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(within(origem).getByRole("checkbox", { name: "🏆 Campeão" }))
    const salvo = ultimo(terceiro.onMudar)
    expect(salvo.parametros).toEqual({ hora: "9", destinos: "em_risco", origens: "campeao" })
    terceiro.tela.unmount()

    // Aberto de novo: o que foi marcado continua marcado
    abrir(salvo)
    const marcados = (nome: string) =>
      (within(grupo(nome)).getAllByRole("checkbox") as HTMLInputElement[]).filter((c) => c.checked).map((c) => c.parentElement!.textContent)
    expect(marcados("Perfis de destino")).toEqual(["🔥 Em Risco"])
    expect(marcados("Vindo de (opcional)")).toEqual(["🏆 Campeão"])
    expect(screen.getByRole("combobox", { name: "Horário de disparo" }).textContent).toContain("9h")
  })

  it("CA-B43-14: should avisar no painel que falta escolher ao menos um perfil de destino", () => {
    const bloco = gatilho("entrou_perfil_rfv", { hora: "9" })
    const fluxo: Fluxo = {
      blocos: [bloco, { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "x" }, posicao: { x: 0, y: 0 } }],
      ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
    }
    const pendencias = pendenciasDoFluxo(fluxo).porBloco["g"] ?? []
    expect(pendencias).toContain("Escolha ao menos um perfil de destino.")

    abrir(bloco, pendencias)
    expect(screen.getByText("Escolha ao menos um perfil de destino.")).toBeTruthy()
  })
})
