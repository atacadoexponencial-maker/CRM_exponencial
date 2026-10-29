// B51-02: o cadastro só cria empresa com convite. Os testes que cadastram criam um
// convite no banco de teste por aqui e o apagam no fim.

import { createHash, randomBytes } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

const criados: string[] = []

/** Grava um convite pendente de 1 dia e devolve o código que vai no link. */
export async function conviteDeTeste(service: SupabaseClient, extra: Record<string, unknown> = {}): Promise<string> {
  const codigo = randomBytes(24).toString("base64url")
  const token_hash = createHash("sha256").update(codigo).digest("hex")
  const { error } = await service
    .from("convites")
    .insert({ token_hash, expira_em: new Date(Date.now() + 86_400_000).toISOString(), ...extra })
  if (error) throw new Error(`convite de teste: ${error.message}`)
  criados.push(token_hash)
  return codigo
}

export async function apagarConvitesDeTeste(service: SupabaseClient) {
  if (criados.length) await service.from("convites").delete().in("token_hash", criados.splice(0))
}
