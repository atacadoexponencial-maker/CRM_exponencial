import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { createClient } from "@/integrations/supabase/server"
import { AdicionarUsuarioDialog } from "./adicionar-usuario-dialog"
import { listarUsuarios } from "./actions"

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  const [usuarios, { data: times }] = await Promise.all([
    listarUsuarios(),
    supabase
      .from("teams")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .order("name"),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Usuários</h1>
        <AdicionarUsuarioDialog times={times ?? []} />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Papel</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Times</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
                    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar papel</DropdownMenuItem>
                      <DropdownMenuItem>Gerenciar times</DropdownMenuItem>
                      {usuario.status === "active" ? (
                        <DropdownMenuItem variant="destructive">Desativar</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>Reativar</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
