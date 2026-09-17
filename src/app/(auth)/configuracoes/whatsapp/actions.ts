"use server"

import { revalidatePath } from "next/cache"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { clienteGatewayDoAmbiente } from "@/lib/whatsapp/gateway/cliente"
import {
  criarConexaoDoGateway,
  listarConexoes,
  type BancoDeConexoes,
  type ConexaoListada,
} from "@/lib/whatsapp/gateway/instancias"
import { aceiteEstaVigente, VERSAO_DO_TERMO } from "@/lib/whatsapp/gateway/termo"
import {
  pedirCodigoDoGateway,
  pedirQrDoGateway,
  type QrParaExibir,
} from "@/lib/whatsapp/gateway/pareamento"

export type ConexaoWhatsApp = {
  id: string
  phoneNumber: string
  displayName: string
  status: string
}

// O tipo NÃO é reexportado daqui: arquivo "use server" só pode exportar função,
// e reexportar tipo quebra o build. Quem precisa importa de
// `@/lib/whatsapp/gateway/instancias`.

export async function listarConexaoWhatsApp(): Promise<ConexaoWhatsApp | null> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return null

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return null

  const { data } = await ssrClient
    .from("whatsapp_connections")
    .select("id, phone_number, display_name, status")
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    phoneNumber: data.phone_number,
    displayName: data.display_name,
    status: data.status,
  }
}

/**
 * Todas as conexões do workspace, com o canal de cada uma (B2-02).
 *
 * Substitui a premissa de uma conexão por workspace: o canal direto existe
 * justamente para ter vários números. `listarConexaoWhatsApp` continua
 * existindo porque o fluxo da Meta depende dela.
 *
 * Lê com o cliente do usuário: a RLS garante que ninguém veja conexão de outro
 * workspace, e a migration de B2-02 mantém as credenciais fora do alcance do
 * cliente.
 */
export async function listarConexoesWhatsApp(): Promise<ConexaoListada[]> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return []

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return []

  return listarConexoes(
    ssrClient as unknown as BancoDeConexoes,
    perfil.workspace_id as string
  )
}

/**
 * O termo vigente já foi aceito neste workspace? (B3-01)
 *
 * Aceite de versão anterior não conta: o texto mudou, e o que o cliente leu não
 * é o que está valendo.
 */
export async function termoDoCanalDiretoAceito(): Promise<boolean> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return false

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return false

  const { data } = await ssrClient
    .from("gateway_terms_acceptance")
    .select("terms_version")
    .eq("workspace_id", perfil.workspace_id)
    .eq("terms_version", VERSAO_DO_TERMO)
    .limit(1)
    .maybeSingle()

  return aceiteEstaVigente(data)
}

/**
 * Registra o aceite do termo (B3-01): quem aceitou, quando e qual versão.
 *
 * Uma linha por aceite, nunca um update: o aceite antigo continua sendo prova
 * do que valia naquela data.
 */
export async function aceitarTermoDoCanalDireto(): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await ssrClient.from("gateway_terms_acceptance").insert({
    workspace_id: perfil.workspace_id as string,
    accepted_by: user.id,
    terms_version: VERSAO_DO_TERMO,
  })

  if (error) return { erro: "Não foi possível registrar o aceite. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}

/**
 * Cria uma conexão pelo canal direto (B2-02): abre a instância no gateway e
 * grava o número como "em pareamento".
 *
 * Grava com o service client, e não com o do usuário: o `instance_token` é
 * segredo e a migration de B2-02 tirou essa coluna do alcance do cliente
 * autenticado — inserir por ele falharia.
 *
 * O QR ainda não é pedido aqui: pedir o código é a B2-03.
 */
export async function criarConexaoCanalDireto(): Promise<{ erro?: string; instanceId?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  // Autorização no backend, como no resto do arquivo: a tela esconder o botão
  // não é proteção.
  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  // B3-01: sem aceite da versão vigente do termo, não conecta. A conferência
  // vem ANTES de falar com o gateway: instância criada sem aceite seria uma
  // conexão que não deveria existir, e o token dela é irrecuperável.
  if (!(await termoDoCanalDiretoAceito())) {
    return { erro: "Aceite o termo de responsabilidade antes de conectar pelo canal direto." }
  }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    // Variável de ambiente ausente é erro de configuração do servidor, e a
    // mensagem não pode repetir o nome do segredo para o navegador.
    return { erro: "O canal direto não está configurado neste ambiente." }
  }

  const resultado = await criarConexaoDoGateway({
    cliente,
    supabase: createServiceClient() as unknown as BancoDeConexoes,
    workspaceId: perfil.workspace_id as string,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-exponencial.vercel.app"}/api/webhooks/gateway`,
  })

  if (!resultado.ok) return { erro: resultado.erro }

  revalidatePath("/configuracoes/whatsapp")
  return { instanceId: resultado.instanceId }
}

