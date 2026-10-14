// B22-09 — repetição padrão da regra nova por gatilho e a frase que o bloco do
// gatilho mostra. A troca da repetição junto com o gatilho, no editor, é
// conferida no preview (e2e/preview/roteiro-b22-09.cjs).

import { describe, it, expect, vi } from "vitest"
import { GATILHOS_DE_MENSAGEM, repeticaoPadrao, type GatilhoTipo } from "@/lib/fluxo-automacao"
import { fraseRepeticao } from "@/app/(auth)/configuracoes/automacoes/components/frases-fluxo"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { buscarRegraParaEditor } from "@/app/(auth)/configuracoes/automacoes/actions"

const OUTROS_GATILHOS: GatilhoTipo[] = [
  "conversa_criada",
  "card_movido",
  "tag_adicionada",
  "etiqueta_aplicada",
  "dado_contato_alterado",
]

describe("B22-09 — repetição padrão da regra nova", () => {
  it.each(GATILHOS_DE_MENSAGEM)("gatilho de mensagem (%s): sempre", (gatilho) => {
    expect(repeticaoPadrao(gatilho)).toEqual({ modo: "sempre" })
  })

  it.each(OUTROS_GATILHOS)("outro gatilho (%s): uma vez por contato", (gatilho) => {
    expect(repeticaoPadrao(gatilho)).toEqual({ modo: "uma_vez_por_contato" })
  })

  it("regra nova abre com 'card movido' e a repetição dele", async () => {
    vi.mocked(sessaoAtual).mockResolvedValue({
      supabase: {},
      user: { id: "admin-1" },
      perfil: { role: "admin", workspace_id: "ws-1" },
    } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)
    const resposta = await buscarRegraParaEditor("nova")
    expect(resposta).toMatchObject({
      regra: {
        id: null,
        fluxo: { blocos: [{ tipo: "gatilho", gatilho: "card_movido" }] },
        repeticao: { modo: "uma_vez_por_contato" },
      },
    })
  })
})

describe("B22-09 — frase da repetição no bloco do gatilho", () => {
  it("uma frase para cada modo", () => {
    expect(fraseRepeticao({ modo: "uma_vez_por_contato" })).toBe("Repetição: uma vez por contato")
    expect(fraseRepeticao({ modo: "sempre" })).toBe("Repetição: sempre")
    expect(fraseRepeticao({ modo: "a_cada_horas", horas: 24 })).toBe("Repetição: no máximo a cada 24 horas")
    expect(fraseRepeticao({ modo: "a_cada_horas", horas: 1 })).toBe("Repetição: no máximo a cada 1 hora")
  })
})
