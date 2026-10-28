// Verificações do bloco de condição que o motor sabe avaliar: canal, etiqueta
// e atendente da conversa, e etapa do card do contato (B11-02); tag, tipo e
// classificação do contato (B11-11); horário comercial (B11-08); texto e tipo
// da mensagem (B11-04), nos dois gatilhos de mensagem.
//
// Cada verificação consulta o banco na hora, para enxergar o que uma ação
// anterior do mesmo caminho acabou de mudar (uma tag que o fluxo acabou de
// adicionar, por exemplo). Sem conversa, as verificações sobre a conversa não
// valem, inclusive "não tem a etiqueta": sem conversa, não há o que afirmar.
// Erro de banco sobe e encerra a regra. As da mensagem não consultam nada: leem
// o evento.

import { calcularClassificacao } from "@/app/(auth)/contatos/classificacao"
import { normalizarTexto } from "@/lib/catalogo/planilha"
import { itensDaLista, normalizarTag, SEM_COMPRAS, type Verificacao } from "@/lib/fluxo-automacao"
import { dentroDoHorario, horarioDoBanco } from "@/lib/horario-comercial"
import { fusoDoWorkspace } from "@/lib/fuso-da-empresa"
import { conversaDoEvento, type ContextoDaExecucao } from "./contexto"
import { campoAtende, valorDaLinha, type TipoDeCampo } from "@/lib/campos-personalizados"

/** Opção do editor ("Canal da conversa é …") → `whatsapp_connections.canal`. */
const CANAL_DA_OPCAO: Record<string, string> = {
  oficial: "meta",
  direto: "gateway",
}

const PREFIXO_NUMERO = "numero:"

export async function verificacaoVale(contexto: ContextoDaExecucao, verificacao: Verificacao): Promise<boolean> {
  switch (verificacao.tipo) {
    case "canal":
      return canalVale(contexto, verificacao)
    case "etiqueta_conversa":
      return etiquetaVale(contexto, verificacao)
    case "atendente":
      return atendenteVale(contexto, verificacao)
    case "card_etapa":
      return cardEtapaVale(contexto, verificacao)
    case "tag_contato":
      return tagVale(contexto, verificacao)
    case "tipo_contato":
      return tipoVale(contexto, verificacao)
    case "classificacao":
      return classificacaoVale(contexto, verificacao)
    case "perfil_rfv":
      return perfilRfvVale(contexto, verificacao)
    case "campo_personalizado":
      return campoPersonalizadoVale(contexto, verificacao)
    case "horario_comercial":
      return horarioVale(contexto, verificacao)
    // Trazem a mensagem os gatilhos de mensagem e, depois dela, a saída de mensagem da espera (B28-03)
    case "texto_mensagem": {
      const mensagem = mensagemDoContexto(contexto)
      return mensagem !== null && textoDaMensagemVale(verificacao, mensagem.texto)
    }
    case "tipo_mensagem": {
      const mensagem = mensagemDoContexto(contexto)
      return mensagem !== null && tipoDaMensagemVale(verificacao, mensagem.tipoMensagem)
    }
    default:
      return false
  }
}

/** A mensagem que as condições leem: a que acabou a espera, ou a do gatilho de mensagem. */
function mensagemDoContexto({ mensagem, gatilho }: ContextoDaExecucao): { texto: string; tipoMensagem: string } | null {
  if (mensagem) return mensagem
  return "texto" in gatilho && "tipoMensagem" in gatilho ? gatilho : null
}

const palavras = (texto: string) => texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

/**
 * O procurado aparece na mensagem como palavras inteiras, em sequência: "oi" casa
 * com "Oi, tudo bem?", e não com "Boituva" nem com "oito" (B22-40, decidido pelo
 * Luan em 14/10). A última palavra aceita o plural com "s" ou "es": "preço" casa
 * com "preços". Procurado sem letra nem número ("?!") continua valendo como trecho.
 */
function contemPalavras(mensagem: string, procurado: string): boolean {
  const alvo = palavras(procurado)
  if (alvo.length === 0) return mensagem.includes(procurado)
  const texto = palavras(mensagem)
  const ultima = alvo.length - 1
  const casa = (palavra: string | undefined, j: number) =>
    palavra === alvo[j] || (j === ultima && (palavra === `${alvo[j]}s` || palavra === `${alvo[j]}es`))
  return texto.some((_, i) => alvo.every((__, j) => casa(texto[i + j], j)))
}

