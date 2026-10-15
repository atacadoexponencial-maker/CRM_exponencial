// Faixa de aquecimento na escolha do número da campanha (B26-03). A avaliação do
// disparo lê, junto com o ritmo, a saúde do número no gateway e devolve a faixa
// pronta. Sessão, banco e gateway simulados: nada sai da máquina.

import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/sessao", () => ({ sessaoAtual: vi.fn() }))
vi.mock("@/integrations/supabase/service", () => ({ createServiceClient: vi.fn() }))
vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/campanhas", () => ({ processarCampanhasPendentes: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/whatsapp/gateway/cliente", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/whatsapp/gateway/cliente")>()),
  clienteGatewayDoAmbiente: vi.fn(),
}))

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { clienteGatewayDoAmbiente, GatewayIndisponivel, type ClienteGateway } from "@/lib/whatsapp/gateway/cliente"
import { avaliarDisparo } from "@/app/(auth)/campanhas/actions"

const RITMO = {
  configured: { send_interval_seconds: 40, hourly_cap: 60, daily_cap: 500, send_window_start: "08:00", send_window_end: "20:00" },
  effective: { send_interval_seconds: 40, hourly_cap: 4, daily_cap: 30, send_window_start: "08:00", send_window_end: "20:00", warmup_applied: true },
  system_limits: { send_interval_seconds_min: 40, hourly_cap_max: 60, daily_cap_max: 500, send_window_earliest: "08:00", send_window_latest: "20:00" },
}

function saude({ ativo, dia, tetoHora, tetoDia }: { ativo: boolean; dia: number; tetoHora: number; tetoDia: number }) {
  return {
    instance_id: "inst_1",
    state: "connected",
    connected_24h_ms: 3_600_000,
    sent: { last_hour: 4, last_24h: 4 },
    received: { last_hour: 2, last_24h: 2 },
    failures: { failed: 0, sent: 4, ratio: 0 },
    caps: { hourly: tetoHora, hourly_used: 4, daily: tetoDia, daily_used: 4 },
    warmup: { active: ativo, day_of_life: dia, hourly_cap: tetoHora, daily_cap: tetoDia },
    brake: { braked: false, reason: null, braked_at: null },
    queue: { queued_count: 0 },
  }
}

/** Número escolhido: `canal` e credenciais, como o banco devolve para a chave de serviço. */
function preparar(canal: "gateway" | "meta", gateway: { saude?: unknown; ritmo?: unknown; fora?: boolean }) {
  vi.mocked(sessaoAtual).mockResolvedValue({
    supabase: {},
    user: { id: "admin-1" },
    perfil: { role: "admin", workspace_id: "ws-1" },
  } as unknown as Awaited<ReturnType<typeof sessaoAtual>>)

  const consulta: Record<string, unknown> = {}
  for (const m of ["select", "eq"]) consulta[m] = vi.fn(() => consulta)
  consulta.maybeSingle = vi.fn(async () => ({
    data: { canal, instance_id: canal === "gateway" ? "inst_1" : null, instance_token: canal === "gateway" ? "tok" : null },
    error: null,
  }))
  vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn(() => consulta) } as unknown as ReturnType<typeof createServiceClient>)

  const cliente: ClienteGateway = {
    async comServico() {
      throw new Error("não usado")
    },
    async comInstancia(_token, pedido) {
      if (gateway.fora) throw new GatewayIndisponivel("fora do ar")
      if (pedido.caminho.endsWith("/health")) return gateway.saude as never
      return (gateway.ritmo ?? RITMO) as never
    },
  }
  vi.mocked(clienteGatewayDoAmbiente).mockReturnValue(cliente)
}

beforeEach(() => vi.clearAllMocks())

describe("B26-03 — faixa de aquecimento na escolha do número da campanha", () => {
  it("CA-B26-09: número do canal direto no dia 2 mostra a faixa com o dia e os limites que a fila usa", async () => {
    preparar("gateway", { saude: saude({ ativo: true, dia: 2, tetoHora: 4, tetoDia: 30 }) })

    const avaliacao = await avaliarDisparo("conn-1", 50)

    expect(avaliacao.aquecimento).toBe(
      "Número em aquecimento (dia 2): até 4 mensagens por hora e 30 por dia. Os limites sobem sozinhos até o dia 30."
    )
    expect(avaliacao.aviso).toContain("canal direto")
  })

  it("CA-B26-10: número maduro do canal direto e número da API Oficial não mostram a faixa", async () => {
    preparar("gateway", { saude: saude({ ativo: false, dia: 45, tetoHora: 60, tetoDia: 500 }) })
    expect((await avaliarDisparo("conn-1", 50)).aquecimento).toBeNull()

    preparar("meta", {})
    const oficial = await avaliarDisparo("conn-2", 50)
    expect(oficial.aquecimento).toBeNull()
    expect(oficial.aviso).toBeNull()
  })

  it("CA-B26-11: sem resposta do número, não há faixa; aviso de risco e estimativa aparecem, marcada como aproximada", async () => {
    preparar("gateway", { fora: true })

    const avaliacao = await avaliarDisparo("conn-1", 50)

    expect(avaliacao.aquecimento).toBeNull()
    expect(avaliacao.aviso).toContain("canal direto")
    expect(avaliacao.estimativa).not.toBe("")
    expect(avaliacao.ritmoConfirmado).toBe(false)
  })
})
