"use server"

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import { LIMITE_DE_ETAPAS, LIMITE_DE_FUNIS, NOME_MAXIMO, chaveDoNome, corDaEtapaValida, ehFunilFixo } from "@/lib/funis"

// B41-01: Admin e Gerente criam e editam os funis da empresa. Entrada e Recompra
// são fixos e não passam por aqui.

export type EtapaParaGerenciar = { id: string; nome: string; cor: string | null; ordem: number }
export type FunilParaGerenciar = { id: string; nome: string; etapas: EtapaParaGerenciar[]; cards: number }
export type FunisParaGerenciar = {
  fixos: Array<{ id: "entrada" | "recompra"; nome: string; etapas: number }>
  funis: FunilParaGerenciar[]
}

type Resultado = { erro?: string }

const SEM_PERMISSAO = "Sem permissão"
const FUNIL_FIXO = "Funil fixo não pode ser mudado"
const FUNIL_NAO_ENCONTRADO = "Funil não encontrado"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function quemGerencia() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil || !["admin", "gerente"].includes(perfil.role)) return null
  return { supabase, perfil }
}

function conferirNome(nome: string, oQue: "funil" | "etapa"): { erro: string } | { nome: string } {
  const limpo = (nome ?? "").trim()
  if (!limpo) return { erro: oQue === "funil" ? "Informe o nome do funil." : "Informe o nome da etapa." }
  if (limpo.length > NOME_MAXIMO) return { erro: `O nome passa de ${NOME_MAXIMO} caracteres.` }
  if (oQue === "funil" && ehFunilFixo(chaveDoNome(limpo))) return { erro: "Entrada e Recompra são nomes dos funis fixos." }
  return { nome: limpo }
}

function conferirEtapas(etapas: Array<{ nome: string; cor?: string | null }>): { erro: string } | { etapas: Array<{ nome: string; cor: string | null }> } {
  if (!Array.isArray(etapas) || etapas.length === 0) return { erro: "O funil precisa de ao menos uma etapa." }
  if (etapas.length > LIMITE_DE_ETAPAS) return { erro: `O funil pode ter até ${LIMITE_DE_ETAPAS} etapas.` }
  const vistas = new Set<string>()
  const limpas: Array<{ nome: string; cor: string | null }> = []
  for (const e of etapas) {
    const nome = conferirNome(e?.nome, "etapa")
    if ("erro" in nome) return nome
    if (vistas.has(chaveDoNome(nome.nome))) return { erro: `A etapa "${nome.nome}" aparece duas vezes.` }
    vistas.add(chaveDoNome(nome.nome))
    if (!corDaEtapaValida(e.cor)) return { erro: "Cor inválida." }
    limpas.push({ nome: nome.nome, cor: e.cor || null })
  }
  return { etapas: limpas }
}

async function nomeDeFunilLivre(
  supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"],
  workspaceId: string,
  nome: string,
  ignorarId?: string
): Promise<boolean> {
  const { data } = await supabase.from("funis").select("id, nome").eq("workspace_id", workspaceId)
  return !(data ?? []).some((f) => f.id !== ignorarId && chaveDoNome(f.nome) === chaveDoNome(nome))
}

function revalidar() {
  revalidatePath("/configuracoes/funis")
  revalidatePath("/pipeline", "layout")
}

export async function listarFunisParaGerenciar(): Promise<FunisParaGerenciar> {
  const fixos: FunisParaGerenciar["fixos"] = [
    { id: "entrada", nome: "Funil de Entrada", etapas: 8 },
    { id: "recompra", nome: "Funil de Recompra", etapas: 7 },
  ]
  const quem = await quemGerencia()
  if (!quem) return { fixos, funis: [] }
  const { supabase, perfil } = quem

  const { data: funis } = await supabase
    .from("funis")
    .select("id, nome, created_at, funil_etapas (id, nome, cor, ordem)")
    .eq("workspace_id", perfil.workspace_id)
    .order("created_at")
  const ids = (funis ?? []).map((f) => f.id)
  const { data: cards } = ids.length > 0
    ? await supabase.from("pipeline_cards").select("funil").in("funil", ids)
    : { data: [] as Array<{ funil: string }> }
  const cardsPorFunil: Record<string, number> = {}
  for (const c of cards ?? []) cardsPorFunil[c.funil] = (cardsPorFunil[c.funil] ?? 0) + 1

  return {
    fixos,
    funis: (funis ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      etapas: [...(f.funil_etapas ?? [])].sort((a, b) => a.ordem - b.ordem).map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, ordem: e.ordem })),
      cards: cardsPorFunil[f.id] ?? 0,
    })),
  }
}

