import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { CriarTimeDialog } from "./criar-time-dialog"
import { AcoesTime } from "./acoes-time"
import { createClient } from "@/integrations/supabase/server"
import { listarTimes, listarUsuariosDoWorkspace } from "./actions"

function Iniciais({ nome }: { nome: string }) {
  const partes = nome.trim().split(" ")
  const iniciais = partes.length >= 2
    ? partes[0][0] + partes[partes.length - 1][0]
    : partes[0][0]
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {iniciais.toUpperCase()}
    </span>
  )
}

export default async function TimesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  const [times, todosUsuarios] = await Promise.all([listarTimes(), listarUsuariosDoWorkspace()])

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Times</h1>
        <CriarTimeDialog />
      </div>

      <div className="flex flex-col gap-4">
        {times.map((time) => (
          <div key={time.id} className="rounded-lg border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="font-medium">{time.name}</span>
                <Badge
                  className={
                    time.isDefault
                      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                      : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                  }
                >
                  {time.isDefault ? "Padrão" : "Personalizado"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {time.membros.length} {time.membros.length === 1 ? "membro" : "membros"}
                </span>
              </div>

              <AcoesTime
                timeId={time.id}
                nomeAtual={time.name}
                isDefault={time.isDefault}
                membrosAtuaisIds={time.membros.map((m) => m.id)}
                todosUsuarios={todosUsuarios}
              />
            </div>

            <div className="px-4 py-3 flex flex-wrap gap-3">
              {time.membros.map((membro) => (
                <div key={membro.id} className="flex items-center gap-2 text-sm">
                  <Iniciais nome={membro.name} />
                  <span>{membro.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
