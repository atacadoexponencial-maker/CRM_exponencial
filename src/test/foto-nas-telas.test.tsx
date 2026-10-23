// B29-03 — a foto de perfil onde antes só havia iniciais: lista do chat, ficha e
// perfil do contato. Sem foto, tudo como antes.

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Conversa } from "@/app/(auth)/chat/mock-conversas"
import type { ContatoPerfil } from "@/app/(auth)/contatos/mock-contatos"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  atualizarDadosContato: vi.fn(),
  adicionarTagContato: vi.fn(),
  removerTagContato: vi.fn(),
  atualizarObservacoesContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({
  resumoExclusaoContato: vi.fn(),
  excluirContato: vi.fn(),
  restaurarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/chat/actions", () => ({
  buscarInfoContato: vi.fn(async () => ({ dataPrimeiroContato: "20 de out.", cadastro: { contactId: "c-1", classificacao: "lead", tipo: null, cidade: null, icp: null, atendente: null, tags: [], funis: [] } })),
  atualizarNomeContato: vi.fn(),
}))

import { ItemConversa } from "@/app/(auth)/chat/components/item-conversa"
import { PainelContato } from "@/app/(auth)/chat/components/painel-contato"
import { PerfilContato } from "@/app/(auth)/contatos/[id]/components/perfil-contato"

const FOTO = "https://storage.teste/sign/contact-photos/ws/c-1.jpg?token=abc"

function conversa(contato: Conversa["contato"]): Conversa {
  return {
    id: "conv-1",
    contato,
    ultimaMensagem: { texto: "oi", horario: "10:00" },
    naoLidas: 0,
    status: "em_atendimento",
    etiquetas: [],
    atribuidaA: null,
    dataPrimeiroContato: "20/10/2026",
    canal: { id: null, nome: null, numero: null, recursos: { templates: true, midia: true, marcar_lida: true } },
  }
}

function perfil(fotoUrl: string | null, nome = "Ana Souza"): ContatoPerfil {
  return {
    id: "c-1", nome, telefone: "5511999998888", classificacao: "lead", tipo: null, cidade: null, atendente: null,
    created_at: "2026-10-20T00:00:00Z", icp: null, fotoUrl, tags: [], observacoes: "", conversaId: null, cards: [], compras: [], timeline: [],
  }
}

describe("B29-03 — foto nas telas", () => {
  it("CA-B29-13: a lista de conversas mostra a foto, com o nome do contato como texto alternativo", () => {
    render(<ItemConversa conversa={conversa({ nome: "Ana Souza", telefone: "5511999998888", contactId: "c-1", fotoUrl: FOTO })} ativa={false} onClick={vi.fn()} eMinhaConversa={false} />)

    const img = screen.getByRole("img", { name: "Ana Souza" })
    expect(img.getAttribute("src")).toBe(FOTO)
  })

  it("CA-B29-15: sem foto, a lista e a ficha mostram as iniciais ou, sem nome, o ícone de pessoa", async () => {
    const { container, unmount } = render(<ItemConversa conversa={conversa({ nome: "Ana Souza", telefone: "5511999998888", contactId: "c-1", fotoUrl: null })} ativa={false} onClick={vi.fn()} eMinhaConversa={false} />)
    expect(container.querySelector("img")).toBeNull()
    expect(container.textContent).toContain("AS")
    unmount()

    const semNome = render(<ItemConversa conversa={conversa({ nome: null, telefone: "5511999998888", contactId: "c-1" })} ativa={false} onClick={vi.fn()} eMinhaConversa={false} />)
    expect(semNome.container.querySelector("img")).toBeNull()
    expect(screen.getByLabelText("Contato sem nome")).toBeTruthy()
    semNome.unmount()

    const ficha = render(<PainelContato conversa={conversa({ nome: "Ana Souza", telefone: "5511999998888", contactId: "c-1", fotoUrl: null })} conversaId="conv-1" onFechar={vi.fn()} onConversaAtualizada={vi.fn()} />)
    expect(ficha.container.querySelector("img")).toBeNull()
    expect(ficha.container.textContent).toContain("AS")
  })

  it("CA-B29-19: o perfil mostra a foto no cabeçalho; sem foto, as iniciais", () => {
    const com = render(<PerfilContato contato={perfil(FOTO)} papel="admin" />)
    expect(com.getByRole("img", { name: "Ana Souza" }).getAttribute("src")).toBe(FOTO)
    com.unmount()

    const sem = render(<PerfilContato contato={perfil(null)} papel="admin" />)
    expect(sem.container.querySelector("img")).toBeNull()
    expect(sem.container.textContent).toContain("AS")
  })
})