export async function criarFunil(nome: string, etapas: Array<{ nome: string; cor?: string | null }>): Promise<{ id?: string; erro?: string }> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const { supabase, perfil } = quem

  const nomeOk = conferirNome(nome, "funil")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  const etapasOk = conferirEtapas(etapas)
  if ("erro" in etapasOk) return { erro: etapasOk.erro }

  const { count } = await supabase.from("funis").select("id", { count: "exact", head: true }).eq("workspace_id", perfil.workspace_id)
  if ((count ?? 0) >= LIMITE_DE_FUNIS) return { erro: `A empresa pode ter até ${LIMITE_DE_FUNIS} funis.` }
  if (!(await nomeDeFunilLivre(supabase, perfil.workspace_id, nomeOk.nome))) return { erro: "Já existe um funil com esse nome." }

  const { data, error } = await supabase.rpc("criar_funil", { p_nome: nomeOk.nome, p_etapas: etapasOk.etapas })
  if (error?.code === "23505") return { erro: "Já existe um funil com esse nome." }
  if (error || !data) return { erro: "Não foi possível criar o funil. Tente de novo." }

  revalidar()
  return { id: data }
}

export async function renomearFunil(funilId: string, nome: string): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (ehFunilFixo(funilId)) return { erro: FUNIL_FIXO }
  if (!UUID.test(funilId)) return { erro: FUNIL_NAO_ENCONTRADO }
  const { supabase, perfil } = quem

  const nomeOk = conferirNome(nome, "funil")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  if (!(await nomeDeFunilLivre(supabase, perfil.workspace_id, nomeOk.nome, funilId))) return { erro: "Já existe um funil com esse nome." }

  const { data, error } = await supabase
    .from("funis")
    .update({ nome: nomeOk.nome })
    .eq("id", funilId)
    .eq("workspace_id", perfil.workspace_id)
    .select("id")
    .maybeSingle()
  if (error?.code === "23505") return { erro: "Já existe um funil com esse nome." }
  if (error) return { erro: "Não foi possível renomear o funil. Tente de novo." }
  if (!data) return { erro: FUNIL_NAO_ENCONTRADO }

  revalidar()
  return {}
}

export async function adicionarEtapa(funilId: string, nome: string, cor: string | null): Promise<{ id?: string; erro?: string }> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (ehFunilFixo(funilId)) return { erro: FUNIL_FIXO }
  if (!UUID.test(funilId)) return { erro: FUNIL_NAO_ENCONTRADO }
  const { supabase, perfil } = quem

  const nomeOk = conferirNome(nome, "etapa")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  if (!corDaEtapaValida(cor)) return { erro: "Cor inválida." }

  const { data: funil } = await supabase
    .from("funis")
    .select("id, funil_etapas (nome, ordem)")
    .eq("id", funilId)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  if (!funil) return { erro: FUNIL_NAO_ENCONTRADO }
  const etapas = funil.funil_etapas ?? []
  if (etapas.length >= LIMITE_DE_ETAPAS) return { erro: `O funil pode ter até ${LIMITE_DE_ETAPAS} etapas.` }
  if (etapas.some((e) => chaveDoNome(e.nome) === chaveDoNome(nomeOk.nome))) return { erro: "Já existe uma etapa com esse nome neste funil." }

  const ordem = etapas.reduce((m, e) => Math.max(m, e.ordem + 1), 0)
  const { data, error } = await supabase
    .from("funil_etapas")
    .insert({ funil_id: funilId, workspace_id: perfil.workspace_id, nome: nomeOk.nome, cor: cor || null, ordem })
    .select("id")
    .single()
  if (error?.code === "23505") return { erro: "Já existe uma etapa com esse nome neste funil." }
  if (error || !data) return { erro: "Não foi possível acrescentar a etapa. Tente de novo." }

  revalidar()
  return { id: data.id }
}

export async function editarEtapa(etapaId: string, mudancas: { nome?: string; cor?: string | null }): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!UUID.test(etapaId)) return { erro: FUNIL_FIXO }
  const { supabase, perfil } = quem

  const { data: etapa } = await supabase
    .from("funil_etapas")
    .select("id, funil_id")
    .eq("id", etapaId)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  if (!etapa) return { erro: "Etapa não encontrada" }

  const atualizar: { nome?: string; cor?: string | null } = {}
  if (mudancas.nome !== undefined) {
    const nomeOk = conferirNome(mudancas.nome, "etapa")
    if ("erro" in nomeOk) return { erro: nomeOk.erro }
    const { data: irmas } = await supabase.from("funil_etapas").select("id, nome").eq("funil_id", etapa.funil_id)
    if ((irmas ?? []).some((e) => e.id !== etapaId && chaveDoNome(e.nome) === chaveDoNome(nomeOk.nome))) {
      return { erro: "Já existe uma etapa com esse nome neste funil." }
    }
    atualizar.nome = nomeOk.nome
  }
  if (mudancas.cor !== undefined) {
    if (!corDaEtapaValida(mudancas.cor)) return { erro: "Cor inválida." }
    atualizar.cor = mudancas.cor || null
  }
  if (Object.keys(atualizar).length === 0) return {}

  const { error } = await supabase.from("funil_etapas").update(atualizar).eq("id", etapaId)
  if (error?.code === "23505") return { erro: "Já existe uma etapa com esse nome neste funil." }
  if (error) return { erro: "Não foi possível salvar a etapa. Tente de novo." }

  revalidar()
  return {}
}
