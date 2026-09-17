// Ponto único por onde todo envio de WhatsApp do CRM passa.
//
// É isto que os arquivos de negócio importam. Eles pedem um provider e recebem
// algo que sabe enviar — sem nunca descobrir qual canal está atendendo.
//
// São três formas de pedir, da mais precisa para a menos:
//
//  1. `resolverProviderDaConversa` — o número por onde a conversa acontece. É o
//     que o chat usa: responder por outro número faria a resposta chegar de um
//     telefone que o cliente não conhece.
//  2. `resolverProviderDoContato` — o número da conversa aberta do contato. É o
//     que automações e sequências usam, porque elas não têm conversa em mão.
//  3. `resolverProvider` — o número conectado do workspace. Continua valendo
//     para quem só tem o workspace, e é o degrau de queda das outras duas.
//
// A escolha do canal vive aqui dentro. Ver `README.md` nesta pasta.

import type { createServiceClient } from "@/integrations/supabase/service"

import { clienteGatewayDoAmbiente } from "./gateway/cliente"
import { criarProviderGateway, RECURSOS_DO_GATEWAY } from "./provider-gateway"
import { criarProviderMeta, RECURSOS_DA_META } from "./provider-meta"
import type { CanalWhatsApp, ProviderWhatsApp, RecursoWhatsApp } from "./tipos"

export type {
  AlvoDeLeitura,
  CanalWhatsApp,
  MidiaEnvio,
  ProviderWhatsApp,
  RecursoWhatsApp,
  ResultadoEnvio,
} from "./tipos"

/**
 * Tipo do cliente Supabase aceito aqui.
 *
 * Tanto `createServiceClient` quanto o cliente SSR resolvem para o mesmo
 * `SupabaseClient<any, "public", "public", any, any>`, porque nenhum dos dois
 * passa o generic `Database`. Por isso o seletor aceita os dois sem cast, e a
 * RLS do chat é preservada: cada chamador passa o cliente que já usava.
 *
 * O tipo vem da fábrica, e não de uma descrição estrutural da cadeia
 * `.from().select()...`, porque os builders do postgrest-js não são `Promise`
 * — são thenables (`PostgrestBuilder`), e o `Result` deles não é o objeto
 * selecionado. Descrever a cadeia à mão compila em isolamento e quebra na hora
 * em que um cliente de verdade é passado. Ver decisão 5.3.
 */
export type ClienteSupabase = ReturnType<typeof createServiceClient>

/** As colunas que a escolha do provider usa. Num lugar só: as três resoluções leem as mesmas. */
const COLUNAS_DA_CONEXAO = "canal, phone_number_id, access_token, instance_id, instance_token"

/**
 * Resolve o provider a partir do número conectado do workspace.
 *
 * Devolve `null` quando o workspace não tem número conectado — cada chamador
 * trata essa ausência do jeito que já tratava.
 *
 * Com dois números conectados, esta função devolve **um deles**, e qual é não
 * está definido. Quem tem conversa ou contato em mão deve usar
 * `resolverProviderDaConversa` ou `resolverProviderDoContato`.
 */
export async function resolverProvider(
  supabase: ClienteSupabase,
  workspaceId: string
): Promise<ProviderWhatsApp | null> {
  const { data: conexao } = await supabase
    .from("whatsapp_connections")
    .select(COLUNAS_DA_CONEXAO)
    .eq("workspace_id", workspaceId)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle()

  if (!conexao) return null

  return providerDaConexao(conexao as ConexaoParaProvider)
}

/**
 * Resolve o provider pelo número da **conversa** (B7-01).
 *
 * Cai no número do workspace quando a conversa não tem número gravado —
 * conversa anterior à B7-01 cujo preenchimento não achou conexão, ou conversa
 * de workspace que trocou de número. Cair é melhor que não enviar: a mensagem
 * sai pelo número que existe, e o comportamento é o de antes desta issue.
 */
export async function resolverProviderDaConversa(
  supabase: ClienteSupabase,
  conversaId: string,
  workspaceId: string
): Promise<ProviderWhatsApp | null> {
  const { data: conversa } = await supabase
    .from("conversations")
    .select(`whatsapp_connection_id, conexao:whatsapp_connections(${COLUNAS_DA_CONEXAO})`)
    .eq("id", conversaId)
    .maybeSingle()

  const conexao = (conversa as { conexao?: ConexaoParaProvider | null } | null)?.conexao

  if (!conexao) return resolverProvider(supabase, workspaceId)

  // Conexão gravada mas incompleta para o canal dela: o degrau de queda vale
  // igual, em vez de devolver null e transformar em erro na cara do atendente.
  return providerDaConexao(conexao) ?? resolverProvider(supabase, workspaceId)
}