/**
 * O texto que o cliente escreveu contra o valor da verificação, sem distinguir
 * maiúsculas, acentos nem espaços repetidos. "Contém" e "contém alguma das
 * palavras" procuram palavras inteiras; a segunda separa o valor por vírgula.
 */
export function textoDaMensagemVale({ operador, valor }: Verificacao, texto: string): boolean {
  const mensagem = normalizarTexto(texto)
  const procurado = normalizarTexto(valor)
  switch (operador) {
    case "contem":
      return procurado !== "" && contemPalavras(mensagem, procurado)
    case "nao_contem":
      return procurado !== "" && !contemPalavras(mensagem, procurado)
    case "comeca_com":
      return procurado !== "" && mensagem.startsWith(procurado)
    case "igual":
      return procurado !== "" && mensagem === procurado
    case "contem_alguma":
      return valor
        .split(",")
        .map(normalizarTexto)
        .some((palavra) => palavra !== "" && contemPalavras(mensagem, palavra))
    default:
      return false
  }
}

export function tipoDaMensagemVale({ operador, valor }: Verificacao, tipoMensagem: string): boolean {
  if (operador === "e") return tipoMensagem === valor
  if (operador === "nao_e") return tipoMensagem !== valor
  return false
}

/** A hora de agora, no fuso da operação, contra o horário que a empresa gravou (ou o padrão). */
async function horarioVale({ supabase, gatilho }: ContextoDaExecucao, { operador }: Verificacao): Promise<boolean> {
  if (operador !== "dentro" && operador !== "fora") return false

  const { data, error } = await supabase
    .from("business_hours")
    .select("dias, inicio, fim")
    .eq("workspace_id", gatilho.workspaceId)
    .maybeSingle()
  if (error) throw error

  const fuso = await fusoDoWorkspace(supabase, gatilho.workspaceId)
  const dentro = dentroDoHorario(horarioDoBanco(data), new Date(), fuso)
  return operador === "dentro" ? dentro : !dentro
}

async function tagVale({ supabase, gatilho }: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "tem" && operador !== "nao_tem") return false
  if (!gatilho.contactId) return false

  const { data, error } = await supabase
    .from("contact_tags")
    .select("id")
    .eq("contact_id", gatilho.contactId)
    .eq("workspace_id", gatilho.workspaceId)
    .eq("tag", normalizarTag(valor))
    .limit(1)
    .maybeSingle()
  if (error) throw error

  const tem = data != null
  return operador === "tem" ? tem : !tem
}

/** Contato sem tipo "não é" nenhum tipo. */
/**
 * B38-04: o campo personalizado do contato pela comparação escolhida (as do filtro).
 * O tipo vem do banco, e o campo precisa ser da empresa do evento.
 */
async function campoPersonalizadoVale({ supabase, gatilho }: ContextoDaExecucao, { operador, valor, campo }: Verificacao): Promise<boolean> {
  if (!gatilho.contactId || !campo?.startsWith("campo:")) return false
  const campoId = campo.split(":")[2] ?? ""
  const { data: definicao, error: erroCampo } = await supabase
    .from("campos_personalizados")
    .select("tipo")
    .eq("id", campoId)
    .eq("workspace_id", gatilho.workspaceId)
    .maybeSingle()
  if (erroCampo) throw erroCampo
  if (!definicao) return false

  const { data: linha, error } = await supabase
    .from("contato_campos")
    .select("valor_texto, valor_numero, valor_data, valor_booleano, valor_opcoes")
    .eq("contact_id", gatilho.contactId)
    .eq("campo_id", campoId)
    .maybeSingle()
  if (error) throw error

  const tipo = definicao.tipo as TipoDeCampo
  // Em texto, o valor inteiro (pode ter vírgula); nos outros, a lista
  const varios = ["lista", "multipla", "numero", "dinheiro", "data"].includes(tipo)
  return campoAtende(tipo, linha ? valorDaLinha(linha) : null, operador, varios ? itensDaLista(valor) : [valor])
}

