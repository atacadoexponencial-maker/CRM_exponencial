"use server"

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import type { CampoDaEmpresa, CampoPersonalizado, EntradaDoCampo, ValorGuardado } from "@/lib/campos-personalizados"
import { camposDaEmpresa, conferirEntradas, gravarValores, valoresDosContatos } from "@/lib/campos-personalizados-servidor"
import { canonicoDoValor } from "@/lib/campos-personalizados"
import { campoPersonalizado } from "@/lib/filtro-contatos"
import { dispararCamposAlterados } from "@/lib/automacoes/gatilhos-do-crm"
import { registrarEdicao } from "./edicoes"

// B38-01: os campos personalizados no contato. Tudo roda com a sessão: o RLS de
// `contato_campos` deixa ler e gravar só quem vê o contato (Admin e Gerente, a
// empresa toda; o Atendente, os contatos que atende — SUP-B38-01).

export type CampoComValor = CampoPersonalizado & { valor: ValorGuardado | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function contatoVisivel(contactId: string) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil || !UUID.test(contactId ?? "")) return null
  const { data } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("workspace_id", perfil.workspace_id)
    .is("excluido_em", null)
    .maybeSingle()
  return data ? { supabase, perfil } : null
}

/** B38-02: os campos da empresa, na ordem dela (cadastro de novo contato e lista). */
export async function listarCamposDaEmpresa(): Promise<CampoDaEmpresa[]> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return []
  return camposDaEmpresa(supabase, perfil.workspace_id)
}

/** Os campos da empresa com o valor deste contato. null se a pessoa não vê o contato. */
export async function camposDoContato(contactId: string): Promise<CampoComValor[] | null> {
  const acesso = await contatoVisivel(contactId)
  if (!acesso) return null
  const { supabase, perfil } = acesso

  const campos = await camposDaEmpresa(supabase, perfil.workspace_id)
  if (campos.length === 0) return []
  const valores = (await valoresDosContatos(supabase, [contactId], campos.map((c) => c.id))).get(contactId) ?? {}
  return campos.map(({ id, nome, tipo, opcoes }) => ({ id, nome, tipo, opcoes, valor: valores[id] ?? null }))
}

export type ResultadoSalvarCampos = { erro?: string; erros?: Record<string, string> }

/**
 * Grava os campos que vierem em `valores` (id do campo → entrada). Entrada vazia apaga
 * o valor. Confere tudo antes de gravar: com um erro, nada é gravado.
 */
export async function salvarCamposDoContato(
  contactId: string,
  valores: Record<string, EntradaDoCampo>
): Promise<ResultadoSalvarCampos> {
  const acesso = await contatoVisivel(contactId)
  if (!acesso) return { erro: "Contato não encontrado" }
  const { supabase, perfil } = acesso

  const campos = await camposDaEmpresa(supabase, perfil.workspace_id)
  const conferidas = conferirEntradas(campos, valores)
  if ("erro" in conferidas || "erros" in conferidas) return conferidas
  // B38-04: os valores de antes, para disparar o gatilho só do que mudou de fato
  const tocados = [...conferidas.gravar.map((g) => g.campoId), ...conferidas.apagar]
  const antes = (await valoresDosContatos(supabase, [contactId], tocados)).get(contactId) ?? {}
  const gravado = await gravarValores(supabase, perfil.workspace_id, contactId, conferidas)
  if (gravado.erro) return gravado

  const novos = new Map(conferidas.gravar.map((g) => [g.campoId, g.valor]))
  const mudados = campos
    .filter((c) => tocados.includes(c.id))
    .map((c) => ({ nome: c.nome, campo: campoPersonalizado(c), antes: canonicoDoValor(c.tipo, antes[c.id] ?? null), valor: canonicoDoValor(c.tipo, novos.get(c.id) ?? null) }))
    .filter((m) => m.antes !== m.valor)
  await dispararCamposAlterados(perfil.workspace_id, contactId, mudados.map(({ campo, antes, valor }) => ({ campo, antes, valor })))
  // B53-10: "Dados editados" na timeline, com o nome dos campos que mudaram
  await registrarEdicao(supabase, { workspaceId: perfil.workspace_id, contactId, autorId: perfil.id, campos: mudados.map((m) => m.nome) })

  revalidatePath(`/contatos/${contactId}`)
  revalidatePath("/configuracoes/campos")
  return {}
}
