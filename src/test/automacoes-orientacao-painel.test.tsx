// B22-34 — orientação no painel (baixos do QA das automações, 09/10/2026): lista
// da empresa vazia diz onde criar, "alterar dado" sem valor não mostra `= ""`, e
// o espaço tirado da tag é avisado.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { Bloco } from "@/lib/fluxo-automacao"
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

const posicao = { x: 0, y: 0 }

function abrir(bloco: Bloco, onMudar = vi.fn()) {
  render(
    <PainelBloco
      bloco={bloco}
      gatilho="conversa_criada"
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

describe("B22-34 — orientação no painel", () => {
  // B28-06: era com "Iniciar sequência", que saiu; o comportamento é o mesmo nas outras listas
  it("'Enviar mensagem rápida' sem nenhuma mensagem rápida diz onde criar", () => {
    abrir({ id: "a", tipo: "acao", acao: "enviar_mensagem_rapida", parametros: {}, posicao })
    expect(screen.getByText("Nenhuma mensagem rápida criada ainda.")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Criar em Mensagens rápidas" }).getAttribute("href")).toBe(
      "/configuracoes/mensagens-rapidas"
    )
  })

  it("'Alterar dado' sem valor não mostra '= \"\"'", () => {
    const bloco: Bloco = { id: "a", tipo: "acao", acao: "alterar_dado_contato", parametros: { campo: "cidade" }, posicao }
    expect(fraseBloco(bloco, OPCOES)).toBe("Alterar cidade do contato")
  })

  it("tag com espaço: tira o espaço e avisa", () => {
    const onMudar = abrir({ id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "" }, posicao })
    fireEvent.change(screen.getByPlaceholderText("ex.: interessado"), { target: { value: "cliente vip" } })
    expect(onMudar).toHaveBeenCalledWith(expect.objectContaining({ parametros: { tag: "clientevip" } }))
    expect(screen.getByText(/Tag não tem espaço/)).toBeTruthy()
  })
})
