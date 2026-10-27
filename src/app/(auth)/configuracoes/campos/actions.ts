"use server"

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import { VARIAVEIS_FIXAS, chaveDaVariavel, trocarChave, variaveisDoTexto } from "@/lib/variaveis-mensagem"
import { itensDaLista } from "@/lib/fluxo-automacao"
import { campoPersonalizado, type Filtro } from "@/lib/filtro-contatos"
import { filtroDoSegmento, type Segmento } from "@/lib/segmento-campanha"
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

/** B38-05: a variável que o nome gera não pode ser a de outro campo nem uma fixa (SUP-B38-12). */
async function problemaDaVariavel({ supabase, perfil }: Quem, nome: string, ignorarId?: string): Promise<string | null> {
  const chave = chaveDaVariavel(nome)
  if (!chave) return "O nome precisa ter letras ou números."
  const { data } = await supabase.from("campos_personalizados").select("id, nome").eq("workspace_id", perfil.workspace_id)
  const deOutro = (data ?? []).some((c) => c.id !== ignorarId && chaveDaVariavel(c.nome) === chave)
  return deOutro || (VARIAVEIS_FIXAS as readonly string[]).includes(chave)
    ? `Esse nome gera a variável {{${chave}}}, que já é de outro campo ou do sistema.`
    : null
}

/**
 * B38-05: renomeado o campo, a variável nova entra no lugar da antiga, com o mesmo
 * reserva, nas automações, nas campanhas não enviadas e nas mensagens rápidas da
 * empresa (CA-B38-46). Com o service client: o Gerente renomeia o campo, mas não
 * grava automação.
 */
async function trocarVariavelNosTextos(workspaceId: string, antiga: string, nova: string): Promise<void> {
  const service = createServiceClient()
  const [{ data: fluxos }, { data: campanhas }, { data: rapidas }] = await Promise.all([
    service.from("automation_flows").select("id, fluxo").eq("workspace_id", workspaceId),
    service.from("campaigns").select("id, conteudo").eq("workspace_id", workspaceId).in("status", ["rascunho", "agendada"]),
    service.from("quick_replies").select("id, content").eq("workspace_id", workspaceId),
  ])
  for (const f of fluxos ?? []) {
    const fluxo = lerFluxo(f.fluxo)
    if (!fluxo) continue
    let mudou = false
    const blocos = fluxo.blocos.map((b) => {
      if (b.tipo !== "acao" || !b.parametros.texto) return b
      const texto = trocarChave(b.parametros.texto, antiga, nova)
      if (texto === b.parametros.texto) return b
      mudou = true
      return { ...b, parametros: { ...b.parametros, texto } }
    })
    if (mudou) await service.from("automation_flows").update({ fluxo: { ...fluxo, blocos } as unknown as Json }).eq("id", f.id)
  }
  for (const c of campanhas ?? []) {
    const conteudo = trocarChave(c.conteudo ?? "", antiga, nova)
    if (conteudo !== (c.conteudo ?? "")) await service.from("campaigns").update({ conteudo }).eq("id", c.id)
  }
  for (const r of rapidas ?? []) {
    const content = trocarChave(r.content, antiga, nova)
    if (content !== r.content) await service.from("quick_replies").update({ content }).eq("id", r.id)
  }
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
    .select("id, nome, tipo, ordem, created_at, campo_opcoes (id, nome, ordem)")
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
  const variavel = await problemaDaVariavel(quem, nomeOk.nome)
  if (variavel) return { erro: variavel }

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
  const variavel = await problemaDaVariavel(quem, nomeOk.nome, campoId)
  if (variavel) return { erro: variavel }

  const { data: antes } = await quem.supabase.from("campos_personalizados").select("nome").eq("id", campoId).single()
  const { error } = await quem.supabase.from("campos_personalizados").update({ nome: nomeOk.nome }).eq("id", campoId)
  if (error) return { erro: error.code === "23505" ? NOME_REPETIDO : "Não foi possível renomear o campo." }
  const [antiga, nova] = [chaveDaVariavel(antes?.nome ?? ""), chaveDaVariavel(nomeOk.nome)]
  if (antiga && antiga !== nova) await trocarVariavelNosTextos(quem.perfil.workspace_id, antiga, nova)
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

// ---------------------------------------------------------------------------
// B38-06: apagar campo e tirar opção, bloqueados enquanto estão em uso
// ---------------------------------------------------------------------------

/** Onde o campo (ou a opção) é usado, pelo nome de cada coisa (SUP-B38-02). */
export type UsadoEm = { automacoes: string[]; filtros: string[]; campanhas: string[] }

export type ResumoParaApagar = { erro?: string; preenchidos?: number; usadoEm?: UsadoEm }

const nadaUsa = (u: UsadoEm) => u.automacoes.length + u.filtros.length + u.campanhas.length === 0

const condicoesDoFiltro = (filtro: unknown): Array<{ campo: string; valores: string[] }> =>
  ((filtro as Filtro | null)?.grupos ?? []).flatMap((g) => g.condicoes ?? [])

/**
 * Automações (ligadas ou não), filtros salvos de Contatos e de Campanhas, e campanhas
 * em rascunho ou agendadas que usam o campo, ou só a opção quando ela vem. O campo
 * conta no gatilho, na condição, na ação e como variável no texto; a opção, quando é
 * um dos valores escolhidos. Com o service client: o Gerente apaga campo, mas não lê
 * automação.
 */
async function ondeUsa(workspaceId: string, campo: { id: string; tipo: string; nome: string }, opcaoId?: string): Promise<UsadoEm> {
  const service = createServiceClient()
  const idDoFiltro = campoPersonalizado(campo)
  const chave = chaveDaVariavel(campo.nome)
  const usaNoTexto = (texto: string) => !opcaoId && variaveisDoTexto(texto).some((v) => v.chave === chave)
  const usaOValor = (valor: string | undefined) => !opcaoId || itensDaLista(valor).includes(opcaoId)
  const usaNaCondicao = (c: { campo: string; valores: string[] }) => c.campo === idDoFiltro && (!opcaoId || c.valores.includes(opcaoId))

  const [{ data: fluxos }, { data: filtros }, { data: campanhas }] = await Promise.all([
    service.from("automation_flows").select("nome, fluxo").eq("workspace_id", workspaceId).order("nome"),
    service.from("filtros_salvos").select("nome, filtro").eq("workspace_id", workspaceId).order("nome"),
    service.from("campaigns").select("nome, segmento, conteudo").eq("workspace_id", workspaceId).in("status", ["rascunho", "agendada"]).order("nome"),
  ])

  const automacoes = (fluxos ?? []).filter((f) => {
    const fluxo = lerFluxo(f.fluxo)
    return !!fluxo?.blocos.some((b) => {
      if (b.tipo === "condicao") return b.verificacoes.some((v) => v.campo === idDoFiltro && usaOValor(v.valor))
      if (b.tipo !== "gatilho" && b.tipo !== "acao") return false
      return (b.parametros.campo === idDoFiltro && usaOValor(b.parametros.valor)) || usaNoTexto(b.parametros.texto ?? "")
    })
  })
  return {
    automacoes: automacoes.map((f) => f.nome),
    filtros: (filtros ?? []).filter((f) => condicoesDoFiltro(f.filtro).some(usaNaCondicao)).map((f) => f.nome),
    campanhas: (campanhas ?? [])
      .filter((c) => condicoesDoFiltro(filtroDoSegmento(c.segmento as Segmento)).some(usaNaCondicao) || usaNoTexto(c.conteudo ?? ""))
      .map((c) => c.nome),
  }
}

async function campoComNome({ supabase, perfil }: Quem, campoId: string) {
  if (!UUID.test(campoId ?? "")) return null
  const { data } = await supabase
    .from("campos_personalizados")
    .select("id, tipo, nome")
    .eq("id", campoId)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  return data
}

/** Quantos contatos perdem o valor e onde o campo (ou a opção) é usado, para a confirmação. */
export async function resumoParaApagar(campoId: string, opcaoId?: string): Promise<ResumoParaApagar> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const campo = await campoComNome(quem, campoId)
  if (!campo) return { erro: CAMPO_NAO_ENCONTRADO }

  let consulta = quem.supabase.from("contato_campos").select("contact_id", { count: "exact", head: true }).eq("campo_id", campoId)
  if (opcaoId) consulta = consulta.contains("valor_opcoes", [opcaoId])
  const { count } = await consulta
  return { preenchidos: count ?? 0, usadoEm: await ondeUsa(quem.perfil.workspace_id, campo, opcaoId) }
}

