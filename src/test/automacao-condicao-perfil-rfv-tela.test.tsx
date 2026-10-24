// B43-02 — a condição "Perfil RFV" no editor de automações: caixas com os onze perfis
// e "Sem compras"; o valor marcado volta marcado ao abrir de novo.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { BlocoCondicao } from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"
import { fraseBloco } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"
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

const condicao = (valor: string): BlocoCondicao => ({
  id: "c",
  tipo: "condicao",
  verificacoes: [{ id: "v", tipo: "perfil_rfv", operador: "e_um_de", valor }],
  posicao: { x: 0, y: 0 },
})

function abrir(bloco: BlocoCondicao, onMudar = vi.fn()) {
  const tela = render(
    <PainelBloco
      bloco={bloco}
      gatilho="mensagem_recebida"
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
  return { onMudar, tela }
}

const caixas = () => within(screen.getByRole("group", { name: "Valor" })).getAllByRole("checkbox") as HTMLInputElement[]
const caixa = (nome: string) => screen.getByRole("checkbox", { name: nome }) as HTMLInputElement

describe("B43-02 — condição Perfil RFV no editor", () => {
  it("CA-B43-15: should marcar Campeão e Clientes Fiéis, gravar os dois e mostrá-los marcados ao abrir de novo", () => {
    const { onMudar, tela } = abrir(condicao(""))
    expect(caixas()).toHaveLength(12)
    expect(caixa("Sem compras")).toBeTruthy()

    fireEvent.click(caixa("🏆 Campeão"))
    const comCampeao = onMudar.mock.calls.at(-1)![0] as BlocoCondicao
    expect(comCampeao.verificacoes[0].valor).toBe("campeao")
    tela.unmount()

    const segundo = abrir(comCampeao)
    fireEvent.click(caixa("💎 Clientes Fiéis"))
    const comOsDois = segundo.onMudar.mock.calls.at(-1)![0] as BlocoCondicao
    expect(comOsDois.verificacoes[0].valor).toBe("campeao,fieis")
    segundo.tela.unmount()

    // Aberto de novo com o que foi gravado: os dois marcados, o resto não.
    abrir(comOsDois)
    expect(caixas().filter((c) => c.checked).map((c) => c.parentElement!.textContent)).toEqual(["🏆 Campeão", "💎 Clientes Fiéis"])
    expect(fraseBloco(comOsDois, OPCOES)).toContain("🏆 Campeão, 💎 Clientes Fiéis")
  })
})
