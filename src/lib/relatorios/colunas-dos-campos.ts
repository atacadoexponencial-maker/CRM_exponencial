// B38-08: os campos personalizados como colunas dos Excel que listam clientes ou vendas
// (lista do RFV, Vendas da Visão Geral e Pedidos do catálogo), na ordem da empresa.
// Dinheiro sai como moeda, data como data, e o resto como o texto que a tela mostra.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"
import type { ColunaPlanilha } from "@/lib/exportar-planilha"
import { formatarValor, type CampoDaEmpresa, type ValorGuardado } from "@/lib/campos-personalizados"
import { camposDaEmpresa, valoresDosContatos } from "@/lib/campos-personalizados-servidor"

export type CamposParaExportar = { campos: CampoDaEmpresa[]; valores: Map<string, Record<string, ValorGuardado>> }

/** Os campos da empresa e os valores dos contatos das linhas, com o cliente de quem baixa. */
export async function camposParaExportar(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactIds: string[]
): Promise<CamposParaExportar> {
  const campos = await camposDaEmpresa(supabase, workspaceId)
  const ids = [...new Set(contactIds.filter(Boolean))]
  const valores = campos.length > 0 ? await valoresDosContatos(supabase, ids, campos.map((c) => c.id)) : new Map()
  return { campos, valores }
}

/** Uma coluna por campo; sem valor (ou sem contato), a célula fica vazia. */
export function colunasDosCampos<T>(
  { campos, valores }: CamposParaExportar,
  contatoDe: (linha: T) => string | null | undefined
): ColunaPlanilha<T>[] {
  return campos.map((campo) => ({
    titulo: campo.nome,
    tipo: campo.tipo === "dinheiro" ? "moeda" : campo.tipo === "data" ? "data" : "texto",
    largura: Math.max(campo.nome.length + 4, 14),
    valor: (linha: T) => {
      const contato = contatoDe(linha)
      const valor = contato ? valores.get(contato)?.[campo.id] : undefined
      if (!valor) return null
      if (campo.tipo === "dinheiro") return valor.numero
      if (campo.tipo === "data" && valor.data) {
        const [a, m, d] = valor.data.split("-").map(Number)
        return new Date(a, m - 1, d)
      }
      return formatarValor(campo, valor)
    },
  }))
}