async function tipoVale({ supabase, gatilho }: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "e" && operador !== "nao_e") return false
  if (!gatilho.contactId) return false

  const { data, error } = await supabase
    .from("contacts")
    .select("tipo")
    .eq("id", gatilho.contactId)
    .eq("workspace_id", gatilho.workspaceId)
    .maybeSingle()
  if (error) throw error
  if (!data) return false

  const igual = data.tipo === valor
  return operador === "e" ? igual : !igual
}

/**
 * A classificação é a que o CRM mostra: calculada pela etapa dos cards
 * (`calcularClassificacao`), e não lida de `contacts.classificacao`, que nenhuma
 * tela usa (decisões, seção 7.1).
 */
async function classificacaoVale(
  { supabase, gatilho }: ContextoDaExecucao,
  { operador, valor }: Verificacao
): Promise<boolean> {
  if (operador !== "e" && operador !== "nao_e") return false
  if (!gatilho.contactId) return false

  const { data: cards, error } = await supabase
    .from("pipeline_cards")
    .select("funil, etapa")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("contact_id", gatilho.contactId)
  if (error) throw error

  const igual = calcularClassificacao(cards ?? []) === valor
  return operador === "e" ? igual : !igual
}

/**
 * B43-02: o perfil RFV da hora, pela regra da aba RFV dos Relatórios, sobre a base
 * da empresa inteira (`perfis_rfv_do_workspace`). Quem nunca comprou não tem perfil e
 * só passa com "Sem compras" marcado.
 */
async function perfilRfvVale(
  { supabase, gatilho }: ContextoDaExecucao,
  { operador, valor }: Verificacao
): Promise<boolean> {
  if (operador !== "e_um_de") return false
  if (!gatilho.contactId) return false

  const { data, error } = await supabase
    .rpc("perfis_rfv_do_workspace", { p_workspace: gatilho.workspaceId })
    .eq("contact_id", gatilho.contactId)
  if (error) throw error

  const perfil = data?.[0]?.perfil ?? SEM_COMPRAS
  return itensDaLista(valor).includes(perfil)
}

/**
 * O canal é o do número gravado na conversa, sem cair no número do workspace
 * como o envio faz: a condição pergunta pela conversa, e conversa sem número
 * não tem canal a afirmar.
 */
async function canalVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "e") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversations")
    .select("whatsapp_connection_id, conexao:whatsapp_connections(canal)")
    .eq("id", conversaId)
    .maybeSingle()
  if (error) throw error

  const conexaoId = data?.whatsapp_connection_id
  if (!conexaoId) return false
  if (valor.startsWith(PREFIXO_NUMERO)) return conexaoId === valor.slice(PREFIXO_NUMERO.length)

  // Muitos-para-um: o PostgREST devolve um objeto, mas a inferência do select vê uma lista.
  const canal = (data.conexao as unknown as { canal: string | null } | null)?.canal
  return canal != null && CANAL_DA_OPCAO[valor] === canal
}

async function etiquetaVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "tem" && operador !== "nao_tem") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversation_labels")
    .select("label_id")
    .eq("conversation_id", conversaId)
    .eq("label_id", valor)
    .maybeSingle()
  if (error) throw error

  const tem = data != null
  return operador === "tem" ? tem : !tem
}

async function atendenteVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "sem_atendente" && operador !== "e") return false
  const conversaId = await conversaDoEvento(contexto)
  if (!conversaId) return false

  const { data, error } = await contexto.supabase
    .from("conversations")
    .select("assigned_to")
    .eq("id", conversaId)
    .maybeSingle()
  if (error) throw error
  if (!data) return false

  return operador === "sem_atendente" ? data.assigned_to == null : data.assigned_to === valor
}

/** Valor no formato `funil:etapa`, o mesmo que o editor grava. */
async function cardEtapaVale(contexto: ContextoDaExecucao, { operador, valor }: Verificacao): Promise<boolean> {
  if (operador !== "esta_em") return false
  const { gatilho, supabase } = contexto
  if (!gatilho.contactId) return false
  const [funil, etapa] = valor.split(":")
  if (!funil || !etapa) return false

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select("etapa")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("contact_id", gatilho.contactId)
    .eq("funil", funil)
    .maybeSingle()
  if (error) throw error

  return data?.etapa === etapa
}