/**
 * Resolve o provider pelo número da conversa aberta do **contato** (B7-01).
 *
 * É o caminho de automações e sequências, que agem sobre um contato e não têm
 * conversa em mão. Sem conversa aberta, cai no número do workspace: a conversa
 * vai nascer agora, e nasce pelo número que o workspace tem.
 */
export async function resolverProviderDoContato(
  supabase: ClienteSupabase,
  workspaceId: string,
  contactId: string
): Promise<ProviderWhatsApp | null> {
  const { data: conversa } = await supabase
    .from("conversations")
    .select(`whatsapp_connection_id, conexao:whatsapp_connections(${COLUNAS_DA_CONEXAO})`)
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .in("status", ["em_espera", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const conexao = (conversa as { conexao?: ConexaoParaProvider | null } | null)?.conexao

  if (!conexao) return resolverProvider(supabase, workspaceId)

  return providerDaConexao(conexao) ?? resolverProvider(supabase, workspaceId)
}

/** A conexão, na medida exata que a escolha do provider precisa. */
export type ConexaoParaProvider = {
  canal: CanalWhatsApp | null
  phone_number_id: string | null
  access_token: string | null
  instance_id: string | null
  instance_token: string | null
}

/**
 * Escolhe a implementação a partir do canal da conexão.
 *
 * Conexão sem canal preenchido é da Meta: é o default da coluna, e as linhas
 * anteriores à B1-02 nasceram assim.
 *
 * Devolve `null` quando a conexão está incompleta para o canal dela — sem
 * credencial não há envio, e o chamador trata como já trata a ausência de
 * conexão. A constraint do banco impede isso; a conferência aqui existe porque
 * o tipo gerado do Supabase não sabe da constraint.
 */
export function providerDaConexao(conexao: ConexaoParaProvider): ProviderWhatsApp | null {
  if (conexao.canal === "gateway") {
    if (!conexao.instance_id || !conexao.instance_token) return null
    return criarProviderGateway(
      clienteGatewayDoAmbiente(),
      conexao.instance_id,
      conexao.instance_token
    )
  }

  if (!conexao.phone_number_id || !conexao.access_token) return null
  return criarProviderMeta(conexao.phone_number_id, conexao.access_token)
}

/**
 * O que um canal faz, sem precisar de credencial (B7-02).
 *
 * A interface pergunta isto para não oferecer o que o canal não tem. É a mesma
 * resposta que `suporta()` dá no provider — os dois leem o mesmo mapa —, só
 * acessível antes de haver conexão montada.
 *
 * Canal nulo é da Meta, pela mesma razão do resto do módulo: é o default da
 * coluna.
 */
export function recursosDoCanal(canal: CanalWhatsApp | null): Record<RecursoWhatsApp, boolean> {
  return canal === "gateway" ? { ...RECURSOS_DO_GATEWAY } : { ...RECURSOS_DA_META }
}

/** Nome do canal como o atendente o vê. */
export function nomeDoCanal(canal: CanalWhatsApp | null): string {
  return canal === "gateway" ? "Canal direto" : "API Oficial"
}

/**
 * Por que o recurso não está disponível, em uma frase que o atendente entende.
 *
 * Existe para a interface não inventar o motivo — e para não haver
 * `if (canal === "gateway")` em componente nenhum.
 */
export function motivoDoRecursoIndisponivel(
  recurso: RecursoWhatsApp,
  canal: CanalWhatsApp | null
): string | null {
  if (recursosDoCanal(canal)[recurso]) return null

  const doCanal = nomeDoCanal(canal)

  switch (recurso) {
    case "templates":
      return `Templates de mensagem existem apenas na API Oficial da Meta. Este número usa o ${doCanal}, e nele qualquer texto pode ser enviado sem template.`
    case "midia":
      return `O número em uso (${doCanal}) não envia mídia. Envie o conteúdo como texto ou use outro número.`
    case "marcar_lida":
      return `O número em uso (${doCanal}) não confirma leitura ao contato.`
  }
}
