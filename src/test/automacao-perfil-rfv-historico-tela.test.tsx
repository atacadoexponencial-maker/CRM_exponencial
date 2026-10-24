// B43-04 — a execução de uma automação "Entrou no perfil RFV" no histórico: a tela
// descreve de qual perfil para qual o contato foi.

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { HORARIO_PADRAO } from "@/lib/horario-comercial"
import type { ExecucaoListada, FiltrosDoHistorico } from "@/app/(auth)/configuracoes/automacoes/actions"
import type { OpcoesEditor } from "@/app/(auth)/configuracoes/automacoes/components/catalogo"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

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

const execucao = (evento: Record<string, string>): ExecucaoListada => ({
  id: "e1",
  quando: "2026-10-24T13:00:00.000Z",
  regraId: "r1",
  regraNome: "Reativar",
  regraExcluida: false,
  contato: { id: "c1", nome: "Ana Souza" },
  evento,
  resultado: "concluida",
  motivo: null,
  caminho: [],
})

describe("B43-04 — histórico do disparo por perfil", () => {
  it("CA-B43-23: should mostrar a execução da Ana como Entrou em Em Risco (vindo de Campeão)", () => {
    render(
      <HistoricoClient
        execucoes={[
          execucao({ tipo: "entrou_perfil_rfv", de: "campeao", para: "em_risco", mudancaId: "m1" }),
          { ...execucao({ tipo: "entrou_perfil_rfv", de: "sem_compras", para: "recentes", mudancaId: "m2" }), id: "e2" },
        ]}
        regras={[{ id: "r1", nome: "Reativar" }]}
        filtros={TODAS}
        opcoes={OPCOES}
      />
    )
    expect(screen.getByText("Entrou em Em Risco (vindo de Campeão)")).toBeTruthy()
    expect(screen.getByText("Entrou em Clientes Recentes (vindo de Sem compras)")).toBeTruthy()
  })
})
