import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/integrations/supabase/server"
import { RitmoClient } from "./ritmo-client"

/**
 * Ritmo de envio de um número (B5-01).
 *
 * **Só Admin.** Gerente acompanha a saúde do número, mas afrouxar o ritmo é
 * assumir risco de bloqueio — decisão de quem responde pelo número.
 */
export default async function RitmoDoNumeroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <Link
        href={`/configuracoes/whatsapp/${id}/saude`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Saúde do número
      </Link>

      <h1 className="text-xl font-semibold mb-1">Ritmo de envio</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Quanto mais devagar, menor o risco de o WhatsApp bloquear o número. O sistema não
        permite ultrapassar os limites mostrados ao lado de cada campo.
      </p>

      <RitmoClient />
    </div>
  )
}
