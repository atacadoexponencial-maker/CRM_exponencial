// B38-04 — campos personalizados no editor de automações: a ação aponta o valor fora do
// formato do campo, e a condição oferece o campo, as comparações do tipo e as opções.
// O servidor é conferido em campos-personalizados-automacoes.integration.test.ts.

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { Bloco, BlocoAcao, BlocoCondicao } from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { fraseBloco } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
import { PainelBloco } from "@/app/(auth)/configuracoes/automacoes/components/painel-bloco"

const LIMITE = { id: "11111111-1111-4111-8111-111111111111", nome: "Limite de crédito", tipo: "dinheiro", opcoes: [] }
const PORTE = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Porte",
  tipo: "lista",
  opcoes: [{ id: "33333333-3333-4333-8333-333333333333", nome: "Pequeno" }, { id: "44444444-4444-4444-8444-444444444444", nome: "Grande" }],
}

const OPCOES: OpcoesEditor = {
  etiquetas: [],
  atendentes: [],
  tags: [],
  times: [],
  sequencias: [],
  mensagensRapidas: [],
  numeros: [],
  horarioComercial: HORARIO_PADRAO,
  camposPersonalizados: [LIMITE, PORTE],
}

function abrir(bloco: Bloco, onMudar = vi.fn()) {
  render(
    <PainelBloco
      bloco={bloco}
      gatilho="tag_adicionada"
      repeticao={{ modo: "sempre" }}
      onMudarRepeticao={vi.fn()}
      opcoes={OPCOES}
      pendencias={[]}
      guardarArquivo={vi.fn()}
      onMudar={onMudar}
      onRemover={vi.fn()}
      onDuplicar={vi.fn()}
      onFechar={vi.fn()}
    />
  )
  return onMudar
}

describe("B38-04 — campos personalizados no editor de automações", () => {
  it("CA-B38-40: should apontar o valor fora do formato na ação Alterar dado do contato", () => {
    const acao: BlocoAcao = {
      id: "a",
      tipo: "acao",
      acao: "alterar_dado_contato",
      parametros: { campo: `campo:dinheiro:${LIMITE.id}`, valor: "muito" },
      posicao: { x: 0, y: 0 },
    }
    abrir(acao)
    expect(screen.getByText("Digite um valor em reais, com até 2 casas depois da vírgula.")).toBeInTheDocument()
    expect(fraseBloco(acao, OPCOES)).toBe('Limite de crédito do contato = "muito"')
  })

  it("CA-B38-38: should oferecer o campo, as comparações da lista e as opções na condição", async () => {
    const condicao: BlocoCondicao = {
      id: "c",
      tipo: "condicao",
      verificacoes: [{ id: "v", tipo: "campo_personalizado", operador: "", valor: "" }],
      posicao: { x: 0, y: 0 },
    }
    const onMudar = abrir(condicao)
    fireEvent.click(screen.getByRole("combobox", { name: "Campo" }))
    // O item do Select do Base UI só confirma a escolha destacado, como com o mouse em cima
    const porte = await screen.findByRole("option", { name: "Porte" })
    fireEvent.mouseMove(porte)
    fireEvent.pointerMove(porte, { pointerType: "mouse" })
    await waitFor(() => expect(porte.hasAttribute("data-highlighted")).toBe(true))
    fireEvent.click(porte)
    await waitFor(() => expect(onMudar).toHaveBeenCalled())
    const escolhido = onMudar.mock.calls.at(-1)![0] as BlocoCondicao
    expect(escolhido.verificacoes[0]).toMatchObject({ campo: `campo:lista:${PORTE.id}`, operador: "qualquer_de", valor: "" })

    const comValor: BlocoCondicao = {
      ...condicao,
      verificacoes: [{ id: "v", tipo: "campo_personalizado", campo: `campo:lista:${PORTE.id}`, operador: "qualquer_de", valor: PORTE.opcoes[1].id }],
    }
    expect(fraseBloco(comValor, OPCOES)).toBe("Se Porte é qualquer um de Grande")
  })
})
