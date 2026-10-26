// Motor de automações (B11-02): cada regra é um fluxo de blocos, percorrido a
// partir do gatilho. Condições seguem pelo "sim" ou pelo "não", ações executam
// e seguem mesmo se falharem, e o caminho termina numa saída sem ligação.
//
// As regras ficam em `automation_flows` e rodam na ordem de criação. As da
// primeira versão (`automations`, um gatilho e uma ação) saíram na B11-13.
//
// Antes de percorrer, a proteção de repetição da regra pode barrar o contato;
// depois, a execução é gravada no histórico, com o caminho (B11-03, `execucoes.ts`).
//
// Roda sempre no backend com o service client (o webhook não tem sessão de
// usuário) e nunca propaga erro para quem disparou o gatilho.
//
// Quem dispara não chama este arquivo direto (B11-09): grava o evento na fila
// (`fila.ts`), que chama `processarAutomacoes` logo depois da resposta, um evento
// de cada vez por contato. A fila passa um prazo (B22-06): depois dele nenhuma
// regra começa, e as que sobram ficam no histórico como falha, em vez de sumir
// quando a Vercel corta a função.
//
// O bloco "esperar" (B28-02) encerra o percurso nele: a execução fica gravada como
// "esperando", e quem a segue depois é o relógio (`esperas.ts`).
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 5, 8, 11 e 22.

import { createServiceClient } from "@/integrations/supabase/service"
import { normalizarTexto } from "@/lib/catalogo/planilha"
import {
  gatilhoDoFluxo,
  horaDoGatilho,
  itensDaLista,
  lerRepeticao,
  normalizarTag,
  SEM_COMPRAS,
  percorrerFluxo,
  problemasDoFluxo,
  type BlocoGatilho,
  type ExecutoresDoFluxo,
  type Fluxo,
} from "@/lib/fluxo-automacao"
import { executarAcao } from "./acoes"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "./contexto"
import { retomarEm, seguirEsperasPorMensagem } from "./esperas"
import {
  motivoParaIgnorar,
  passosDoCaminho,
  registrarExecucao,
  resultadoDoCaminho,
  type RegraDaExecucao,
} from "./execucoes"
import { lerFluxo } from "./fluxo-recebido"
import { verificacaoVale } from "./verificacoes"

export type { GatilhoAutomacao } from "./contexto"

interface RegraCarregada extends RegraDaExecucao {
  criadaEm: string
  /** `null`: gravado por fora do editor, fora do formato. */
  fluxo: Fluxo | null
}

/** B38-04: motivo da regra que já rodou na mesma sequência de mudanças de campo (PER-B38-14). */
export const JA_RODOU_NA_SEQUENCIA = "Não rodou: já rodou nesta sequência de mudanças"

/**
 * O valor do gatilho contra o valor novo. Em campo personalizado, número compara o
 * número, e múltipla escolha, o conjunto de opções em qualquer ordem; o resto, sem
 * diferença de maiúscula, acento e espaço, como as verificações de texto (B22-05).
 */
