// Pendência 6: no login certo, o redirect da action chega à tela como erro e
// o aviso "Não foi possível entrar" piscava antes da página seguinte abrir.
// O redirect tem que passar adiante (o Next faz a troca de página); só falha
// de verdade mostra o aviso. Action falsa; nenhuma rede.

import { Suspense } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { redirect } from "next/navigation"

vi.mock("@/app/login/actions", () => ({ realizarLogin: vi.fn() }))

import { realizarLogin } from "@/app/login/actions"
import LoginPage from "@/app/login/page"

const login = vi.mocked(realizarLogin)

// O redirect devolvido sai do formulário como rejeição sem dono — no navegador,
// o Next a recolhe e navega. Aqui, guardamos para conferir.
let rejeicoes: unknown[] = []
let ouvintesDoVitest: NodeJS.UnhandledRejectionListener[] = []
const guardar = (motivo: unknown) => { rejeicoes.push(motivo) }

beforeEach(() => {
  rejeicoes = []
  ouvintesDoVitest = process.listeners("unhandledRejection")
  process.removeAllListeners("unhandledRejection")
  process.on("unhandledRejection", guardar)
})

afterEach(() => {
  process.removeAllListeners("unhandledRejection")
  ouvintesDoVitest.forEach((ouvinte) => process.on("unhandledRejection", ouvinte))
  vi.clearAllMocks()
})

async function entrar() {
  await act(async () => {
    render(
      <Suspense>
        <LoginPage searchParams={Promise.resolve({})} />
      </Suspense>
    )
  })
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@empresa.com" } })
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo" } })
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))
  })
  // Deixa a rejeição do formulário chegar ao processo.
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

describe("login sem aviso falso", () => {
  it("login certo: o redirect passa adiante e nenhum aviso aparece", async () => {
    login.mockImplementation(async () => redirect("/perfil"))

    await entrar()

    expect(screen.queryByText(/não foi possível entrar/i)).toBeNull()
    expect(screen.getByRole("button", { name: /entrando/i })).toBeDisabled()
    expect(rejeicoes.some(isRedirectError)).toBe(true)
  })

  it("senha errada continua mostrando o aviso", async () => {
    login.mockResolvedValue({ erro: "E-mail ou senha incorretos" })

    await entrar()

    expect(screen.getByText("E-mail ou senha incorretos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^entrar$/i })).toBeEnabled()
  })

  it("falha de rede continua mostrando 'Não foi possível entrar'", async () => {
    login.mockRejectedValue(new TypeError("Failed to fetch"))

    await entrar()

    expect(screen.getByText(/não foi possível entrar/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^entrar$/i })).toBeEnabled()
    expect(rejeicoes).toHaveLength(0)
  })
})
