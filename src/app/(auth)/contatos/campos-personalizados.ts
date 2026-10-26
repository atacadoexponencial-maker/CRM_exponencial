"use server"

import { revalidatePath } from "next/cache"
import { sessaoAtual } from "@/lib/sessao"
import {
  conferirValor,
  valorDaLinha,
  type CampoPersonalizado,
  type EntradaDoCampo,
  type TipoDeCampo,
  type ValorGuardado,
} from "@/lib/campos-personalizados"

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

/** Os campos da empresa, na ordem dela. */
async function camposDaEmpresa(
  supabase: Awaited<ReturnType<typeof sessaoAtual>>["supabase"],
  workspaceId: string
): Promise<CampoPersonalizado[]> {
  const { data } = await supabase
    .from("campos_personalizados")
    .select("id, nome, tipo, ordem, created_at, campo_opcoes (id, nome, ordem)")
    .eq("workspace_id", workspaceId)
    .order("ordem")
    .order("created_at")
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo as TipoDeCampo,
    opcoes: [...(c.campo_opcoes ?? [])].sort((a, b) => a.ordem - b.ordem).map((o) => ({ id: o.id, nome: o.nome })),
  }))
}

/** Os campos da empresa com o valor deste contato. null se a pessoa não vê o contato. */
export async function camposDoContato(contactId: string): Promise<CampoComValor[] | null> {
  const acesso = await contatoVisivel(contactId)
  if (!acesso) return null
  const { supabase, perfil } = acesso

  const campos = await camposDaEmpresa(supabase, perfil.workspace_id)
  if (campos.length === 0) return []
  const { data: linhas } = await supabase
    .from("contato_campos")
    .select("campo_id, valor_texto, valor_numero, valor_data, valor_booleano, valor_opcoes")
    .eq("contact_id", contactId)
  const porCampo = new Map((linhas ?? []).map((l) => [l.campo_id, valorDaLinha(l)]))
  return campos.map((c) => ({ ...c, valor: porCampo.get(c.id) ?? null }))
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
  const porId = new Map(campos.map((c) => [c.id, c]))
  const erros: Record<string, string> = {}
  const gravar: Array<{ campoId: string; valor: ValorGuardado }> = []
  const apagar: string[] = []

  for (const [campoId, entrada] of Object.entries(valores ?? {})) {
    const campo = porId.get(campoId)
    if (!campo) return { erro: "Campo não encontrado" }
    const conferido = conferirValor(campo, entrada)
    if ("erro" in conferido) erros[campoId] = conferido.erro
    else if (conferido.valor) gravar.push({ campoId, valor: conferido.valor })
    else apagar.push(campoId)
  }
  if (Object.keys(erros).length > 0) return { erros }

  if (gravar.length > 0) {
    const { error } = await supabase.from("contato_campos").upsert(
      gravar.map(({ campoId, valor }) => ({
        contact_id: contactId,
        campo_id: campoId,
        workspace_id: perfil.workspace_id,
        valor_texto: valor.texto,
        valor_numero: valor.numero,
        valor_data: valor.data,
        valor_booleano: valor.booleano,
        valor_opcoes: valor.opcoes,
      })),
      { onConflict: "contact_id,campo_id" }
    )
    if (error) return { erro: "Não foi possível salvar" }
  }
  if (apagar.length > 0) {
    const { error } = await supabase.from("contato_campos").delete().eq("contact_id", contactId).in("campo_id", apagar)
    if (error) return { erro: "Não foi possível salvar" }
  }

  revalidatePath(`/contatos/${contactId}`)
  revalidatePath("/configuracoes/campos")
  return {}
}