/** Apaga o campo e os valores dele, se nada usa o campo (CA-B38-12, CA-B38-13). */
export async function apagarCampo(campoId: string): Promise<{ erro?: string; usadoEm?: UsadoEm }> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const campo = await campoComNome(quem, campoId)
  if (!campo) return { erro: CAMPO_NAO_ENCONTRADO }

  const usadoEm = await ondeUsa(quem.perfil.workspace_id, campo)
  if (!nadaUsa(usadoEm)) return { erro: "O campo está em uso. Tire o campo dos lugares abaixo antes de apagar.", usadoEm }

  // Os valores e as opções saem junto (on delete cascade)
  const { error } = await quem.supabase.from("campos_personalizados").delete().eq("id", campoId)
  if (error) return { erro: "Não foi possível apagar o campo." }
  revalidar()
  return {}
}

/**
 * Tira a opção do campo, se nada usa a opção (CA-B38-10, CA-B38-45). Quem tinha a opção
 * fica sem ela: na lista, vazio; na múltipla escolha, com as outras.
 */
export async function tirarOpcao(campoId: string, opcaoId: string): Promise<{ erro?: string; usadoEm?: UsadoEm }> {
  const quem = await quemGerencia()
  if (!quem) return { erro: SEM_PERMISSAO }
  const campo = await campoComNome(quem, campoId)
  if (!campo) return { erro: CAMPO_NAO_ENCONTRADO }
  if (!(await opcoesDoCampo(quem, campoId)).some((o) => o.id === opcaoId)) return { erro: "Opção não encontrada" }

  const usadoEm = await ondeUsa(quem.perfil.workspace_id, campo, opcaoId)
  if (!nadaUsa(usadoEm)) return { erro: "A opção está em uso. Tire a opção dos lugares abaixo antes.", usadoEm }

  const { data: comAOpcao, error: erroLeitura } = await quem.supabase
    .from("contato_campos")
    .select("contact_id, valor_opcoes")
    .eq("campo_id", campoId)
    .contains("valor_opcoes", [opcaoId])
  if (erroLeitura) return { erro: "Não foi possível tirar a opção." }
  for (const linha of comAOpcao ?? []) {
    const restantes = ((linha.valor_opcoes ?? []) as string[]).filter((id) => id !== opcaoId)
    const { error } =
      restantes.length === 0
        ? await quem.supabase.from("contato_campos").delete().eq("contact_id", linha.contact_id).eq("campo_id", campoId)
        : await quem.supabase.from("contato_campos").update({ valor_opcoes: restantes }).eq("contact_id", linha.contact_id).eq("campo_id", campoId)
    if (error) return { erro: "Não foi possível tirar a opção." }
  }
  const { error } = await quem.supabase.from("campo_opcoes").delete().eq("id", opcaoId)
  if (error) return { erro: "Não foi possível tirar a opção." }
  revalidar()
  return {}
}
