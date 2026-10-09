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
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 5, 8, 11 e 22.

import { createServiceClient } from "@/integrations/supabase/service"
import { normalizarTexto } from "@/lib/catalogo/planilha"
import {
  gatilhoDoFluxo,
  lerRepeticao,
  normalizarTag,
  percorrerFluxo,
  problemasDeEstrutura,
  type BlocoGatilho,
  type Fluxo,
} from "@/lib/fluxo-automacao"
import { executarAcao } from "./acoes"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "./contexto"
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
  fluxo: Fluxo
}

/** Motivo das regras que o prazo da fila não deixou começar (B22-06). */
export const SEM_TEMPO = "Não rodou: o tempo desta execução acabou antes de chegar nesta regra"

export interface OpcoesDoProcessamento {
  /** Hora (em ms, como `Date.now()`) depois da qual nenhuma regra começa. */
  prazo?: number
}

export async function processarAutomacoes(gatilho: GatilhoAutomacao, opcoes: OpcoesDoProcessamento = {}): Promise<void> {
  try {
    const supabase = createServiceClient()

    // B13-03: nada dispara para contato na lixeira.
    if (gatilho.contactId) {
      const { data: naLixeira } = await supabase.rpc("contato_na_lixeira", { p_contact_id: gatilho.contactId })
      if (naLixeira) return
    }

    const contexto: ContextoDaExecucao = { supabase, gatilho }

    for (const regra of await carregarRegras(supabase, gatilho)) {
      const blocoGatilho = gatilhoDoFluxo(regra.fluxo)
      if (!blocoGatilho || problemasDeEstrutura(regra.fluxo).length > 0) continue
      if (!gatilhoCorresponde(blocoGatilho, gatilho)) continue
      if (opcoes.prazo !== undefined && Date.now() >= opcoes.prazo) {
        await registrarExecucao(supabase, { gatilho, regra, resultado: "falhou", motivo: SEM_TEMPO })
        continue
      }
      await executarRegra(contexto, regra)
    }
  } catch {
    // Automação nunca pode derrubar o fluxo principal (envio, webhook, pipeline)
  }
}

/** Proteção, percurso e registro de uma regra. Cada regra é isolada: nada aqui sobe. */
async function executarRegra(contexto: ContextoDaExecucao, regra: RegraCarregada): Promise<void> {
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
    const caminho = await percorrerFluxo(regra.fluxo, {
      avaliarVerificacao: (verificacao) => verificacaoVale(contexto, verificacao),
      executarAcao: (bloco) => executarAcao(contexto, bloco),
    })
    await registrarExecucao(supabase, {
      gatilho,
      regra,
      resultado: resultadoDoCaminho(caminho),
      motivo: caminho.erro?.motivo,
      passos: passosDoCaminho(regra.fluxo, caminho),
    })
  } catch {
    await registrarExecucao(supabase, { gatilho, regra, resultado: "falhou", motivo: "Erro inesperado ao rodar a regra" })
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
    // Fluxo fora do formato (gravado por fora do editor) não roda
    const fluxo = lerFluxo(r.fluxo)
    if (!fluxo) continue
    regras.push({
      id: r.id,
      nome: r.nome,
      repeticao: lerRepeticao(r.repeticao),
      criadaEm: r.created_at,
      fluxo,
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
      return p.campo === gatilho.campo && (!p.valor || normalizarTexto(p.valor) === normalizarTexto(gatilho.valor))
    default:
      return true
  }
}
