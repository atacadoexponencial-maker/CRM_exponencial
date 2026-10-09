// B20-05: freio de tentativas no cadastro e no login, contado no servidor.
// B21-07: também nos pedidos da loja.
//
// A contagem fica numa tabela (`tentativas_de_acesso`) porque o servidor roda em várias
// instâncias: memória local não seria compartilhada. A chave é um hash — a tabela não
// guarda e-mail nem IP em claro.
//
// Falha ao ler ou gravar não bloqueia ninguém: melhor deixar entrar do que derrubar o
// login de todos por causa do contador.

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { createServiceClient } from "@/integrations/supabase/service"

export type TipoDeTentativa = "cadastro" | "login" | "pedido_loja"
export type RegraDeLimite = { chave: string; limite: number }

/** Endereço de quem chamou. Na Vercel, `x-forwarded-for` é escrito pela própria plataforma. */
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers()
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return encaminhado || h.get("x-real-ip") || "desconhecido"
}

export const chaveDoIp = (ip: string) => hash(`ip:${ip}`)
export const chaveDoEmail = (email: string) => hash(`email:${email.trim().toLowerCase()}`)
/** B21-07: o limite de pedidos é por endereço de internet e por loja. */
export const chaveDoPedidoNaLoja = (ip: string, endereco: string) => hash(`pedido:${endereco}:${ip}`)

function hash(texto: string): string {
  return createHash("sha256").update(texto).digest("hex")
}

/** Alguma das chaves já chegou ao limite dentro da janela? */
export async function passouDoLimite(
  tipo: TipoDeTentativa,
  regras: RegraDeLimite[],
  janelaMinutos: number
): Promise<boolean> {
  try {
    const desde = new Date(Date.now() - janelaMinutos * 60_000).toISOString()
    const svc = createServiceClient()
    const contagens = await Promise.all(
      regras.map(({ chave }) =>
        svc
          .from("tentativas_de_acesso")
          .select("id", { count: "exact", head: true })
          .eq("tipo", tipo)
          .eq("chave", chave)
          .gte("criado_em", desde)
      )
    )
    return contagens.some(({ count }, i) => (count ?? 0) >= regras[i].limite)
  } catch {
    return false
  }
}

export async function registrarTentativa(tipo: TipoDeTentativa, chaves: string[]): Promise<void> {
  try {
    const svc = createServiceClient()
    await svc.from("tentativas_de_acesso").insert(chaves.map((chave) => ({ tipo, chave })))
    // Mais de um dia não serve para nenhuma janela: limpa de passagem.
    await svc.from("tentativas_de_acesso").delete().lt("criado_em", new Date(Date.now() - 86_400_000).toISOString())
  } catch {
    // contador fora do ar não bloqueia o uso
  }
}
