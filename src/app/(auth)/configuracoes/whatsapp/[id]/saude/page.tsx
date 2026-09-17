import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/integrations/supabase/server"
import { SaudeClient } from "./saude-client"

/**
 * Saúde de um número conectado (B4-01).
 *
 * Admin e Gerente alcançam; Atendente não. A checagem é a mesma de
 * `configuracoes/whatsapp/page.tsx`, com um papel a mais: gerente acompanha a
 * saúde do número, mas retomar o freio é de Admin (B4-04).
 */
export default async function SaudeDoNumeroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <Link
        href="/configuracoes/whatsapp"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Números conectados
      </Link>

      <h1 className="text-xl font-semibold mb-6">Saúde do número</h1>

      <SaudeClient />
    </div>
  )
}
