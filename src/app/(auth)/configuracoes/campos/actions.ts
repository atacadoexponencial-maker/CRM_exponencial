"use server"

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import {
  LIMITE_DE_CAMPOS,
  LIMITE_DE_OPCOES,
  NOME_MAXIMO,
  ehNomeDoSistema,
  ehTipoDeCampo,
  mesmoNome,
  temOpcoes,
  type TipoDeCampo,
} from "@/lib/campos-personalizados"

// B38-01: Admin e Gerente criam os campos personalizados da empresa e as opções das
// listas. O tipo não muda depois de criado (o banco também segura).

export type OpcaoParaGerenciar = { id: string; nome: string; ordem: number }
export type CampoParaGerenciar = {
  id: string
  nome: string
  tipo: TipoDeCampo
  ordem: number
  /** B38-02: aparece como coluna na lista de Contatos. */
  mostrarNaLista: boolean
  opcoes: OpcaoParaGerenciar[]
  /** Contatos com valor neste campo (fora da lixeira). */
  preenchidos: number
}

type Resultado = { erro?: string }

const SEM_PERMISSAO = "Sem permissão"
const CAMPO_NAO_ENCONTRADO = "Campo não encontrado"
const NOME_REPETIDO = "Já existe um campo com esse nome."
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function quemGerencia() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil || !["admin", "gerente"].includes(perfil.role)) return null
  return { supabase, perfil }
}

type Quem = NonNullable<Awaited<ReturnType<typeof quemGerencia>>>

function conferirNome(nome: string, oQue: "campo" | "opção"): { erro: string } | { nome: string } {
  const limpo = (nome ?? "").trim()
  if (!limpo) return { erro: oQue === "campo" ? "Informe o nome do campo." : "Informe o nome da opção." }
  if (limpo.length > NOME_MAXIMO) return { erro: `O nome passa de ${NOME_MAXIMO} caracteres.` }
  if (oQue === "campo" && ehNomeDoSistema(limpo)) return { erro: `"${limpo}" já é o nome de um dado do sistema.` }
  return { nome: limpo }
}

function conferirOpcoes(opcoes: string[]): { erro: string } | { opcoes: string[] } {
  if (!Array.isArray(opcoes) || opcoes.length === 0) return { erro: "A lista precisa de ao menos uma opção." }
  if (opcoes.length > LIMITE_DE_OPCOES) return { erro: `O campo pode ter até ${LIMITE_DE_OPCOES} opções.` }
  const limpas: string[] = []
  for (const o of opcoes) {
    const nome = conferirNome(o, "opção")
    if ("erro" in nome) return nome
    if (limpas.some((l) => mesmoNome(l, nome.nome))) return { erro: `A opção "${nome.nome}" aparece duas vezes.` }
    limpas.push(nome.nome)
  }
  return { opcoes: limpas }
}

async function nomeDeCampoLivre({ supabase, perfil }: Quem, nome: string, ignorarId?: string): Promise<boolean> {
  const { data } = await supabase.from("campos_personalizados").select("id, nome").eq("workspace_id", perfil.workspace_id)
  return !(data ?? []).some((c) => c.id !== ignorarId && mesmoNome(c.nome, nome))
}

async function campoDaEmpresa({ supabase, perfil }: Quem, campoId: string) {
  if (!UUID.test(campoId ?? "")) return null
  const { data } = await supabase
    .from("campos_personalizados")
    .select("id, tipo")
    .eq("id", campoId)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  return data
}

async function opcoesDoCampo({ supabase }: Quem, campoId: string) {
  const { data } = await supabase.from("campo_opcoes").select("id, nome, ordem").eq("campo_id", campoId).order("ordem")
  return data ?? []
}

function revalidar() {
  revalidatePath("/configuracoes/campos")
  revalidatePath("/contatos", "layout")
}

