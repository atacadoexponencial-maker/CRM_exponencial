// B20-05: freio de tentativas no cadastro e no login, contado no servidor.
// B21-07: também nos pedidos da loja.
// B22-29: também no "Testar com um contato" das automações, por pessoa.
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

export type TipoDeTentativa = "cadastro" | "login" | "pedido_loja" | "teste_automacao" | "pedido_telefone"
export type RegraDeLimite = { chave: string; limite: number }

/** Endereço de quem chamou. Na Vercel, `x-forwarded-for` é escrito pela própria plataforma. */
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers()
  const encaminhado = h.get("x-forwarded-for")?.split(",")[0]?.trim()
  return encaminhado || h.get("x-real-ip") || "desconhecido"
}

export const chaveDoIp = (ip: string) => hash(`ip:${ip}`)
export const chaveDoEmail = (email: string) => hash(`email:${email.trim().toLowerCase()}`)
/**
 * B21-07: o limite de pedidos é por endereço de internet e por loja. B44-09: o endereço
 * da loja entra em minúsculas, como a loja é achada; antes, "LOJA-TESTE" era outra chave.
 */
export const chaveDoPedidoNaLoja = (ip: string, endereco: string) => hash(`pedido:${endereco.trim().toLowerCase()}:${ip}`)
/** B44-09: um pedido por telefone a cada intervalo, em cada loja. */
export const chaveDoTelefoneNaLoja = (endereco: string, whatsapp: string) => hash(`telefone:${endereco.trim().toLowerCase()}:${whatsapp}`)
/** B22-29: o limite de testes de automação é por pessoa. */
export const chaveDoUsuario = (usuarioId: string) => hash(`usuario:${usuarioId}`)

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

/**
 * B44-09: reserva uma vaga no limite numa operação só (conta e grava sob trava no banco).
 * `reservada: false` é limite atingido. Contador fora do ar não bloqueia, como o resto.
 */
export async function reservarTentativa(
  tipo: TipoDeTentativa,
  chave: string,
  limite: number,
  janelaMinutos: number
): Promise<{ reservada: boolean; id: number | null }> {
  try {
    const { data, error } = await createServiceClient().rpc("reservar_tentativa", {
      p_tipo: tipo,
      p_chave: chave,
      p_limite: limite,
      p_janela_minutos: janelaMinutos,
    })
    if (error) return { reservada: true, id: null }
    return { reservada: data !== null, id: data as number | null }
  } catch {
    return { reservada: true, id: null }
  }
}

/** B44-09: devolve a vaga de quem não chegou a concluir (conta só o que entrou). */
export async function liberarTentativa(id: number | null): Promise<void> {
  if (id === null) return
  try {
    await createServiceClient().from("tentativas_de_acesso").delete().eq("id", id)
  } catch {
    // vaga presa só expira com a janela
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
