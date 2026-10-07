"use server"

// Importação por planilha (B18): a prévia lê e confere sem gravar; o lote grava. O servidor
// sempre relê o arquivo e confere de novo: não confia na prévia que ficou no navegador.

import { sessaoAtual } from "@/lib/sessao"
import { EXTENSOES_PLANILHA, interpretarPlanilha, MAX_LINHAS_PLANILHA, TAMANHO_MAX_PLANILHA } from "@/lib/catalogo/planilha"
import { gravarImportacao, lerArquivoPlanilha, montarPrevia, type PreviaImportacao, type ResultadoGravacao } from "@/lib/catalogo/importacao"

export type ResultadoPrevia = { erro: string } | { previa: PreviaImportacao }
export type ResultadoLote = { erro: string } | { lote: ResultadoGravacao }

/** Quantos produtos o navegador manda por vez (permite mostrar o progresso). */
const MAX_POR_LOTE = 25

async function lerEConferir(dados: FormData) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: "Sessão expirada. Entre de novo." } as const
  if (perfil.role !== "admin" && perfil.role !== "gerente") return { erro: "Só Admin e Gerente mexem no catálogo." } as const

  const arquivo = dados.get("arquivo")
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha a planilha para enviar." }
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? ""
  if (!EXTENSOES_PLANILHA.includes(extensao)) return { erro: "Envie a planilha do Excel ou o arquivo .csv do Google Planilhas." }
  if (arquivo.size > TAMANHO_MAX_PLANILHA) return { erro: "A planilha passa de 4 MB." }

  let matriz: unknown[][]
  try {
    matriz = lerArquivoPlanilha(arquivo.name, await arquivo.arrayBuffer())
  } catch {
    return { erro: "Não deu para ler o arquivo. Abra no Excel ou no Google Planilhas e salve de novo." }
  }

  const lida = interpretarPlanilha(matriz)
  if (lida.faltando.length > 0) {
    const nomes = lida.faltando.length === 1 ? `a coluna ${lida.faltando[0]}` : `as colunas ${lida.faltando.slice(0, -1).join(", ")} e ${lida.faltando.at(-1)}`
    return { erro: `${lida.faltando.length === 1 ? "Falta" : "Faltam"} ${nomes}. Use o modelo.` }
  }
  if (lida.totalLinhas === 0) return { erro: "A planilha não tem nenhum produto." }
  if (lida.totalLinhas > MAX_LINHAS_PLANILHA) return { erro: `A planilha passa de ${MAX_LINHAS_PLANILHA.toLocaleString("pt-BR")} linhas.` }
  return { supabase, perfil, lida } as const
}

export async function previaImportacao(dados: FormData): Promise<ResultadoPrevia> {
  const r = await lerEConferir(dados)
  if ("erro" in r) return { erro: r.erro! }
  return { previa: await montarPrevia(r.supabase, r.perfil.workspace_id, r.lida.produtos, r.lida.erros) }
}

/** Grava os produtos destes códigos (os que continuarem sem erro). */
export async function importarLote(dados: FormData): Promise<ResultadoLote> {
  let codigos: string[]
  try {
    codigos = JSON.parse(String(dados.get("codigos") ?? "[]"))
  } catch {
    return { erro: "Lote inválido." }
  }
  if (!Array.isArray(codigos) || codigos.length === 0 || codigos.length > MAX_POR_LOTE) return { erro: "Lote inválido." }
  const r = await lerEConferir(dados)
  if ("erro" in r) return { erro: r.erro! }
  const doLote = r.lida.produtos.filter((p) => codigos.includes(p.codigo))
  const previa = await montarPrevia(r.supabase, r.perfil.workspace_id, doLote, [])
  const prontos = new Set(previa.itens.map((i) => i.codigo))
  const lote = await gravarImportacao(r.supabase, r.perfil.workspace_id, doLote.filter((p) => prontos.has(p.codigo)))
  for (const e of previa.erros) lote.falhas.push({ codigo: e.codigo ?? "", texto: e.texto })
  return { lote }
}
