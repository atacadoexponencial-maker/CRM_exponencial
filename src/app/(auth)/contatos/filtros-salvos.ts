"use server"

// B37-03: filtros salvos da lista de contatos. Todos da empresa leem; só Admin e
// Gerente salvam, atualizam, renomeiam, mudam a ordem e apagam. A conferência de
// papel é feita aqui e de novo pela RLS de `filtros_salvos`.

import { sessaoAtual } from "@/lib/sessao"
import type { Json } from "@/integrations/supabase/types"
import { chaveDoNome, contarCondicoes, esquemaFiltro, limparFiltro, type Filtro } from "@/lib/filtro-contatos"

export type FiltroSalvo = { id: string; nome: string; filtro: Filtro }

type Resultado = { erro?: string; filtros?: FiltroSalvo[] }

const NOME_REPETIDO = "Já existe um filtro com esse nome."
const SEM_PERMISSAO = "Só Admin e Gerente mudam os filtros salvos."
const NAO_ENCONTRADO = "Filtro não encontrado."

export async function listarFiltrosSalvos(): Promise<FiltroSalvo[]> {
  const { supabase, perfil } = await sessaoAtual()
  if (!perfil) return []
  const { data } = await supabase
    .from("filtros_salvos")
    .select("id, nome, filtro")
    .eq("workspace_id", perfil.workspace_id)
    .order("posicao")
    .order("created_at")
  return (data ?? []).map((f) => ({ id: f.id, nome: f.nome, filtro: f.filtro as unknown as Filtro }))
}

async function gestor() {
  const sessao = await sessaoAtual()
  if (!sessao.perfil || !["admin", "gerente"].includes(sessao.perfil.role)) return null
  return { supabase: sessao.supabase, perfil: sessao.perfil }
}

function validarNome(nome: string): { nome: string; chave: string } | { erro: string } {
  const limpo = nome.trim().replace(/\s+/g, " ")
  if (!limpo) return { erro: "Dê um nome ao filtro." }
  if (limpo.length > 60) return { erro: "O nome pode ter até 60 letras." }
  return { nome: limpo, chave: chaveDoNome(limpo) }
}

/** Só o que filtra vai para o banco; filtro sem condição completa não se salva. */
function validarFiltro(filtro: Filtro): Filtro | { erro: string } {
  const validado = esquemaFiltro.safeParse(filtro)
  if (!validado.success) return { erro: "Filtro inválido." }
  const limpo = limparFiltro(validado.data as Filtro)
  if (contarCondicoes(limpo) === 0) return { erro: "Monte ao menos uma condição." }
  return limpo
}

const repetido = (codigo?: string) => codigo === "23505"

export async function salvarFiltro(nome: string, filtro: Filtro): Promise<Resultado> {
  const g = await gestor()
  if (!g) return { erro: SEM_PERMISSAO }
  const n = validarNome(nome)
  if ("erro" in n) return n
  const f = validarFiltro(filtro)
  if ("erro" in f) return f

  // Filtro novo entra no fim da faixa (CA-B37-38).
  const { data: ultimo } = await g.supabase
    .from("filtros_salvos")
    .select("posicao")
    .eq("workspace_id", g.perfil.workspace_id)
    .order("posicao", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await g.supabase.from("filtros_salvos").insert({
    workspace_id: g.perfil.workspace_id,
    nome: n.nome,
    nome_chave: n.chave,
    filtro: f as unknown as Json,
    posicao: (ultimo?.posicao ?? -1) + 1,
    criado_por: g.perfil.id,
  })
  if (repetido(error?.code)) return { erro: NOME_REPETIDO }
  if (error) return { erro: "Não foi possível salvar o filtro." }
  return { filtros: await listarFiltrosSalvos() }
}

export async function atualizarFiltroSalvo(id: string, filtro: Filtro): Promise<Resultado> {
  const g = await gestor()
  if (!g) return { erro: SEM_PERMISSAO }
  const f = validarFiltro(filtro)
  if ("erro" in f) return f
  const { data, error } = await g.supabase
    .from("filtros_salvos")
    .update({ filtro: f as unknown as Json, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", g.perfil.workspace_id)
    .select("id")
  if (error) return { erro: "Não foi possível atualizar o filtro." }
  if (!data?.length) return { erro: NAO_ENCONTRADO }
  return { filtros: await listarFiltrosSalvos() }
}

export async function renomearFiltroSalvo(id: string, nome: string): Promise<Resultado> {
  const g = await gestor()
  if (!g) return { erro: SEM_PERMISSAO }
  const n = validarNome(nome)
  if ("erro" in n) return n
  const { data, error } = await g.supabase
    .from("filtros_salvos")
    .update({ nome: n.nome, nome_chave: n.chave, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", g.perfil.workspace_id)
    .select("id")
  if (repetido(error?.code)) return { erro: NOME_REPETIDO }
  if (error) return { erro: "Não foi possível renomear o filtro." }
  if (!data?.length) return { erro: NAO_ENCONTRADO }
  return { filtros: await listarFiltrosSalvos() }
}

/** Troca o filtro de lugar com o vizinho da esquerda ou da direita (PER-B37-11). */
export async function moverFiltroSalvo(id: string, direcao: "esquerda" | "direita"): Promise<Resultado> {
  const g = await gestor()
  if (!g) return { erro: SEM_PERMISSAO }
  const filtros = await listarFiltrosSalvos()
  const i = filtros.findIndex((f) => f.id === id)
  if (i < 0) return { erro: NAO_ENCONTRADO }
  const j = direcao === "esquerda" ? i - 1 : i + 1
  if (j < 0 || j >= filtros.length) return { filtros }

  const nova = [...filtros]
  ;[nova[i], nova[j]] = [nova[j], nova[i]]
  // Regrava a ordem inteira: posições antigas podem estar repetidas.
  const resultados = await Promise.all(
    nova.map((f, posicao) =>
      g.supabase.from("filtros_salvos").update({ posicao }).eq("id", f.id).eq("workspace_id", g.perfil.workspace_id)
    )
  )
  if (resultados.some((r) => r.error)) return { erro: "Não foi possível mudar a ordem." }
  return { filtros: await listarFiltrosSalvos() }
}

export async function apagarFiltroSalvo(id: string): Promise<Resultado> {
  const g = await gestor()
  if (!g) return { erro: SEM_PERMISSAO }
  const { data, error } = await g.supabase
    .from("filtros_salvos")
    .delete()
    .eq("id", id)
    .eq("workspace_id", g.perfil.workspace_id)
    .select("id")
  if (error) return { erro: "Não foi possível apagar o filtro." }
  if (!data?.length) return { erro: NAO_ENCONTRADO }
  return { filtros: await listarFiltrosSalvos() }
}
