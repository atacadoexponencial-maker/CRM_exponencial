// B53-10: o evento "Dados editados" da timeline do contato. Quem editou e os
// nomes dos campos que mudaram, nunca os valores (SUP-B53-04). Roda só no
// servidor, chamado pelas actions que salvam o contato.

import type { createClient } from "@/integrations/supabase/server"

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Valor vazio, nulo ou ausente contam como o mesmo "sem valor". */
const igual = (a: unknown, b: unknown) => (a ?? "") === (b ?? "")

/** Os nomes (como a tela mostra) dos campos cujo valor mudou. */
export function camposQueMudaram(
  rotulos: Record<string, string>,
  antes: Record<string, unknown>,
  depois: Record<string, unknown>
): string[] {
  return Object.keys(rotulos).filter((k) => !igual(antes[k], depois[k])).map((k) => rotulos[k])
}

/**
 * Grava o evento com a sessão de quem salvou (o RLS só deixa gravar em nome
 * próprio, em contato que a pessoa vê). Sem campo mudado, não grava nada. Falhar
 * aqui não desfaz o que foi salvo.
 */
export async function registrarEdicao(
  supabase: Supabase,
  params: { workspaceId: string; contactId: string; autorId: string; campos: string[] }
): Promise<void> {
  if (params.campos.length === 0) return
  const campos = [...new Set(params.campos)].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const { error } = await supabase.from("contato_edicoes").insert({
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    autor_id: params.autorId,
    campos,
  })
  if (error) console.error("[B53-10] não gravou o evento Dados editados", error.message)
}
