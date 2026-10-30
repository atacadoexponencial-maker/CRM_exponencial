import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { CriarTimeDialog } from "./criar-time-dialog"
import { AcoesTime } from "./acoes-time"
import { sessaoAtual } from "@/lib/sessao"
import { listarTimes, listarUsuariosDoWorkspace } from "./actions"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { iniciaisDoNome } from "@/lib/iniciais"

export const metadata = { title: "Times" }

function Iniciais({ nome }: { nome: string }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {iniciaisDoNome(nome)}
    </span>
  )
}

export default async function TimesPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const [times, todosUsuarios] = await Promise.all([listarTimes(), listarUsuariosDoWorkspace()])

  return (
    <div className={CLASSE_DA_PAGINA}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Times</h1>
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
                      ? "bg-info-fundo text-info border-info/30"
                      : "bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
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
              {time.membros.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhum membro ainda.</span>
              )}
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
