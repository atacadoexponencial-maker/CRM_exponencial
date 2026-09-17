import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarConexaoWhatsApp, listarConexoesWhatsApp } from "./actions"
import { AcoesWhatsApp } from "./acoes-whatsapp"
import { WizardConexao } from "./wizard-conexao"
import { ListaNumeros } from "./canal-direto/lista-numeros"
import type { NumeroConectado } from "./canal-direto/cartao-numero"
import type { EstadoConexao } from "./canal-direto/estado-badge"

/**
 * Estados que o contrato do gateway prevê. A coluna `status` é texto livre e
 * guarda `connected` para as conexões da Meta; o que não for reconhecido é
 * tratado como desconectado — nunca como conectado.
 */
const ESTADOS: EstadoConexao[] = [
  "pairing",
  "connecting",
  "connected",
  "disconnected",
  "banned",
  "removed",
]

export default async function WhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  // B2-02: a lista vem do banco, com todos os números do workspace e o canal de
  // cada um. `listarConexaoWhatsApp` continua sendo lida abaixo porque o fluxo
  // da Meta depende dela.
  const [conexao, conexoes] = await Promise.all([
    listarConexaoWhatsApp(),
    listarConexoesWhatsApp(),
  ])

  const numeros: NumeroConectado[] = conexoes.map((c) => ({
    id: c.id,
    canal: c.canal,
    phone_number: c.phoneNumber,
    display_name: c.displayName,
    state: ESTADOS.includes(c.status as EstadoConexao)
      ? (c.status as EstadoConexao)
      : "disconnected",
    state_reason: (c.stateReason as NumeroConectado["state_reason"]) ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">WhatsApp</h1>

      <ListaNumeros numeros={numeros} />

      <div className="mt-10 border-t pt-8">
        <h2 className="text-base font-semibold mb-1">API Oficial da Meta</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Fluxo atual de conexão pela Meta, inalterado.
        </p>

        {conexao ? (
          <div className="rounded-lg border p-6 max-w-md">
            <AcoesWhatsApp conexaoId={conexao.id} status={conexao.status} />
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <WizardConexao />
          </div>
        )}
      </div>
    </div>
  )
}