function mesmoValorDoCampo(campo: string, esperado: string, novo: string): boolean {
  const tipo = campo.startsWith("campo:") ? campo.split(":")[1] : null
  if (tipo === "numero" || tipo === "dinheiro") return novo !== "" && Number(esperado) === Number(novo)
  if (tipo === "multipla") {
    const a = itensDaLista(esperado).sort()
    const b = itensDaLista(novo).sort()
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return normalizarTexto(esperado) === normalizarTexto(novo)
}

/** Motivo da regra com fluxo fora do formato (B22-25). */
export const FLUXO_FORA_DO_FORMATO =
  "Não rodou: o fluxo desta regra está fora do formato. Exclua a regra e crie de novo pelo editor"

/** Motivo das regras que o prazo da fila não deixou começar (B22-06). */
export const SEM_TEMPO = "Não rodou: o tempo desta execução acabou antes de chegar nesta regra"
/** Motivo das regras de um evento que não entrou na fila (B22-07). */
export const SEM_FILA = "Não rodou: o evento não entrou na fila de automações (erro no banco)"

export interface OpcoesDoProcessamento {
  /** Hora (em ms, como `Date.now()`) depois da qual nenhuma regra começa. */
  prazo?: number
  /** Nenhuma regra roda: cada uma que o evento dispararia vai para o histórico como falha, com este motivo. */
  naoRodarPorque?: string
}

export async function processarAutomacoes(gatilho: GatilhoAutomacao, opcoes: OpcoesDoProcessamento = {}): Promise<void> {
  try {
    const supabase = createServiceClient()

    // B13-03: nada dispara para contato na lixeira.
    if (gatilho.contactId) {
      const { data: naLixeira } = await supabase.rpc("contato_na_lixeira", { p_contact_id: gatilho.contactId })
      if (naLixeira) return
    }

    // B28-03: a mensagem segue primeiro as esperas do contato, e só depois as regras do evento rodam
    if ((gatilho.tipo === "mensagem_recebida" || gatilho.tipo === "mensagem_enviada_time") && !opcoes.naoRodarPorque) {
      await seguirEsperasPorMensagem(supabase, gatilho)
    }

    const contexto: ContextoDaExecucao = { supabase, gatilho }

    for (const regra of await carregarRegras(supabase, gatilho)) {
      // B22-25: fluxo que não pode rodar (gravado por fora do editor) vai para o
      // histórico como falha, com o motivo, em vez de ser pulado em silêncio
      const { fluxo } = regra
      const blocoGatilho = fluxo ? gatilhoDoFluxo(fluxo) : undefined
      if (blocoGatilho && !gatilhoCorresponde(blocoGatilho, gatilho)) continue
      // B38-04: na sequência de mudanças de campo feitas por automações, cada regra roda uma vez
      if (gatilho.tipo === "dado_contato_alterado" && gatilho.sequencia?.includes(regra.id)) {
        await registrarExecucao(supabase, { gatilho, regra, resultado: "ignorada", motivo: JA_RODOU_NA_SEQUENCIA })
        continue
      }
      const semRodar =
        opcoes.naoRodarPorque ??
        motivoDoFluxo(fluxo) ??
        (opcoes.prazo !== undefined && Date.now() >= opcoes.prazo ? SEM_TEMPO : null)
      if (semRodar || !fluxo) {
        await registrarExecucao(supabase, { gatilho, regra, resultado: "falhou", motivo: semRodar ?? FLUXO_FORA_DO_FORMATO })
        continue
      }
      if (gatilho.tipo === "entrou_perfil_rfv") {
        // B43-03: a regra fica com a mudança antes de rodar; rotina repetida não roda de novo
        if (!(await ficarComAMudanca(supabase, regra.id, gatilho.mudancaId))) continue
        // B43-04: quem saiu do destino antes do horário (comprou de manhã) é pulado (CA-B43-19)
        const motivo = await motivoParaPularPerfil(supabase, gatilho, blocoGatilho)
        if (motivo) {
          await registrarExecucao(supabase, { gatilho, regra, resultado: motivo.resultado, motivo: motivo.texto })
          continue
        }
      }
      await executarRegra(contexto, { ...regra, fluxo })
    }
  } catch {
    // Automação nunca pode derrubar o fluxo principal (envio, webhook, pipeline)
  }
}

/** B43-04: motivo de quem já saiu do perfil de destino. */
export const SAIU_DO_PERFIL = "Não rodou: o contato já saiu do perfil de destino"

/**
 * B43-04: o contato ainda está num perfil de destino, pelo perfil da hora? Se não,
 * o motivo para o histórico. Erro do banco também não roda: melhor não mandar a
 * mensagem do que mandar para quem já voltou a comprar.
 */
async function motivoParaPularPerfil(
  supabase: ServiceClient,
  gatilho: Extract<GatilhoAutomacao, { tipo: "entrou_perfil_rfv" }>,
  bloco: BlocoGatilho | undefined
): Promise<{ resultado: "ignorada" | "falhou"; texto: string } | null> {
  const { data, error } = await supabase
    .rpc("perfis_rfv_do_workspace", { p_workspace: gatilho.workspaceId })
    .eq("contact_id", gatilho.contactId)
  if (error) return { resultado: "falhou", texto: "Não foi possível conferir o perfil RFV do contato" }
  const atual = data?.[0]?.perfil ?? SEM_COMPRAS
  return itensDaLista(bloco?.parametros.destinos).includes(atual) ? null : { resultado: "ignorada", texto: SAIU_DO_PERFIL }
}

/** B43-03: marca que a regra rodou para a mudança; false se ela já tinha rodado. */
async function ficarComAMudanca(supabase: ServiceClient, flowId: string, mudancaId: string): Promise<boolean> {
  const { error } = await supabase.from("disparos_perfil_rfv").insert({ flow_id: flowId, mudanca_id: mudancaId })
  return !error
}

/** Por que o fluxo não pode rodar, ou `null` se pode (B22-25). */
function motivoDoFluxo(fluxo: Fluxo | null): string | null {
  if (!fluxo) return FLUXO_FORA_DO_FORMATO
  const [problema] = problemasDoFluxo(fluxo)
  return problema ? `Não rodou: ${problema}. Abra a regra no editor para corrigir` : null
}

/** Proteção, percurso e registro de uma regra. Cada regra é isolada: nada aqui sobe. */
async function executarRegra(contexto: ContextoDaExecucao, regra: RegraCarregada & { fluxo: Fluxo }): Promise<void> {
  const { supabase, gatilho } = contexto

  let motivo: string | null
  try {
    motivo = await motivoParaIgnorar(supabase, regra, gatilho.contactId)
  } catch {
    // Melhor não disparar do que disparar em dobro
    await registrarExecucao(supabase, {
      gatilho,
      regra,
      resultado: "falhou",
      motivo: "Não foi possível conferir a proteção de repetição",
    })
    return
  }
  if (motivo) {
    await registrarExecucao(supabase, { gatilho, regra, resultado: "ignorada", motivo })
    return
  }

  try {
    const daRegra: ContextoDaExecucao = { ...contexto, regra: { id: regra.id, nome: regra.nome } }
    const caminho = await percorrerFluxo(regra.fluxo, executoresDaRegra(daRegra))
    const agora = new Date()
    // B28-02: parado num bloco "esperar", fica esperando; o relógio segue depois (`esperas.ts`)
    await registrarExecucao(supabase, {
      gatilho,
      regra,
      resultado: caminho.espera ? "esperando" : resultadoDoCaminho(caminho),
      motivo: caminho.erro?.motivo,
      passos: passosDoCaminho(regra.fluxo, caminho, agora),
      retomarEm: caminho.espera ? retomarEm(regra.fluxo, caminho.espera, agora) : null,
    })
  } catch {
    await registrarExecucao(supabase, { gatilho, regra, resultado: "falhou", motivo: "Erro inesperado ao rodar a regra" })
  }
}

/** Quem avalia e quem executa no motor: o mesmo para a regra que começa e para a que segue depois de uma espera. */
export function executoresDaRegra(contexto: ContextoDaExecucao): ExecutoresDoFluxo {
  return {
    avaliarVerificacao: (verificacao) => verificacaoVale(contexto, verificacao),
    executarAcao: (bloco) => executarAcao(contexto, bloco),
  }
}

/** Regras ativas do workspace para o gatilho, na ordem de criação. */
async function carregarRegras(supabase: ServiceClient, gatilho: GatilhoAutomacao): Promise<RegraCarregada[]> {
  const { data } = await supabase
    .from("automation_flows")
    .select("id, nome, created_at, fluxo, repeticao")
    .eq("workspace_id", gatilho.workspaceId)
    .eq("gatilho_tipo", gatilho.tipo)
    .eq("ativa", true)

  const regras: RegraCarregada[] = []
  for (const r of data ?? []) {
    // Fluxo fora do formato (gravado por fora do editor) não roda, mas vai para o histórico
    regras.push({
      id: r.id,
      nome: r.nome,
      repeticao: lerRepeticao(r.repeticao),
      criadaEm: r.created_at,
      fluxo: lerFluxo(r.fluxo),
    })
  }
  return regras.sort((a, b) => (a.criadaEm < b.criadaEm ? -1 : a.criadaEm > b.criadaEm ? 1 : 0))
}

/** O evento é o que o bloco de gatilho espera? Parâmetro vazio vale como "qualquer". */
export function gatilhoCorresponde(bloco: BlocoGatilho, gatilho: GatilhoAutomacao): boolean {
  if (bloco.gatilho !== gatilho.tipo) return false
  const p = bloco.parametros
  switch (gatilho.tipo) {
    case "card_movido":
      return (!p.funil || p.funil === gatilho.funil) && (!p.etapa || p.etapa === gatilho.etapa)
    case "tag_adicionada":
      return !p.tag || normalizarTag(p.tag) === gatilho.tag
    case "etiqueta_aplicada":
      return !p.label_id || p.label_id === gatilho.labelId
    case "dado_contato_alterado":
      // O campo é obrigatório no gatilho; o valor, não. Sem diferença de
      // maiúscula, acento e espaço, como as verificações de texto (B22-05)
      return p.campo === gatilho.campo && (!p.valor || mesmoValorDoCampo(p.campo, p.valor, gatilho.valor))
    case "entrou_perfil_rfv": {
      // B43-03: destino obrigatório; origem vazia vale como "de qualquer perfil"
      const origens = itensDaLista(p.origens)
      return (
        horaDoGatilho(p) === gatilho.hora &&
        itensDaLista(p.destinos).includes(gatilho.para) &&
        (origens.length === 0 || origens.includes(gatilho.de))
      )
    }
    default:
      return true
  }
}
