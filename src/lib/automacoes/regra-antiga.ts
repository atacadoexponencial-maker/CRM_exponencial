// Regra da primeira versão (tabela `automations`: um gatilho e uma ação) vista
// como fluxo de dois blocos, gatilho → ação. O motor monta isto na hora, a cada
// evento, em vez de copiar as regras para `automation_flows`: até o merge do
// branch da B11, a produção continua editando `automations`, e uma cópia
// ficaria desatualizada.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 5.2.

import type { AcaoTipo, Fluxo, GatilhoTipo, Parametros } from "@/lib/fluxo-automacao"
import type { Json } from "@/integrations/supabase/types"

export interface RegraAntiga {
  gatilho_tipo: string
  gatilho_config: Json
  acao_tipo: string
  acao_config: Json
}

/** `gatilho_config` e `acao_config` usam as mesmas chaves dos parâmetros do editor; nulos e vazios ficam de fora. */
function parametrosDaConfig(config: Json): Parametros {
  const parametros: Parametros = {}
  if (!config || typeof config !== "object" || Array.isArray(config)) return parametros
  for (const [chave, valor] of Object.entries(config)) {
    if (typeof valor === "string" && valor !== "") parametros[chave] = valor
  }
  return parametros
}

export function fluxoDaRegraAntiga(regra: RegraAntiga): Fluxo {
  return {
    blocos: [
      {
        id: "gatilho",
        tipo: "gatilho",
        gatilho: regra.gatilho_tipo as GatilhoTipo,
        parametros: parametrosDaConfig(regra.gatilho_config),
        posicao: { x: 0, y: 0 },
      },
      {
        id: "acao",
        tipo: "acao",
        acao: regra.acao_tipo as AcaoTipo,
        parametros: parametrosDaConfig(regra.acao_config),
        posicao: { x: 0, y: 150 },
      },
    ],
    ligacoes: [{ de: "gatilho", saida: "proximo", para: "acao" }],
  }
}