/**
 * Instância do canal direto do workspace, com o token (B2-03).
 *
 * Lê com o service client: a coluna `instance_token` está fora do alcance do
 * cliente autenticado desde a B2-02, e é ela que autoriza o pareamento.
 *
 * Devolve só o que o backend precisa — este valor **nunca** é retornado a uma
 * Server Action nem chega ao navegador.
 */
async function instanciaDoCanalDireto(
  workspaceId: string
): Promise<{ conexaoId: string; instanceId: string; instanceToken: string } | null> {
  const { data } = await createServiceClient()
    .from("whatsapp_connections")
    .select("id, instance_id, instance_token")
    .eq("workspace_id", workspaceId)
    .eq("canal", "gateway")
    .not("instance_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.instance_id || !data?.instance_token) return null

  return {
    conexaoId: data.id as string,
    instanceId: data.instance_id as string,
    instanceToken: data.instance_token as string,
  }
}

/** Admin do workspace, ou o motivo da recusa. Usado pelas actions de pareamento. */
async function adminDoWorkspace(): Promise<{ workspaceId: string } | { erro: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  return { workspaceId: perfil.workspace_id as string }
}

/**
 * Pede o código visual de pareamento (B2-03).
 *
 * Devolve a **imagem pronta**: o conteúdo bruto do código não precisa circular
 * no navegador. Renovar é chamar esta action de novo — vencido sem leitura, o
 * gateway já gerou outro.
 */
export async function pedirQrCodeCanalDireto(): Promise<{ erro?: string; qr?: QrParaExibir }> {
  const autorizacao = await adminDoWorkspace()
  if ("erro" in autorizacao) return { erro: autorizacao.erro }

  const instancia = await instanciaDoCanalDireto(autorizacao.workspaceId)
  if (!instancia) return { erro: "Nenhum número do canal direto para parear neste workspace." }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { erro: "O canal direto não está configurado neste ambiente." }
  }

  const resultado = await pedirQrDoGateway(cliente, instancia.instanceId, instancia.instanceToken)
  return resultado.ok ? { qr: resultado.dados } : { erro: resultado.erro }
}

/**
 * Pede o código digitado para um número (B2-03), caminho alternativo ao QR.
 */
export async function pedirCodigoDePareamento(
  numero: string
): Promise<{ erro?: string; codigo?: string; expiresAt?: string }> {
  const autorizacao = await adminDoWorkspace()
  if ("erro" in autorizacao) return { erro: autorizacao.erro }

  const instancia = await instanciaDoCanalDireto(autorizacao.workspaceId)
  if (!instancia) return { erro: "Nenhum número do canal direto para parear neste workspace." }

  let cliente
  try {
    cliente = clienteGatewayDoAmbiente()
  } catch {
    return { erro: "O canal direto não está configurado neste ambiente." }
  }

  const resultado = await pedirCodigoDoGateway(
    cliente,
    instancia.instanceId,
    instancia.instanceToken,
    numero
  )

  return resultado.ok
    ? { codigo: resultado.dados.pairing_code, expiresAt: resultado.dados.expires_at }
    : { erro: resultado.erro }
}

