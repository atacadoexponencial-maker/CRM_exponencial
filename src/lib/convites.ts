// B51: convites para criar conta. O link leva um código aleatório; o banco guarda só o
// SHA-256 dele (SUP-B51-02), então o link aparece uma vez, na hora de criar.
//
// **Só backend.** Usa `node:crypto`.

import { createHash, randomBytes } from "node:crypto"
import { createServiceClient } from "@/integrations/supabase/service"

const DIA_MS = 24 * 60 * 60 * 1000

/** Decisão do Luan em 29/10/2026 (PER-B51-05). */
export const PRAZO_MAXIMO_DIAS = 90
export const PRAZOS_PRONTOS_DIAS = [1, 7, 30] as const

export const AVISO_VALIDADE = `A validade precisa estar entre agora e ${PRAZO_MAXIMO_DIAS} dias.`

/** A mesma para vencido, usado, cancelado e inventado (SUP-B51-01). */
export const AVISO_CONVITE_INVALIDO = "Este convite não vale mais. Peça um novo a quem te convidou."

export type SituacaoConvite = "pendente" | "usado" | "vencido" | "cancelado"

export function novoCodigoDeConvite(): string {
  return randomBytes(32).toString("base64url")
}

export function hashDoCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex")
}

export function vencimentoEmDias(dias: number, agora: Date = new Date()): Date {
  return new Date(agora.getTime() + dias * DIA_MS)
}

/** Entre agora (exclusive) e 90 dias à frente (inclusive). */
export function validadeAceita(expiraEm: Date, agora: Date = new Date()): boolean {
  const t = expiraEm.getTime()
  return Number.isFinite(t) && t > agora.getTime() && t <= agora.getTime() + PRAZO_MAXIMO_DIAS * DIA_MS
}

export function situacaoDoConvite(
  convite: { usado_em: string | null; cancelado_em: string | null; expira_em: string },
  agora: Date = new Date()
): SituacaoConvite {
  if (convite.usado_em) return "usado"
  if (convite.cancelado_em) return "cancelado"
  if (new Date(convite.expira_em).getTime() <= agora.getTime()) return "vencido"
  return "pendente"
}

/** O convite do link, se ainda vale para cadastrar; `null` em qualquer outro caso. */
export async function conviteParaCadastro(codigo: unknown): Promise<{ email: string | null } | null> {
  if (typeof codigo !== "string" || !codigo) return null
  const { data } = await createServiceClient()
    .from("convites")
    .select("email")
    .eq("token_hash", hashDoCodigo(codigo))
    .is("usado_em", null)
    .is("cancelado_em", null)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle()
  return data ? { email: (data as { email: string | null }).email } : null
}
