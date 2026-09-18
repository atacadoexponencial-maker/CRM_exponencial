import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { motivoDoRecursoIndisponivel, recursosDoCanal } from "@/lib/whatsapp"
import type { CanalWhatsApp } from "@/lib/whatsapp"
import { listarTemplates } from "./actions"
import { TemplatesClient } from "./templates-client"

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  // B7-02: template de mensagem só existe na API Oficial. Quem tem apenas
  // número do canal direto não deve ver uma gestão que não se aplica a ele — e
  // quem tem os dois precisa saber que ela vale só para o número da Meta.
  const { data: conexoes } = await supabase
    .from("whatsapp_connections")
    .select("canal, phone_number")
    .eq("workspace_id", perfil.workspace_id)

  const canais = (conexoes ?? []).map((c) => (c.canal ?? "meta") as CanalWhatsApp)
  const comTemplates = canais.filter((canal) => recursosDoCanal(canal).templates)
  const semTemplates = canais.filter((canal) => !recursosDoCanal(canal).templates)

  const nenhumNumeroSuportaTemplates = canais.length > 0 && comTemplates.length === 0

  if (nenhumNumeroSuportaTemplates) {
    return (
      <div className="max-w-5xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-2">Templates de mensagem</h1>
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          {motivoDoRecursoIndisponivel("templates", semTemplates[0])}
        </p>
      </div>
    )
  }

  const templates = await listarTemplates()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      {semTemplates.length > 0 && comTemplates.length > 0 && (
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          Este workspace tem número no canal direto e número na API Oficial. Os templates
          abaixo valem <strong>apenas para o número da API Oficial</strong> — no canal direto
          qualquer texto pode ser enviado, sem template.
        </p>
      )}
      <TemplatesClient templates={templates} />
    </div>
  )
}