export async function completarConexaoWhatsApp(params: {
  code: string
  phoneNumberId: string
  wabaId: string
}): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const workspaceId: string = perfil.workspace_id

  const { data: existente } = await ssrClient
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (existente) return { erro: "Já existe um número conectado" }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!

  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${params.code}`
  )

  if (!tokenRes.ok) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const tokenData = await tokenRes.json()
  const accessToken: string = tokenData.access_token
  if (!accessToken) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const phoneRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
  )

  if (!phoneRes.ok) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const phoneData = await phoneRes.json()
  const phoneNumber: string = phoneData.display_phone_number
  const displayName: string = phoneData.verified_name

  if (!phoneNumber || !displayName) return { erro: "Não foi possível conectar o número. Tente novamente." }

  const registerRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.phoneNumberId}/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        pin: "000000",
      }),
    }
  )

  if (!registerRes.ok) {
    const registerError = await registerRes.text()
    console.error("[whatsapp] erro ao registrar número:", registerError)
    return { erro: "Número conectado à WABA mas não foi possível registrá-lo no WhatsApp. Tente novamente." }
  }

  const subscribeRes = await fetch(
    `https://graph.facebook.com/v21.0/${params.wabaId}/subscribed_apps`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!subscribeRes.ok) {
    const subscribeError = await subscribeRes.text()
    console.error("[whatsapp] erro ao inscrever webhook na WABA:", subscribeError)
    return { erro: "Número registrado mas não foi possível configurar o recebimento de mensagens. Tente novamente." }
  }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .insert({
      workspace_id: workspaceId,
      phone_number: phoneNumber,
      display_name: displayName,
      status: "connected",
      waba_id: params.wabaId,
      phone_number_id: params.phoneNumberId,
      access_token: accessToken,
    })

  if (error) return { erro: "Não foi possível conectar o número. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}

// TEMPORÁRIO — remover após aprovação da Meta
export async function conectarNumeroTeste(): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { data: existente } = await ssrClient
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()

  if (existente) return { erro: "Já existe um número conectado" }

  const accessToken = process.env.META_TEST_ACCESS_TOKEN
  if (!accessToken) return { erro: "META_TEST_ACCESS_TOKEN não configurado" }

  const phoneNumberId = process.env.META_TEST_PHONE_NUMBER_ID
  const wabaId = process.env.META_TEST_WABA_ID
  if (!phoneNumberId || !wabaId) return { erro: "META_TEST_PHONE_NUMBER_ID ou META_TEST_WABA_ID não configurados" }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .insert({
      workspace_id: perfil.workspace_id,
      phone_number: "+1 555 631 2003",
      display_name: "Número de Teste Meta",
      status: "connected",
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token: accessToken,
    })

  if (error) return { erro: "Erro ao salvar: " + error.message }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}

export async function removerConexaoWhatsApp(
  id: string
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível remover o número. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}

export async function reinscreverWebhookWhatsApp(): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { data: conexao } = await ssrClient
    .from("whatsapp_connections")
    .select("waba_id, access_token")
    .eq("workspace_id", perfil.workspace_id)
    .single()

  if (!conexao) return { erro: "Nenhum número conectado" }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${conexao.waba_id}/subscribed_apps`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${conexao.access_token}` },
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error("[whatsapp] erro ao reinscrever webhook:", err)
    return { erro: "Não foi possível corrigir o recebimento. Tente novamente." }
  }

  return {}
}

export async function desconectarWhatsApp(
  id: string
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .update({ status: "disconnected" })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível atualizar o número. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}

export async function reconectarWhatsApp(
  id: string
): Promise<{ erro?: string }> {
  const ssrClient = await createSsrClient()
  const { data: { user } } = await ssrClient.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { data: perfil } = await ssrClient
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") return { erro: "Sem permissão" }

  const { error } = await ssrClient
    .from("whatsapp_connections")
    .update({ status: "connected" })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível atualizar o número. Tente novamente." }

  revalidatePath("/configuracoes/whatsapp")
  return {}
}
