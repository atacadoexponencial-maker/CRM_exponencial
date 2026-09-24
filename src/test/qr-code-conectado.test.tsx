// Tela do QR Code quando o celular termina de ler o código: ela precisa sair,
// recarregar a lista e avisar. Só o selo mudando parecia tela travada.
// Actions e roteador falsos; nenhuma rede.

import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const refresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/app/(auth)/configuracoes/whatsapp/actions", () => ({
  criarConexaoCanalDireto: vi.fn(),
  pedirQrCodeCanalDireto: vi.fn(),
  sincronizarEstadoCanalDireto: vi.fn(),
  // Usadas por componentes vizinhos da lista; não entram neste fluxo.
  pedirCodigoDePareamento: vi.fn(),
  aceitarTermoDoCanalDireto: vi.fn(),
  operarNumeroCanalDireto: vi.fn(),
}))

import {
  criarConexaoCanalDireto,
  pedirQrCodeCanalDireto,
  sincronizarEstadoCanalDireto,
} from "@/app/(auth)/configuracoes/whatsapp/actions"
import { ListaNumeros } from "@/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros"

const sincronizar = vi.mocked(sincronizarEstadoCanalDireto)

async function abrirTelaDoQr() {
  render(<ListaNumeros numeros={[]} termoAceito />)
  fireEvent.click(screen.getByRole("button", { name: /conectar número/i }))
  fireEvent.click(screen.getByRole("button", { name: /canal direto \(qr code\)/i }))
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
  })
}

async function passarTresSegundos() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  refresh.mockClear()
  vi.mocked(criarConexaoCanalDireto).mockResolvedValue({} as never)
  vi.mocked(pedirQrCodeCanalDireto).mockResolvedValue({
    qr: { imagem: "data:image/png;base64,AAAA", expiresAt: new Date(Date.now() + 60_000).toISOString() },
  } as never)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("QR Code lido pelo celular", () => {
  it("fecha a tela do código, recarrega a lista e avisa que conectou", async () => {
    sincronizar.mockResolvedValue({ estado: { state: "connected" } } as never)
    await abrirTelaDoQr()
    expect(screen.getByText(/leia o código no aparelho/i)).toBeInTheDocument()

    await passarTresSegundos()

    expect(screen.queryByText(/leia o código no aparelho/i)).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/número conectado/i)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("dois cliques em Continuar criam um número só, e o botão avisa que está criando", async () => {
    let terminar: (valor: unknown) => void = () => {}
    vi.mocked(criarConexaoCanalDireto).mockClear()
    vi.mocked(criarConexaoCanalDireto).mockImplementation(
      () => new Promise((resolver) => { terminar = resolver }) as never
    )
    render(<ListaNumeros numeros={[]} termoAceito />)
    fireEvent.click(screen.getByRole("button", { name: /conectar número/i }))
    fireEvent.click(screen.getByRole("button", { name: /canal direto \(qr code\)/i }))

    const continuar = screen.getByRole("button", { name: /continuar/i })
    fireEvent.click(continuar)
    fireEvent.click(continuar)

    expect(await screen.findByRole("button", { name: /criando/i })).toBeDisabled()
    await act(async () => terminar({}))
    expect(criarConexaoCanalDireto).toHaveBeenCalledTimes(1)
  })

  it("enquanto o código não é lido, a tela continua aberta e sem aviso", async () => {
    sincronizar.mockResolvedValue({ estado: { state: "pairing" } } as never)
    await abrirTelaDoQr()

    await passarTresSegundos()

    expect(screen.getByText(/leia o código no aparelho/i)).toBeInTheDocument()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })
})
