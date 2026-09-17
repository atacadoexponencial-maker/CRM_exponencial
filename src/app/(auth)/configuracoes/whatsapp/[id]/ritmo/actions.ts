"use server"

// Backend da tela de ritmo (B5-02).
//
// **Só Admin.** A regra está aqui, não na tela: afrouxar o ritmo é assumir
// risco de bloqueio do número, e esconder o formulário não impede ninguém de
// chamar a action.
//
// A credencial da instância é lida com service client (a migration da B2-02
// tirou a coluna do alcance do cliente autenticado) e sai apenas dentro do
// header da chamada ao gateway.

import { revalidatePath } from "next/cache"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { clienteGatewayDoAmbiente } from "@/lib/whatsapp/gateway/cliente"
import {
  lerRitmo,
  salvarRitmoNoGateway,
  type AlteracaoDeRitmo,
  type ConexaoComRitmo,
} from "@/lib/whatsapp/gateway/ritmo"
import type { RitmoDoNumero } from "@/lib/whatsapp/gateway/tipos"

export type ResultadoDoRitmo = { ok: true; ritmo: RitmoDoNumero } | { ok: false; erro: string }

async function adminAtual() {
  const supabase = await createSsrClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return null
  return perfil
}

/** Conexão do canal direto com a credencial, restrita ao workspace de quem pede. */
async function conexaoComRitmo(
  connectionId: string,
  workspaceId: string
): Promise<{ conexao?: ConexaoComRitmo; erro?: string }> {
  const { data } = await createServiceClient()
    .from("whatsapp_connections")
    .select("canal, instance_id, instance_token")
    .eq("id", connectionId)
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (!data) return { erro: "Número não encontrado neste workspace." }
  if (data.canal !== "gateway") {
    return { erro: "A API Oficial da Meta não tem ritmo configurável: ele é da Meta, não nosso." }
  }
  if (!data.instance_id || !data.instance_token) {
    return { erro: "Este número não tem instância no gateway. Reconecte-o." }
  }

  return { conexao: { instanceId: data.instance_id, instanceToken: data.instance_token } }
}

/** Ritmo configurado, o efetivo e os limites do sistema, lidos do gateway. */
export async function lerRitmoDoNumero(connectionId: string): Promise<ResultadoDoRitmo> {
  const perfil = await adminAtual()
  if (!perfil) return { ok: false, erro: "Sem permissão" }

  const { conexao, erro } = await conexaoComRitmo(connectionId, perfil.workspace_id as string)
  if (!conexao) return { ok: false, erro: erro! }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { ok: false, erro: "O canal direto não está configurado neste ambiente." }
  }

  return lerRitmo({ cliente, conexao })
}

/**
 * Grava o ritmo.
 *
 * Relê antes de gravar para ter os limites e o valor atual da janela: os
 * limites são do gateway e não podem ser presumidos, e a janela precisa ser
 * conferida inteira mesmo quando só uma ponta muda.
 */
export async function salvarRitmo(
  connectionId: string,
  alteracao: AlteracaoDeRitmo
): Promise<{ erro?: string }> {
  const perfil = await adminAtual()
  if (!perfil) return { erro: "Sem permissão" }

  const { conexao, erro } = await conexaoComRitmo(connectionId, perfil.workspace_id as string)
  if (!conexao) return { erro }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { erro: "O canal direto não está configurado neste ambiente." }
  }

  const atual = await lerRitmo({ cliente, conexao })
  if (!atual.ok) return { erro: atual.erro }

  const resultado = await salvarRitmoNoGateway({
    cliente,
    conexao,
    alteracao,
    limites: atual.ritmo.system_limits,
    atual: atual.ritmo.configured,
  })

  if (!resultado.ok) return { erro: resultado.erro }

  revalidatePath(`/configuracoes/whatsapp/${connectionId}/ritmo`)
  return {}
}
