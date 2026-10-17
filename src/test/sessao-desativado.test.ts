// @vitest-environment node
// B27-01: o porteiro não percebe mais o usuário desativado (a assinatura da
// sessão dele ainda vale). Quem percebe é `sessaoAtual()`, que confere ao lado
// do banco: na próxima tela ou ação, o desativado vai ao login com o aviso.
// Supabase falso; nenhuma rede.

import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { getURLFromRedirectError } from "next/dist/client/components/redirect"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { beforeEach, describe, expect, it, vi } from "vitest"

const from = vi.fn()
const getUser = vi.fn()
vi.mock("@/integrations/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}))

import { sessaoAtual } from "@/lib/sessao"
import { listarMensagensRapidas } from "@/app/(auth)/configuracoes/mensagens-rapidas/actions"

const BANIDO = {
  data: { user: null },
  error: Object.assign(new Error("User is banned"), { code: "user_banned", status: 403 }),
}

async function destinoDoRedirect(promessa: Promise<unknown>): Promise<string | null> {
  try {
    await promessa
    return null
  } catch (erro) {
    if (!isRedirectError(erro)) throw erro
    return getURLFromRedirectError(erro)
  }
}

function paginas(pasta: string): string[] {
  const filhas = readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory())
  const aqui = existsSync(path.join(pasta, "page.tsx")) ? [path.join(pasta, "page.tsx")] : []
  return [...aqui, ...filhas.flatMap((f) => paginas(path.join(pasta, f.name)))]
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("usuário desativado com o CRM aberto", () => {
  it("CA-B27-07: desativado é barrado na próxima tela, com o aviso", async () => {
    getUser.mockResolvedValue(BANIDO)

    expect(await destinoDoRedirect(sessaoAtual())).toBe("/login?motivo=desativada")
  })

  it("CA-B27-07: nenhuma tela logada confere o login por fora da sessaoAtual", () => {
    const raiz = path.resolve(__dirname, "../app/(auth)")
    const porFora = paginas(raiz)
      .filter((pagina) => readFileSync(pagina, "utf8").includes("auth.getUser("))
      .map((pagina) => path.relative(raiz, pagina))

    expect(porFora).toEqual([])
  })

  it("CA-B27-07: sessão sem usuário (não desativado) continua sem aviso", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    expect(await sessaoAtual()).toMatchObject({ user: null, perfil: null })
  })

  it("CA-B27-08: ação de desativado é recusada antes de ler o banco", async () => {
    getUser.mockResolvedValue(BANIDO)

    expect(await destinoDoRedirect(listarMensagensRapidas())).toBe("/login?motivo=desativada")
    expect(from).not.toHaveBeenCalled()
  })
})
