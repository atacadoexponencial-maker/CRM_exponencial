import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { sessaoAtual } from "@/lib/sessao"
import { AdicionarUsuarioDialog } from "./adicionar-usuario-dialog"
import { AcoesUsuario } from "./acoes-usuario"
import { listarUsuarios } from "./actions"

export const metadata = { title: "Usuários" }

const papelVariant: Record<string, "default" | "outline" | "secondary"> = {
  admin: "default",
  gerente: "outline",
  atendente: "secondary",
}

const papelLabel: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  atendente: "Atendente",
}

export default async function UsuariosPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const [usuarios, { data: times }] = await Promise.all([
    listarUsuarios(),
    supabase
      .from("teams")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .order("name"),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Usuários</h1>
        <AdicionarUsuarioDialog times={times ?? []} />
      </div>

      <div className="overflow-x-auto border-t-2 border-t-foreground">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Papel</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Times</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{usuario.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{usuario.email || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={papelVariant[usuario.role] ?? "secondary"}>
                    {papelLabel[usuario.role] ?? usuario.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {usuario.times.join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {usuario.status === "active" ? (
                    <Badge className="bg-sucesso-fundo text-sucesso border-sucesso/30">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AcoesUsuario
                    usuario={usuario}
                    ehEuMesmo={usuario.id === user.id}
                    times={times ?? []}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
