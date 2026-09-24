// Criação e listagem de conexões do canal direto (B2-02).
//
// Fica aqui, e não dentro da Server Action, por um motivo prático: assim o
// fluxo inteiro é testável passando um cliente do gateway e um do Supabase
// falsos, sem rede e sem banco. A action só autoriza, monta as dependências e
// traduz o resultado.
//
// **Só backend.** O `instance_token` que o gateway devolve é segredo e nunca
// pode chegar ao navegador — ele autoriza tudo o que se refere àquele número.

import { GatewayRecusou, type ClienteGateway } from "./cliente"
import type { InstanciaCriada } from "./tipos"

/** Conexão como o CRM a mostra. Sem nenhum campo de credencial. */
export type ConexaoListada = {
  id: string
  canal: "meta" | "gateway"
  phoneNumber: string | null
  displayName: string | null
  status: string
  stateReason: string | null
}

/** O mínimo que estas funções precisam de um cliente Supabase. */
export type BancoDeConexoes = {
  from(tabela: string): {
    select(colunas: string): {
      eq(
        coluna: string,
        valor: string
      ): {
        neq(
          coluna: string,
          valor: string
        ): {
          order(coluna: string, opcoes: { ascending: boolean }): Promise<{
            data: RegistroDeConexao[] | null
            error: { message: string } | null
          }>
        }
      }
    }
    insert(linha: Record<string, unknown>): Promise<{ error: { message: string } | null }>
  }
}

type RegistroDeConexao = {
  id: string
  canal: string | null
  phone_number: string | null
  display_name: string | null
  status: string
  state_reason: string | null
}

export type ResultadoDaCriacao = { ok: true; instanceId: string } | { ok: false; erro: string }

/** Mensagens por código do contrato. Fora da lista, a do próprio gateway serve. */
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  workspace_instance_limit_reached:
    "Este workspace já atingiu o limite de números conectados pelo canal direto.",
  invalid_credentials:
    "O CRM não conseguiu se autenticar no gateway. Confira a configuração do servidor.",
}

/**
 * Lista as conexões do workspace, com o canal de cada uma.
 *
 * Substitui a leitura de conexão única: até a B1-02 o CRM assumia um número por
 * workspace, e o canal direto existe justamente para ter vários.
 */
export async function listarConexoes(
  supabase: BancoDeConexoes,
  workspaceId: string
): Promise<ConexaoListada[]> {
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("id, canal, phone_number, display_name, status, state_reason")
    .eq("workspace_id", workspaceId)
    // Removida fica arquivada para o histórico das conversas, fora da lista.
    .neq("status", "removed")
    .order("created_at", { ascending: true })

  return (data ?? []).map((linha) => ({
    id: linha.id,
    // Linha anterior à B1-02 não tem canal preenchido, e é da Meta.
    canal: linha.canal === "gateway" ? "gateway" : "meta",
    phoneNumber: linha.phone_number,
    displayName: linha.display_name,
    status: linha.status,
    stateReason: linha.state_reason,
  }))
}

/**
 * Cria a instância no gateway e grava a conexão.
 *
 * A ordem importa e é o coração desta função: o gateway devolve o
 * `instance_token` **uma única vez**, na criação. Se a gravação falhar depois
 * disso, o token está perdido e a instância fica órfã no gateway — por isso a
 * conexão é gravada imediatamente, e a falha de gravação é reportada como falha
 * da operação inteira, sem deixar meia conexão no banco.
 */
export async function criarConexaoDoGateway({
  cliente,
  supabase,
  workspaceId,
  webhookUrl,
}: {
  cliente: ClienteGateway
  supabase: BancoDeConexoes
  workspaceId: string
  webhookUrl: string
}): Promise<ResultadoDaCriacao> {
  let instancia: InstanciaCriada
  try {
    instancia = await cliente.comServico<InstanciaCriada>({
      caminho: "/instances",
      metodo: "POST",
      corpo: { workspace_id: workspaceId, webhook_url: webhookUrl },
    })
  } catch (erro) {
    if (erro instanceof GatewayRecusou) {
      return { ok: false, erro: MENSAGEM_POR_CODIGO[erro.code] ?? erro.message }
    }
    // Gateway fora do ar: nada foi criado, e o admin precisa saber disso e não
    // de um "erro inesperado".
    return {
      ok: false,
      erro: "O gateway não respondeu. Nenhum número foi conectado; tente de novo em instantes.",
    }
  }

  const { error } = await supabase.from("whatsapp_connections").insert({
    workspace_id: workspaceId,
    canal: "gateway",
    instance_id: instancia.instance_id,
    instance_token: instancia.instance_token,
    // O número e o nome só existem depois de conectar; o estado vem do gateway.
    status: instancia.state,
  })

  if (error) {
    // A instância existe no gateway e o token se perdeu: não há como o CRM
    // voltar a falar com ela. Dizer isso é melhor do que fingir sucesso.
    return {
      ok: false,
      erro: "A instância foi criada no gateway, mas não foi possível gravá-la no CRM. Remova-a e tente de novo.",
    }
  }

  return { ok: true, instanceId: instancia.instance_id }
}
