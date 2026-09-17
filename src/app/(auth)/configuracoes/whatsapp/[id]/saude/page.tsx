import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { createClient } from "@/integrations/supabase/server"
import { lerSaude } from "./actions"
import { SaudeClient } from "./saude-client"

/**
 * Saúde de um número conectado (B4-01, dados reais na B4-02).
 *
 * Admin e Gerente alcançam; Atendente não. Retomar o freio é só de Admin
 * (B4-04), e essa regra vive na action.
 *
 * A leitura acontece aqui, no servidor, a cada abertura: a issue não pede
 * tempo real nem cache.
 */
export default async function SaudeDoNumeroPage({
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

  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const resultado = await lerSaude(id)

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <Link
        href="/configuracoes/whatsapp"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Números conectados
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Saúde do número</h1>
        {perfil?.role === "admin" && (
          <Link
            href={`/configuracoes/whatsapp/${id}/ritmo`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Configurar ritmo de envio
          </Link>
        )}
      </div>

      {resultado.ok ? (
        <SaudeClient
          connectionId={id}
          saude={resultado.saude}
          podeRetomar={perfil?.role === "admin"}
        />
      ) : (
        /* Leitura que falhou não vira zero: sem números, com o motivo. */
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
          <TriangleAlert
            className="size-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-500"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">Não foi possível ler a saúde deste número</p>
            <p className="text-sm text-muted-foreground mt-0.5">{resultado.erro}</p>
          </div>
        </div>
      )}
    </div>
  )
}
