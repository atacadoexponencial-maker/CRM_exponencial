// Pista 10 da auditoria run-2: com o e-mail no limite de senhas erradas, o servidor pede
// a conferência humana em vez de travar. A tela só mostra a conferência depois do pedido
// e manda a conferência na tentativa seguinte. Action e Turnstile falsos; nenhuma rede.

import { Suspense, useEffect } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

let conferenciasGeradas = 0
let desafioFalha = false
// O Turnstile não roda fora do navegador: cada vez que é (re)montado, sai uma conferência
// nova, ou nenhuma, quando o desafio falha (Cloudflare bloqueada no navegador)
vi.mock("@/components/shared/conferencia-humana", () => ({
  ConferenciaHumana: ({ aoMudar, aoAguardar, reinicio }: { aoMudar: (t: string | null) => void; aoAguardar: (a: boolean) => void; reinicio: number }) => {
    useEffect(() => {
      conferenciasGeradas++
      aoMudar(desafioFalha ? null : `conferencia-${conferenciasGeradas}`)
      aoAguardar(false)
    }, [aoMudar, aoAguardar, reinicio])
    return <div data-testid="conferencia-humana" />
  },
}))
vi.mock("@/app/login/actions", () => ({ realizarLogin: vi.fn() }))

import { realizarLogin } from "@/app/login/actions"
import { AVISO_CONFIRME_QUE_E_PESSOA, AVISO_CONTA_DESATIVADA } from "@/app/login/avisos"
import LoginPage from "@/app/login/page"

const login = vi.mocked(realizarLogin)

afterEach(() => {
  vi.clearAllMocks()
  conferenciasGeradas = 0
  desafioFalha = false
})

async function abrir() {
  await act(async () => {
    render(
      <Suspense>
        <LoginPage searchParams={Promise.resolve({})} />
      </Suspense>
    )
  })
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@empresa.com" } })
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo" } })
}

async function clicarEmEntrar() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))
  })
}

describe("login pede a conferência humana quando o servidor pede", () => {
  it("should não mostrar a conferência nem mandá-la antes do pedido", async () => {
    login.mockResolvedValue({ erro: "E-mail ou senha incorretos" })
    await abrir()

    await clicarEmEntrar()

    expect(screen.queryByTestId("conferencia-humana")).toBeNull()
    expect(login).toHaveBeenCalledWith("ana@empresa.com", "segredo", null, null)
  })

  it("should mostrar a conferência e mandá-la na tentativa seguinte", async () => {
    login.mockResolvedValueOnce({ erro: AVISO_CONFIRME_QUE_E_PESSOA, pedirConferencia: true })
    await abrir()

    await clicarEmEntrar()

    expect(screen.getByText(AVISO_CONFIRME_QUE_E_PESSOA)).toBeInTheDocument()
    expect(screen.getByTestId("conferencia-humana")).toBeInTheDocument()

    login.mockResolvedValueOnce({ erro: "E-mail ou senha incorretos", pedirConferencia: true })
    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "conferencia-1")

    // A conferência vale para um envio só: a próxima tentativa leva uma nova
    login.mockResolvedValueOnce({ erro: "E-mail ou senha incorretos", pedirConferencia: true })
    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "conferencia-2")
  })

  it("should trocar a conferência também depois de erro sem pedido e de falha de rede", async () => {
    login.mockResolvedValueOnce({ erro: AVISO_CONFIRME_QUE_E_PESSOA, pedirConferencia: true })
    await abrir()
    await clicarEmEntrar()

    login.mockResolvedValueOnce({ erro: AVISO_CONTA_DESATIVADA })
    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "conferencia-1")

    login.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "conferencia-2")

    login.mockResolvedValueOnce({ erro: "E-mail ou senha incorretos", pedirConferencia: true })
    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "conferencia-3")
  })

  it("should mandar a conferência vazia quando o desafio falha no navegador", async () => {
    desafioFalha = true
    login.mockResolvedValue({ erro: AVISO_CONFIRME_QUE_E_PESSOA, pedirConferencia: true })
    await abrir()
    await clicarEmEntrar()

    await clicarEmEntrar()
    expect(login).toHaveBeenLastCalledWith("ana@empresa.com", "segredo", null, "")
  })
})
