import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarConexaoWhatsApp } from "./actions"
import { AcoesWhatsApp } from "./acoes-whatsapp"
import { WizardConexao } from "./wizard-conexao"
import { ListaNumeros } from "./canal-direto/lista-numeros"
import type { NumeroConectado } from "./canal-direto/cartao-numero"

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

  const conexao = await listarConexaoWhatsApp()

  // B2-01: a conexão da Meta entra na lista como um número entre outros. A
  // leitura continua a mesma de antes — uma conexão por workspace; passar a
  // listar de verdade é da B2-02.
  const daMeta: NumeroConectado | null = conexao
    ? {
        id: conexao.id,
        canal: "meta",
        phone_number: conexao.phoneNumber,
        display_name: conexao.displayName,
        state: conexao.status === "connected" ? "connected" : "disconnected",
        state_reason: null,
      }
    : null

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">WhatsApp</h1>

      <ListaNumeros daMeta={daMeta} />

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
