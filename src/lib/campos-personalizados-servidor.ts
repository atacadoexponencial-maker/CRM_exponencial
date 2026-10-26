// B38-02: leitura e gravação dos campos personalizados, usadas pelas actions do contato
// (perfil, Chat), pelo cadastro de novo contato e pela lista de Contatos. Recebe o
// cliente de quem chama: com a sessão, o RLS decide o que a pessoa lê e grava.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"
import {
  conferirValor,
  valorDaLinha,
  type CampoDaEmpresa,
  type EntradaDoCampo,
  type TipoDeCampo,
  type ValorGuardado,
} from "@/lib/campos-personalizados"

type Cliente = SupabaseClient<Database>

/** Os campos da empresa, na ordem dela. */
export async function camposDaEmpresa(supabase: Cliente, workspaceId: string): Promise<CampoDaEmpresa[]> {
  const { data } = await supabase
    .from("campos_personalizados")
    .select("id, nome, tipo, ordem, mostrar_na_lista, created_at, campo_opcoes (id, nome, ordem)")
    .eq("workspace_id", workspaceId)
    .order("ordem")
    .order("created_at")
  return (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo as TipoDeCampo,
    mostrarNaLista: c.mostrar_na_lista,
    opcoes: [...(c.campo_opcoes ?? [])].sort((a, b) => a.ordem - b.ordem).map((o) => ({ id: o.id, nome: o.nome })),
  }))
}

export type EntradasConferidas =
  | { erro: string }
  | { erros: Record<string, string> }
  | { gravar: Array<{ campoId: string; valor: ValorGuardado }>; apagar: string[] }

/** Confere cada entrada pelo tipo do campo. Com um erro, nada deve ser gravado. */
export function conferirEntradas(campos: CampoDaEmpresa[], valores: Record<string, EntradaDoCampo>): EntradasConferidas {
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
  return Object.keys(erros).length > 0 ? { erros } : { gravar, apagar }
}

/** Grava e apaga os valores já conferidos de um contato. */
export async function gravarValores(
  supabase: Cliente,
  workspaceId: string,
  contactId: string,
  { gravar, apagar }: { gravar: Array<{ campoId: string; valor: ValorGuardado }>; apagar: string[] }
): Promise<{ erro?: string }> {
  if (gravar.length > 0) {
    const { error } = await supabase.from("contato_campos").upsert(
      gravar.map(({ campoId, valor }) => ({
        contact_id: contactId,
        campo_id: campoId,
        workspace_id: workspaceId,
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
  return {}
}

/** Valores de vários contatos, só dos campos pedidos: contato → campo → valor. */
export async function valoresDosContatos(
  supabase: Cliente,
  contactIds: string[],
  campoIds: string[]
): Promise<Map<string, Record<string, ValorGuardado>>> {
  const mapa = new Map<string, Record<string, ValorGuardado>>()
  if (contactIds.length === 0 || campoIds.length === 0) return mapa
  const { data } = await supabase
    .from("contato_campos")
    .select("contact_id, campo_id, valor_texto, valor_numero, valor_data, valor_booleano, valor_opcoes")
    .in("contact_id", contactIds)
    .in("campo_id", campoIds)
  for (const l of data ?? []) {
    const doContato = mapa.get(l.contact_id) ?? {}
    doContato[l.campo_id] = valorDaLinha(l)
    mapa.set(l.contact_id, doContato)
  }
  return mapa
}