export async function listarCamposParaGerenciar(): Promise<CampoParaGerenciar[]> {
  const quem = await quemGerencia()
  if (!quem) return []
  const { supabase, perfil } = quem

  const { data: campos } = await supabase
    .from("campos_personalizados")
    .select("id, nome, tipo, ordem, mostrar_na_lista, created_at, campo_opcoes (id, nome, ordem)")
    .eq("workspace_id", perfil.workspace_id)
    .order("ordem")
    .order("created_at")
  const ids = (campos ?? []).map((c) => c.id)
  const { data: valores } = ids.length > 0
    ? await supabase.from("contato_campos").select("campo_id, contacts!inner(excluido_em)").in("campo_id", ids).is("contacts.excluido_em", null)
    : { data: [] as Array<{ campo_id: string }> }
  const preenchidos: Record<string, number> = {}
  for (const v of valores ?? []) preenchidos[v.campo_id] = (preenchidos[v.campo_id] ?? 0) + 1

  return (campos ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo as TipoDeCampo,
    ordem: c.ordem,
    mostrarNaLista: c.mostrar_na_lista,
    opcoes: [...(c.campo_opcoes ?? [])].sort((a, b) => a.ordem - b.ordem),
    preenchidos: preenchidos[c.id] ?? 0,
  }))
}

export async function criarCampo(nome: string, tipo: string, opcoes: string[] = []): Promise<{ id?: string; erro?: string }> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const { supabase, perfil } = quem

  const nomeOk = conferirNome(nome, "campo")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  if (!ehTipoDeCampo(tipo)) return { erro: "Escolha o tipo do campo." }
  const opcoesOk = temOpcoes(tipo) ? conferirOpcoes(opcoes) : { opcoes: [] as string[] }
  if ("erro" in opcoesOk) return { erro: opcoesOk.erro }

  const { data: existentes } = await supabase.from("campos_personalizados").select("ordem").eq("workspace_id", perfil.workspace_id)
  if ((existentes ?? []).length >= LIMITE_DE_CAMPOS) return { erro: `A empresa pode ter até ${LIMITE_DE_CAMPOS} campos.` }
  if (!(await nomeDeCampoLivre(quem, nomeOk.nome))) return { erro: NOME_REPETIDO }

  const ordem = Math.max(-1, ...(existentes ?? []).map((c) => c.ordem)) + 1
  const { data: campo, error } = await supabase
    .from("campos_personalizados")
    .insert({ workspace_id: perfil.workspace_id, nome: nomeOk.nome, tipo, ordem })
    .select("id")
    .single()
  if (error || !campo) return { erro: error?.code === "23505" ? NOME_REPETIDO : "Não foi possível criar o campo." }

  if (opcoesOk.opcoes.length > 0) {
    const { error: erroOpcoes } = await supabase
      .from("campo_opcoes")
      .insert(opcoesOk.opcoes.map((o, i) => ({ campo_id: campo.id, workspace_id: perfil.workspace_id, nome: o, ordem: i })))
    if (erroOpcoes) {
      await supabase.from("campos_personalizados").delete().eq("id", campo.id)
      return { erro: "Não foi possível criar o campo." }
    }
  }
  revalidar()
  return { id: campo.id }
}

export async function renomearCampo(campoId: string, nome: string): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!(await campoDaEmpresa(quem, campoId))) return { erro: CAMPO_NAO_ENCONTRADO }

  const nomeOk = conferirNome(nome, "campo")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  if (!(await nomeDeCampoLivre(quem, nomeOk.nome, campoId))) return { erro: NOME_REPETIDO }

  const { error } = await quem.supabase.from("campos_personalizados").update({ nome: nomeOk.nome }).eq("id", campoId)
  if (error) return { erro: error.code === "23505" ? NOME_REPETIDO : "Não foi possível renomear o campo." }
  revalidar()
  return {}
}

export async function adicionarOpcao(campoId: string, nome: string): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const campo = await campoDaEmpresa(quem, campoId)
  if (!campo) return { erro: CAMPO_NAO_ENCONTRADO }
  if (!temOpcoes(campo.tipo)) return { erro: "Só Lista de opções e Múltipla escolha têm opções." }

  const nomeOk = conferirNome(nome, "opção")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  const opcoes = await opcoesDoCampo(quem, campoId)
  if (opcoes.length >= LIMITE_DE_OPCOES) return { erro: `O campo pode ter até ${LIMITE_DE_OPCOES} opções.` }
  if (opcoes.some((o) => mesmoNome(o.nome, nomeOk.nome))) return { erro: `A opção "${nomeOk.nome}" já existe.` }

  const ordem = Math.max(-1, ...opcoes.map((o) => o.ordem)) + 1
  const { error } = await quem.supabase
    .from("campo_opcoes")
    .insert({ campo_id: campoId, workspace_id: quem.perfil.workspace_id, nome: nomeOk.nome, ordem })
  if (error) return { erro: "Não foi possível acrescentar a opção." }
  revalidar()
  return {}
}

