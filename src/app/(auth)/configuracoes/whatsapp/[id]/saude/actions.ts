"use server"

// Backend da tela de saúde (B4-02) e da retomada do freio (B4-04).
//
// A action autoriza, busca a conexão, monta o cliente do gateway e traduz o
// resultado. A leitura e a tradução em si vivem em
// `src/lib/whatsapp/gateway/saude.ts`, testáveis sem rede.
//
// **A credencial da instância nunca é devolvida ao navegador.** Ela é lida com
// o service client porque a migration da B2-02 tirou essa coluna do alcance do
// cliente autenticado, e sai daqui apenas dentro do header da chamada HTTP.

import { revalidatePath } from "next/cache"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { refletirRiscoNaCentral } from "@/lib/whatsapp/alertas-de-numero"
import { clienteGatewayDoAmbiente } from "@/lib/whatsapp/gateway/cliente"
import {
  lerSaudeDoNumero,
  retomarEnvios,
  type ConexaoDoGateway,
  type SaudeDoNumero,
} from "@/lib/whatsapp/gateway/saude"

export type ResultadoDaSaude = { ok: true; saude: SaudeDoNumero } | { ok: false; erro: string }

async function perfilAtual() {
  const supabase = await createSsrClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  return { user, perfil }
}

/**
 * Conexão do canal direto, com a credencial, restrita ao workspace de quem
 * pergunta.
 *
 * O filtro por workspace é o que impede um admin de um cliente ler a saúde do
 * número de outro: o service client ignora RLS, então a restrição precisa estar
 * aqui, explícita.
 */
async function conexaoDoGateway(
  connectionId: string,
  workspaceId: string
): Promise<{ conexao?: ConexaoDoGateway; erro?: string }> {
  const { data } = await createServiceClient()
    .from("whatsapp_connections")
    .select("canal, instance_id, instance_token, phone_number, display_name")
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!data) return { erro: "Número não encontrado neste workspace." }

  if (data.canal !== "gateway") {
    return {
      erro: "Este número está conectado pela API Oficial da Meta, que não expõe saúde nem ritmo.",
    }
  }

  if (!data.instance_id || !data.instance_token) {
    return { erro: "Este número não tem instância no gateway. Reconecte-o." }
  }

  return {
    conexao: {
      instanceId: data.instance_id,
      instanceToken: data.instance_token,
      numero: data.phone_number,
      nomeExibicao: data.display_name,
    },
  }
}

/** Saúde de um número conectado. Admin e Gerente; Atendente não alcança. */
export async function lerSaude(connectionId: string): Promise<ResultadoDaSaude> {
  const { perfil } = await perfilAtual()
  if (!perfil) return { ok: false, erro: "Não autorizado" }
  if (perfil.role !== "admin" && perfil.role !== "gerente") {
    return { ok: false, erro: "Sem permissão" }
  }

  const { conexao, erro } = await conexaoDoGateway(connectionId, perfil.workspace_id as string)
  if (!conexao) return { ok: false, erro: erro! }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { ok: false, erro: "O canal direto não está configurado neste ambiente." }
  }

  const resultado = await lerSaudeDoNumero({ cliente, conexao })

  // B4-03: o risco alto precisa aparecer na central para quem não está com esta
  // tela aberta. Abrir o alerta aqui é o gatilho mais simples que atende —
  // limitação declarada em `alertas-de-numero.ts`: sem ninguém abrir a tela, o
  // risco não vira alerta, e fechar isso exige verificação periódica.
  if (resultado.ok) {
    await refletirRiscoNaCentral({
      supabase: createServiceClient(),
      workspaceId: perfil.workspace_id as string,
      connectionId,
      nivel: resultado.saude.risco.nivel,
      razaoPrincipal: resultado.saude.risco.razoes[0],
    })
  }

  return resultado
}

/**
 * Retoma os envios de um número freado (B4-04).
 *
 * **Só Admin.** Gerente vê a saúde e o aviso de freio; retomar é assumir o
 * risco de continuar enviando por um número que já falhou em série, e isso é
 * decisão de quem responde pelo número. A regra está aqui, no backend — a tela
 * esconder o botão não é proteção.
 *
 * A regra "banimento não se retoma" é do gateway, e é ele que recusa: repetir a
 * checagem aqui criaria duas versões da mesma regra.
 */
export async function retomarEnviosDoNumero(
  connectionId: string
): Promise<{ erro?: string; motivoLiberado?: string }> {
  const { perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autorizado" }
  if (perfil.role !== "admin") return { erro: "Sem permissão" }

  const { conexao, erro } = await conexaoDoGateway(connectionId, perfil.workspace_id as string)
  if (!conexao) return { erro }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { erro: "O canal direto não está configurado neste ambiente." }
  }

  const resultado = await retomarEnvios({ cliente, conexao })
  if (!resultado.ok) return { erro: resultado.erro }

  revalidatePath(`/configuracoes/whatsapp/${connectionId}/saude`)
  return { motivoLiberado: resultado.motivoLiberado }
}
