// B22-32 — arquivo acima de 4 MB na ação "enviar imagem ou documento" (baixo do
// QA das automações, 09/10/2026): a tela avisa antes de subir; antes, o Next
// recusava a requisição com erro 500.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import { LIMITE_DO_ARQUIVO } from "@/lib/automacoes/referencias"
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

function abrir() {
  const guardarArquivo = vi.fn(async () => ({ arquivo: { url: "u", nome: "n", tipo: "imagem" as const } }))
  render(
    <PainelBloco
      bloco={{ id: "a", tipo: "acao", acao: "enviar_midia", parametros: {}, posicao: { x: 0, y: 0 } }}
      gatilho="conversa_criada"
      repeticao={{ modo: "sempre" }}
      onMudarRepeticao={vi.fn()}
      opcoes={OPCOES}
      pendencias={[]}
      guardarArquivo={guardarArquivo}
      onMudar={vi.fn()}
      onRemover={vi.fn()}
      onDuplicar={vi.fn()}
      onFechar={vi.fn()}
    />
  )
  return { guardarArquivo, campo: document.querySelector('input[type="file"]') as HTMLInputElement }
}

const arquivoDe = (tamanho: number) => {
  const arquivo = new File(["x"], "tabela.pdf", { type: "application/pdf" })
  Object.defineProperty(arquivo, "size", { value: tamanho })
  return arquivo
}

describe("B22-32 — arquivo grande demais", () => {
  it("acima do limite: avisa e não sobe", () => {
    const { guardarArquivo, campo } = abrir()
    fireEvent.change(campo, { target: { files: [arquivoDe(LIMITE_DO_ARQUIVO + 1)] } })
    expect(screen.getByText("Arquivo muito grande (máximo 4 MB).")).toBeTruthy()
    expect(guardarArquivo).not.toHaveBeenCalled()
  })

  it("dentro do limite: sobe", () => {
    const { guardarArquivo, campo } = abrir()
    fireEvent.change(campo, { target: { files: [arquivoDe(LIMITE_DO_ARQUIVO)] } })
    expect(guardarArquivo).toHaveBeenCalledTimes(1)
  })
})
