import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/integrations/supabase/server"
import { listarConexaoWhatsApp } from "./actions"
import { ConectarWhatsAppButton } from "./conectar-whatsapp-button"
import { ConectarTesteButton } from "./conectar-teste-button"
import { AcoesWhatsApp } from "./acoes-whatsapp"

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

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">WhatsApp</h1>
        {!conexao && (
          <div className="flex gap-2">
            <ConectarTesteButton />
            <ConectarWhatsAppButton />
          </div>
        )}
      </div>

      {conexao ? (
        <div className="rounded-lg border p-6 max-w-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Número conectado</p>
              <p className="text-lg font-semibold">{conexao.phoneNumber}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{conexao.displayName}</p>
            </div>
            {conexao.status === "connected" ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                Conectado
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700">
                Desconectado
              </Badge>
            )}
          </div>

          <AcoesWhatsApp conexaoId={conexao.id} status={conexao.status} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 max-w-md flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Nenhum número conectado</p>
        </div>
      )}
    </div>
  )
}
