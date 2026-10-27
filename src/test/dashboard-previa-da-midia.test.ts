// B46-05: "Esperando resposta" no Dashboard resume a mídia como o Chat, sem o
// endereço do arquivo.

import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))

import { sessaoAtual } from "@/lib/sessao"
import { listarEsperandoResposta } from "@/app/(auth)/dashboard/actions"

const ENDERECO = "https://abc.supabase.co/storage/v1/object/sign/midia/audio.ogg?token=x"

function comLinhas(linhas: Array<{ trecho: string | null; tipo: string | null }>) {
  const rpc = vi.fn(async () => ({
    data: linhas.map((l, i) => ({
      conversa_id: `c${i}`,
      contato_nome: `Contato ${i}`,
      telefone: null,
      desde: "2026-10-27T15:00:00.000Z",
      funil: "entrada",
      ...l,
    })),
    error: null,
  }))
  vi.mocked(sessaoAtual).mockResolvedValue({ supabase: { rpc }, user: { id: "u1" } } as never)
}

describe("B46-05: prévia da mídia no Dashboard", () => {
  it("CA-B46-10: áudio aparece como Áudio, sem o endereço", async () => {
    comLinhas([{ tipo: "audio", trecho: ENDERECO }])
    const { conversas } = await listarEsperandoResposta()
    expect(conversas[0].trecho).toBe("🎤 Áudio")
    expect(conversas[0].trecho).not.toContain("https://")
  })

  it("CA-B46-10: foto, vídeo e documento também pelo tipo; texto como veio", async () => {
    comLinhas([
      { tipo: "imagem", trecho: ENDERECO },
      { tipo: "video", trecho: ENDERECO },
      { tipo: "documento", trecho: ENDERECO },
      { tipo: "texto", trecho: "Oi, tem a calça 42?" },
    ])
    const { conversas } = await listarEsperandoResposta()
    expect(conversas.map((c) => c.trecho)).toEqual(["📷 Foto", "🎥 Vídeo", "📄 Documento", "Oi, tem a calça 42?"])
  })
})