export async function renomearOpcao(campoId: string, opcaoId: string, nome: string): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!(await campoDaEmpresa(quem, campoId))) return { erro: CAMPO_NAO_ENCONTRADO }

  const nomeOk = conferirNome(nome, "opção")
  if ("erro" in nomeOk) return { erro: nomeOk.erro }
  const opcoes = await opcoesDoCampo(quem, campoId)
  if (!opcoes.some((o) => o.id === opcaoId)) return { erro: "Opção não encontrada" }
  if (opcoes.some((o) => o.id !== opcaoId && mesmoNome(o.nome, nomeOk.nome))) return { erro: `A opção "${nomeOk.nome}" já existe.` }

  const { error } = await quem.supabase.from("campo_opcoes").update({ nome: nomeOk.nome }).eq("id", opcaoId)
  if (error) return { erro: "Não foi possível renomear a opção." }
  revalidar()
  return {}
}

/** Troca a opção de lugar com a vizinha de cima ou de baixo. */
export async function moverOpcao(campoId: string, opcaoId: string, direcao: "subir" | "descer"): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!(await campoDaEmpresa(quem, campoId))) return { erro: CAMPO_NAO_ENCONTRADO }

  const opcoes = await opcoesDoCampo(quem, campoId)
  const i = opcoes.findIndex((o) => o.id === opcaoId)
  if (i < 0) return { erro: "Opção não encontrada" }
  const j = direcao === "subir" ? i - 1 : i + 1
  if (j < 0 || j >= opcoes.length) return {}

  const novas = [...opcoes]
  ;[novas[i], novas[j]] = [novas[j], novas[i]]
  for (const [ordem, o] of novas.entries()) {
    if (o.ordem === ordem) continue
    const { error } = await quem.supabase.from("campo_opcoes").update({ ordem }).eq("id", o.id)
    if (error) return { erro: "Não foi possível mudar a ordem." }
  }
  revalidar()
  return {}
}

/** B38-02: troca o campo de lugar com o vizinho de cima ou de baixo (CA-B38-11). */
export async function moverCampo(campoId: string, direcao: "subir" | "descer"): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!(await campoDaEmpresa(quem, campoId))) return { erro: CAMPO_NAO_ENCONTRADO }

  const { data } = await quem.supabase
    .from("campos_personalizados")
    .select("id, ordem")
    .eq("workspace_id", quem.perfil.workspace_id)
    .order("ordem")
    .order("created_at")
  const campos = data ?? []
  const i = campos.findIndex((c) => c.id === campoId)
  const j = direcao === "subir" ? i - 1 : i + 1
  if (j < 0 || j >= campos.length) return {}

  const novos = [...campos]
  ;[novos[i], novos[j]] = [novos[j], novos[i]]
  for (const [ordem, c] of novos.entries()) {
    if (c.ordem === ordem) continue
    const { error } = await quem.supabase.from("campos_personalizados").update({ ordem }).eq("id", c.id)
    if (error) return { erro: "Não foi possível mudar a ordem." }
  }
  revalidar()
  return {}
}

/** B38-02: marca ou desmarca "Mostrar na lista de Contatos" (CA-B38-47). */
export async function marcarNaLista(campoId: string, mostrar: boolean): Promise<Resultado> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  if (!(await campoDaEmpresa(quem, campoId))) return { erro: CAMPO_NAO_ENCONTRADO }
  const { error } = await quem.supabase.from("campos_personalizados").update({ mostrar_na_lista: mostrar === true }).eq("id", campoId)
  if (error) return { erro: "Não foi possível salvar." }
  revalidar()
  return {}
}
