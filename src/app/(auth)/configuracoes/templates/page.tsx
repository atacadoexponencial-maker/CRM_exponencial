import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarTemplates } from "./actions"
import { TemplatesClient } from "./templates-client"

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  const templates = await listarTemplates()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <TemplatesClient templates={templates} />
    </div>
  )
}
