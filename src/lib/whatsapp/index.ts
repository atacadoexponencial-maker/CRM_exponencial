// Ponto único por onde todo envio de WhatsApp do CRM passa.
//
// É isto que os arquivos de negócio importam. Eles pedem um provider para um
// workspace e recebem algo que sabe enviar — sem nunca descobrir qual canal
// está atendendo.
//
// Hoje só existe o provider da Meta. Quando o gateway entrar, a escolha passa a
// ser feita aqui dentro, por um campo da conexão, e nenhum arquivo de negócio
// muda. Ver `README.md` nesta pasta.

import type { createServiceClient } from "@/integrations/supabase/service"

import { criarProviderMeta } from "./provider-meta"
import type { ProviderWhatsApp } from "./tipos"

export type {
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

/**
 * Resolve o provider a partir do número conectado do workspace.
 *
 * Devolve `null` quando o workspace não tem número conectado — cada chamador
 * trata essa ausência do jeito que já tratava.
 */
export async function resolverProvider(
  supabase: ClienteSupabase,
  workspaceId: string
): Promise<ProviderWhatsApp | null> {
  const { data: conexao } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle()

  if (!conexao) return null

  return criarProviderMeta(conexao.phone_number_id, conexao.access_token)
}
